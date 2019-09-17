"use strict";

const { commitMessage } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest");

/**
 * Mocks a given commit on a PR with the specified message
 * @param {string} message The commit message
 * @returns {void}
 */
function mockSingleCommitWithMessage(message) {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/commits")
        .reply(200, [
            {
                commit: {
                    message
                },
                sha: "first-sha"
            }
        ]);
}

/**
 * Mocks multiple commits on a PR
 * @returns {void}
 */
function mockMultipleCommits() {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/commits")
        .reply(200, [
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
                number: 1
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
        bot = new probot.Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        commitMessage(bot);
    });

    beforeEach(() => {
        nock.disableNetConnect();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    ["opened", "reopened", "synchronize", "edited"].forEach(action => {
        describe(`pull request ${action}`, () => {
            test("Posts failure status if commit message is not correct", async() => {
                mockSingleCommitWithMessage("non standard commit message");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if commit message is correct", async() => {
                mockSingleCommitWithMessage("New: standard commit message");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if commit message beginning with `Revert`", async() => {
                mockSingleCommitWithMessage("Revert \"Chore: add test for commit tag Revert\"");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if the commit message is longer than 72 chars", async() => {
                mockSingleCommitWithMessage("New: standard commit message very very very long message and its beond 72");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if the commit message is longer than 72 chars after the newline", async() => {
                mockSingleCommitWithMessage(
                    `New: foo\n\n${"A".repeat(72)}`
                );

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if there are multiple commit messages and the title is valid", async() => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", req => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "Update: foo" } });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is invalid", async() => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", req => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "foo" } });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is too long", async() => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", req => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: `Update: ${"A".repeat(72)}` } });
                expect(nockScope.isDone()).toBeTruthy();
            });

            // Tests for malformed issue references
            [
                "#1",
                "fixes #1",
                "(fix #1)",
                "(ref #1)",
                "(closes #1)",
                "(fixes #1, #2)",

                // Unexpected issue number with valid suffix should fail
                "#1 (fixes #1)",

                // Invalid repo names
                "(fixes eslint#1)",
                "(refs eslint/nested/group#1)"
            ].forEach(suffix => {
                test(`Posts failure status if the commit message references issue improperly: ${suffix}`, async() => {
                    mockSingleCommitWithMessage(
                        `New: foo ${suffix}`
                    );

                    const nockScope = nock("https://api.github.com")
                        .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "failure")
                        .reply(201);

                    await emitBotEvent(bot, { action });
                    expect(nockScope.isDone()).toBeTruthy();
                });

                test(`Posts failure status if multiple commits and PR title references issue improperly: ${suffix}`, async() => {
                    mockMultipleCommits();

                    const nockScope = nock("https://api.github.com")
                        .post("/repos/test/repo-test/statuses/second-sha", req => req.state === "failure")
                        .reply(201);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: `New: foo ${suffix}` } });
                    expect(nockScope.isDone()).toBeTruthy();
                });
            });

            // Tests for correct issue references
            [
                "(fixes #1)",
                "(refs #1)",
                "(fixes #1, fixes #2)",
                "(fixes #1, refs #2, fixes #3)",
                "(fixes #1234)\n\nMore info here",
                "(fixes eslint/rfcs#1)",
                "(refs eslint/rfcs#1)"
            ].forEach(suffix => {
                test(`Posts success status if the commit message references issue correctly: ${suffix}`, async() => {
                    mockSingleCommitWithMessage(
                        `New: foo ${suffix}`
                    );

                    const nockScope = nock("https://api.github.com")
                        .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "success")
                        .reply(201);

                    await emitBotEvent(bot, { action });
                    expect(nockScope.isDone()).toBeTruthy();
                });

                test(`Posts success status if multiple commits and PR title references issue correctly: ${suffix}`, async() => {
                    mockMultipleCommits();

                    const nockScope = nock("https://api.github.com")
                        .post("/repos/test/repo-test/statuses/second-sha", req => req.state === "success")
                        .reply(201);

                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: `New: foo ${suffix.replace(/\n[\s\S]*/, "")}` } });
                    expect(nockScope.isDone()).toBeTruthy();
                });
            });

            test("Does not post a status if the repository is excluded", async() => {
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
                "Revert \"New: do something (#123)\"",
                "Revert \"Very long commit message with lots and lots of characters (more than 72!)\"",
                "Revert \"blah\"\n\nbaz"
            ].forEach(message => {
                test("Posts a success status", async() => {
                    const nockScope = nock("https://api.github.com")
                        .post("/repos/test/repo-test/statuses/first-sha", req => req.state === "success")
                        .reply(201);

                    mockSingleCommitWithMessage(message);
                    await emitBotEvent(bot, { action, pull_request: { number: 1, title: message.replace(/\n[\s\S]*/, "") } });
                    expect(nockScope.isDone()).toBe(true);
                });
            });
        });
    });
});
