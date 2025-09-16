"use strict";

const { commitMessage } = require("../../../src/plugins/index");
const { TAG_LABELS } = require("../../../src/plugins/commit-message/util");
const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");

const API_ROOT = "https://api.github.com";

/**
 * Mocks a given commit on a PR with the specified message
 * @param {string} message The commit message
 * @returns {void}
 */
// function mockSingleCommitWithMessage(message) {
//     nock("https://api.github.com")
//         .get("/repos/test/repo-test/pulls/1/commits")
//         .reply(200, [
//             {
//                 commit: {
//                     message
//                 },
//                 sha: "first-sha"
//             }
//         ]);
// }

/**
 * Mocks a labels request.
 * @param {Array<string>} labels The labels to check for on the PR.
 * @returns {Nock} The mock for the labels request.
 */
// function mockLabels(labels) {
//     return nock("https://api.github.com")
//         .post("/repos/test/repo-test/issues/1/labels", body => {
//             expect(body).toEqual({ labels });
//             return true;
//         })
//         .reply(200);
// }

/**
 * Mocks multiple commits on a PR
 * @returns {void}
 */
// function mockMultipleCommits() {
//     nock("https://api.github.com")
//         .get("/repos/test/repo-test/pulls/1/commits")
//         .reply(200, [
//             {
//                 commit: {
//                     message: "foo"
//                 },
//                 sha: "first-sha"
//             },
//             {
//                 commit: {
//                     message: "bar"
//                 },
//                 sha: "second-sha"
//             }
//         ]);
// }

/**
 * Mocks a given commit on a PR with the specified message using fetchMock
 * @param {string} message The commit message
 * @returns {void}
 */
function mockSingleCommitWithMessage(message) {
    fetchMock.mockGlobal().get(`${API_ROOT}/repos/test/repo-test/pulls/1/commits`, [
        {
            commit: {
                message
            },
            sha: "first-sha"
        }
    ]);
}

/**
 * Mocks a labels request using fetchMock.
 * @param {Array<string>} labels The labels to check for on the PR.
 * @returns {void}
 */
function mockLabels(labels) {
    fetchMock.mockGlobal().post({
        url: `${API_ROOT}/repos/test/repo-test/issues/1/labels`,
        body: { labels },
        matchPartialBody: true
    }, 200);
}

/**
 * Mocks multiple commits on a PR using fetchMock
 * @returns {void}
 */
function mockMultipleCommits() {
    fetchMock.mockGlobal().get(`${API_ROOT}/repos/test/repo-test/pulls/1/commits`, [
        {
            commit: {
                message: "foo"
            },
            sha: "first-sha"
        },
        {
            commit: {
                message: "bar"
            },
            sha: "second-sha"
        }
    ]);
}

/**
 * Emits a bot event for this plugin
 * @param {probot.Robot} bot A probot instance
 * @param {Object} payload The payload from the webhook
 * @returns {Promise<void>} A Promise that fulfills when the action is complete
 */
function emitBotEvent(bot, payload = {}) {
    return bot.receive({
        name: "pull_request",
        payload: Object.assign({
            installation: {
                id: 1
            },
            pull_request: {
                number: 1,
                user: {
                    login: "user-a"
                }
            },
            sender: {
                login: "user-a"
            },
            repository: {
                name: "repo-test",
                owner: {
                    login: "test"
                }
            }
        }, payload)
    });
}

