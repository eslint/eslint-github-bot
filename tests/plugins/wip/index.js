"use strict";

const wip = require("../../../src/plugins/wip/index.js");
const nock = require("nock");
const { Application } = require("probot");

const DO_NOT_MERGE_LABEL = "do not merge";

/**
 * Mocks a response for the "get all commits for PR" API.
 * @param {Object} options Options for the request.
 * @param {number} options.number The pull request number.
 * @param {Array<Object>} options.commits The pull request commits to be returned.
 * @returns {Object} The Nock object for this request.
 * @private
 */
function mockGetAllCommitsForPR({ number, commits }) {
    return nock("https://api.github.com")
        .get(`/repos/test/repo-test/pulls/${number}/commits`)
        .reply(200, commits);
}

/**
 * Mocks a response for the "get combined status checks for commit" API.
 * @param {Object} options Options for the request.
 * @param {string} options.sha The SHA for the commit for which to retrieve statuses.
 * @param {Array<Object>} options.statuses The status response that should be used.
 * @returns {Object} The Nock object for this request.
 * @private
 */
function mockStatusChecksForCommit({ sha, statuses }) {
    return nock("https://api.github.com")
        .get(`/repos/test/repo-test/commits/${sha}/status`)
        .reply(200, {
            sha,
            statuses
        });
}

/**
 * Asserts that a WIP status check's state value is pending.
 * @param {string} _ ignored param
 * @param {string} payload payload sent to the API
 * @returns {undefined}
 * @private
 */
function assertPendingStatusForWip(_, payload) {
    const data = payload;

    expect(data.context).toBe("wip");
    expect(data.state).toBe("pending");
}

/**
 * Asserts that a WIP status check's state value is success.
 * @param {string} _ ignored param
 * @param {string} payload payload sent to the API
 * @returns {undefined}
 * @private
 */
function assertSuccessStatusForWip(_, payload) {
    const data = payload;

    expect(data.context).toBe("wip");
    expect(data.state).toBe("success");
}

describe("wip", () => {
    let bot = null;

    beforeAll(() => {
        bot = new Application({
            id: 110,
            githubToken: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        wip(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    ["opened", "reopened", "edited", "labeled", "unlabeled", "synchronize"].forEach(action => {
        describe(`pull request ${action}`, () => {
            test("create pending status if PR title starts with 'WIP:'", async () => {
                mockGetAllCommitsForPR({
                    number: 1,
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                });

                const createStatusOnPR = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertPendingStatusForWip);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action,
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "WIP: Some title",
                            labels: []
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(createStatusOnPR.isDone()).toBeTruthy();
            });

            test("create pending status if PR title contains '(WIP)'", async () => {
                mockGetAllCommitsForPR({
                    number: 1,
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                });

                const createStatusOnPR = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertPendingStatusForWip);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action,
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "Some title (WIP)",
                            labels: []
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(createStatusOnPR.isDone()).toBeTruthy();
            });

            test("create pending status if labels contain 'do not merge'", async () => {
                mockGetAllCommitsForPR({
                    number: 1,
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                });

                const createStatusOnPR = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertPendingStatusForWip);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action,
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "Some title",
                            labels: [{ name: DO_NOT_MERGE_LABEL }]
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(createStatusOnPR.isDone()).toBeTruthy();
            });

            test("does not create status check if PR is not WIP and no wip status exists", async () => {
                mockGetAllCommitsForPR({
                    number: 1,
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                });

                mockStatusChecksForCommit({
                    sha: "111",
                    statuses: []
                });

                const createStatusOnPR = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, {});

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action,
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "Some title",
                            labels: []
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(createStatusOnPR.isDone()).toBeFalsy();
            });

            test("creates success status check if PR is not WIP and wip status exists", async () => {
                mockGetAllCommitsForPR({
                    number: 1,
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                });

                mockStatusChecksForCommit({
                    sha: "111",
                    statuses: [{
                        state: "pending",
                        context: "wip"
                    }]
                });

                const createStatusOnPR = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertSuccessStatusForWip);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action,
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "Some title",
                            labels: []
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(createStatusOnPR.isDone()).toBeTruthy();
            });
        });
    });
});
