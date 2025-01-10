/**
 * @fileoverview Tests for the WIP plugin.
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { wip } = require("../../../src/plugins");
const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const DO_NOT_MERGE_LABEL = "do not merge";
const API_ROOT = "https://api.github.com";

// Add debugging for unmocked requests

/**
 * Mocks a response for the "get all commits for PR" API.
 * @param {Object} options Options for the request.
 * @param {number} options.number The pull request number.
 * @param {Array<Object>} options.commits The pull request commits to be returned.
 * @returns {void}
 * @private
 */
function mockGetAllCommitsForPR({ number, commits }) {

    const url = `${API_ROOT}/repos/test/repo-test/pulls/${number}/commits`;

    fetchMock.mockGlobal().get(
        url,
        {
            status: 200,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(commits)
        }
    );
}

/**
 * Mocks a response for the "get combined status checks for commit" API.
 * @param {Object} options Options for the request.
 * @param {string} options.sha The SHA for the commit for which to retrieve statuses.
 * @param {Array<Object>} options.statuses The status response that should be used.
 * @returns {void}
 * @private
 */
function mockStatusChecksForCommit({ sha, statuses }) {

    const url = `${API_ROOT}/repos/test/repo-test/commits/${sha}/status`;

    fetchMock.mockGlobal().get(
        url,
        {
            status: 200,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sha,
                statuses
            })
        }
    );

}

/**
 * Mocks a response for the "create status check on PR" API.
 * Sets the status to pending.
 * @returns {void}
 */
function mockPendingStatusForWip() {

    fetchMock.mockGlobal().post(
        {
            url: `${API_ROOT}/repos/test/repo-test/statuses/111`,
            body: {
                context: "wip",
                state: "pending"
            },
            matchPartialBody: true
        },
        {
            status: 200,
            body: JSON.stringify({})
        }
    );
}

/**
 * Mocks a response for the "create status check on PR" API.
 * Sets the status to success.
 * @returns {void}
 */
function mockSuccessStatusForWip() {
    fetchMock.mockGlobal().post(
        {
            url: `${API_ROOT}/repos/test/repo-test/statuses/111`,
            body: {
                context: "wip",
                state: "success"
            },
            matchPartialBody: true
        },
        {
            status: 200,
            body: JSON.stringify({})
        }
    );
}

/**
 * Asserts that no status checks were created.
 * @returns {void}
 */
function assertNoStatusChecksCreated() {
    expect(fetchMock.callHistory.calls(`${API_ROOT}/repos/test/repo-test/statuses/111`)).toHaveLength(0);
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("wip", () => {
    let bot = null;

    beforeEach(() => {
        bot = new Probot({

            appId: 1,
            githubToken: "test",

            Octokit: ProbotOctokit.defaults(instanceOptions => ({
                ...instanceOptions,
                throttle: { enabled: false },
                retry: { enabled: false }
            }))
        });
        wip(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
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

                mockPendingStatusForWip();

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

                mockPendingStatusForWip();

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

                mockPendingStatusForWip();

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

                assertNoStatusChecksCreated();

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

                mockSuccessStatusForWip();

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

            });
        });
    });
});