describe("commit-message", () => {
    let bot = null;

    beforeAll(() => {
        bot = new Probot({

            appId: 1,
            githubToken: "test",

            Octokit: ProbotOctokit.defaults(instanceOptions => ({
                ...instanceOptions,
                throttle: { enabled: false },
                retry: { enabled: false }
            }))
        });
        commitMessage(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
    });

    ["opened", "reopened", "synchronize", "edited"].forEach(action => {
        describe(`pull request ${action}`, () => {
            test("Posts failure status if PR title is not correct", async () => {
                mockSingleCommitWithMessage("non standard commit message");

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "failure"
                    },
                    matchPartialBody: true
                }, 201);

                fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                    if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                        return false;
                    }
                    const body = JSON.parse(opts.body).body;

                    expect(body).toMatchSnapshot();

                    return true;
                }, 200);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "non standard commit message",
                        user: { login: "user-a" }
                    }
                });

                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
            });

            test("Posts failure status if PR title is not correct even when the first commit message is correct", async () => {
                mockSingleCommitWithMessage("feat: standard commit message");

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "failure"
                    },
                    matchPartialBody: true
                }, 201);

                fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                    if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                        return false;
                    }
                    const body = JSON.parse(opts.body).body;

                    expect(body).toMatchSnapshot();

                    return true;
                }, 200);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "non standard commit message",
                        user: { login: "user-a" }
                    }
                });
            });

            test("Posts success status if PR title is correct", async () => {
                mockSingleCommitWithMessage("feat: standard commit message");
                mockLabels(["feature"]);

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "success"
                    },
                    matchPartialBody: true
                }, 201);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "feat: standard commit message",
                        user: { login: "user-a" }
                    }
                });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/labels`)).toBeTruthy();
            });

            test("Posts success status if PR title is correct even when the first commit message is not correct", async () => {
                mockSingleCommitWithMessage("non standard commit message");
                mockLabels(["feature"]);

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "success"
                    },
                    matchPartialBody: true
                }, 201);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "feat: standard commit message",
                        user: { login: "user-a" }
                    }
                });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/labels`)).toBeTruthy();
            });

            test("Posts success status if PR title begins with `Revert`", async () => {
                mockSingleCommitWithMessage("Revert \"chore: add test for commit tag Revert\"");

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "success"
                    },
                    matchPartialBody: true
                }, 201);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "Revert \"chore: add test for commit tag Revert\"",
                        user: { login: "user-a" }
                    }
                });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
            });

            test("Posts failure status if the PR title is longer than 72 chars and don't set labels", async () => {
                mockSingleCommitWithMessage("feat!: standard commit message very very very long message and its beyond 72");

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                    body: {
                        state: "failure"
                    },
                    matchPartialBody: true
                }, 201);

                fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                    if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                        return false;
                    }
                    const body = JSON.parse(opts.body).body;

                    expect(body).toMatchSnapshot();

                    return true;
                }, 200);

                await emitBotEvent(bot, {
                    action,
                    pull_request: {
                        number: 1,
                        title: "feat!: standard commit message very very very long message and its beyond 72",
                        user: { login: "user-a" }
                    }
                });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/labels`)).toBeFalsy();
            });

            test("Posts success status if there are multiple commit messages and the title is valid", async () => {
                mockMultipleCommits();

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/second-sha`,
                    body: {
                        state: "success"
                    },
                    matchPartialBody: true
                }, 201);

                mockLabels(["feature"]);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "feat: foo" } });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/second-sha`)).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is invalid", async () => {
                mockMultipleCommits();

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/second-sha`,
                    body: {
                        state: "failure"
                    },
                    matchPartialBody: true
                }, 201);

                fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                    if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                        return false;
                    }
                    const body = JSON.parse(opts.body).body;

                    expect(body).toMatchSnapshot();

                    return true;
                }, 200);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "foo", user: { login: "user-a" } } });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/second-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is too long", async () => {
                mockMultipleCommits();

                fetchMock.mockGlobal().post({
                    url: `${API_ROOT}/repos/test/repo-test/statuses/second-sha`,
                    body: {
                        state: "failure"
                    },
                    matchPartialBody: true
                }, 201);

                fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                    if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                        return false;
                    }
                    const body = JSON.parse(opts.body).body;

                    expect(body).toMatchSnapshot();

                    return true;
                }, 200);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: `feat: ${"A".repeat(72)}`, user: { login: "user-a" } } });
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/second-sha`)).toBeTruthy();
                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
            });

            // Tests for invalid or malformed tag prefixes
            [
                ": ",
                "Foo: ",
                "Revert: ",
                "Neww: ",
                "nNew: ",
                " New: ",
                "new: ",
                "New:",
                "New : ",
                "New ",
                "feat"
            ].forEach(prefix => {
                const message = `${prefix}foo`;

                test(`Posts failure status if the PR title has invalid tag prefix: "${prefix}"`, async () => {
                    mockSingleCommitWithMessage(message);

                    fetchMock.mockGlobal().post({
                        url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                        body: {
                            state: "failure"
                        },
                        matchPartialBody: true
                    }, 201);

                    fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                        if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                            return false;
                        }
                        const body = JSON.parse(opts.body).body;

                        expect(body).toMatchSnapshot();

                        return true;
                    }, 200);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message, user: { login: "user-a" } } });
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
                });

                test(`Posts failure status if PR with multiple commits has invalid tag prefix in the title: "${prefix}"`, async () => {
                    mockMultipleCommits();

                    fetchMock.mockGlobal().post({
                        url: `${API_ROOT}/repos/test/repo-test/statuses/second-sha`,
                        body: {
                            state: "failure"
                        },
                        matchPartialBody: true
                    }, 201);

                    fetchMock.mockGlobal().post(({ args: [url, opts] }) => {
                        if (url !== `${API_ROOT}/repos/test/repo-test/issues/1/comments`) {
                            return false;
                        }
                        const body = JSON.parse(opts.body).body;

                        expect(body).toMatchSnapshot();

                        return true;
                    }, 200);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message, user: { login: "user-a" } } });
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/second-sha`)).toBeTruthy();
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
                });
            });

            // Tests for valid tag prefixes
            TAG_LABELS.forEach((labels, prefix) => {
                const message = `${prefix} foo`;

                test(`Posts success status if the PR title has valid tag prefix: "${prefix}"`, async () => {
                    mockSingleCommitWithMessage(message);

                    mockLabels(labels);
                    fetchMock.mockGlobal().post({
                        url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                        body: {
                            state: "success"
                        },
                        matchPartialBody: true
                    }, 201);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message, user: { login: "user-a" } } });
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/labels`)).toBeTruthy();
                });

                test(`Posts success status if PR with multiple commits has valid tag prefix in the title: "${prefix}"`, async () => {
                    mockMultipleCommits();

                    fetchMock.mockGlobal().post({
                        url: `${API_ROOT}/repos/test/repo-test/statuses/second-sha`,
                        body: {
                            state: "success"
                        },
                        matchPartialBody: true
                    }, 201);

                    mockLabels(labels);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message } });
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/second-sha`)).toBeTruthy();
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/labels`)).toBeTruthy();
                });
            });

            test("Does not post a status if the repository is excluded", async () => {
                await emitBotEvent(bot, {
                    action: "opened",
                    repository: {
                        name: "tsc-meetings",
                        owner: {
                            login: "test"
                        }
                    }
                });
            });

            // Tests for commit messages starting with 'Revert "'
            [
                "Revert \"feat: do something (#123)\"",
                "Revert \"Very long commit message with lots and lots of characters (more than 72!)\"",
                "Revert \"blah\"\n\nbaz"
            ].forEach(message => {
                test("Posts a success status", async () => {
                    mockSingleCommitWithMessage(message);

                    fetchMock.mockGlobal().post({
                        url: `${API_ROOT}/repos/test/repo-test/statuses/first-sha`,
                        body: {
                            state: "success"
                        },
                        matchPartialBody: true
                    }, 201);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message.replace(/\n[\s\S]*/u, "") } });
                    expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/first-sha`)).toBeTruthy();
                });
            });
        });
    });
});
