/**
 * @fileoverview Tests for release-monitor plugin
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { releaseMonitor } = require("../../../src/plugins/index");
const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const POST_RELEASE_LABEL = "patch release pending";
const RELEASE_LABEL = "release";
const API_ROOT = "https://api.github.com";

/**
 * Creates mock PR with commits
 * @example
 * mockData = [
 *      {
 *          number: 1,
 *          title: "hi",
 *          commits: [
 *              {
 *                  sha: "111",
 *                  commit: {
 *                      message: "asf"
 *                  }
 *              }
 *          ]
 *      }
 * ];
 *
 * @param {Array<Object>} mockData data for PR
 * @returns {void}
 * @private
 */
function mockAllOpenPrWithCommits(mockData = []) {
    mockData.forEach((pullRequest, index) => {
        const apiPath = `/repos/test/repo-test/pulls?state=open${index === 0 ? "" : `&page=${index + 1}`}`;
        const linkHeaders = [];

        if (index !== mockData.length - 1) {
            linkHeaders.push(`<${API_ROOT}/repos/test/repo-test/pulls?state=open&page=${index + 2}>; rel="next"`);
            linkHeaders.push(`<${API_ROOT}/repos/test/repo-test/pulls?state=open&page=${mockData.length}>; rel="last"`);
        }

        if (index !== 0) {
            linkHeaders.push(`<${API_ROOT}/repos/test/repo-test/pulls?state=open&page=${index}>; rel="prev"`);
            linkHeaders.push(`<${API_ROOT}/repos/test/repo-test/pulls?state=open&page=1>; rel="first"`);
        }

        fetchMock.mockGlobal().get(`${API_ROOT}${apiPath}`, {
            status: 200,
            body: [pullRequest],
            headers: linkHeaders.length ? { Link: linkHeaders.join(", ") } : {}
        });

        fetchMock.mockGlobal().get(
            `${API_ROOT}/repos/test/repo-test/pulls/${pullRequest.number}/commits`,
            pullRequest.commits
        );
    });
}

/**
 * Mocks a pending status for a given status ID.
 * @param {string} statusId The ID of the status to mock.
 * @returns {void}
 */
function mockStatusPending(statusId) {
    fetchMock.mockGlobal().post({
        url: `${API_ROOT}/repos/test/repo-test/statuses/${statusId}`,
        body: {
            state: "pending",
            description: "A patch release is pending",
            target_url: "https://github.com/test/repo-test/issues/1"
        },
        matchPartialBody: true
    }, 200);
}

/**
 * Mocks a successful status update for a given status ID with a patch release message.
 * @param {string} statusId The ID of the status to update.
 * @returns {void}
 */
function mockStatusSuccessWithPatch(statusId) {
    fetchMock.mockGlobal().post({
        url: `${API_ROOT}/repos/test/repo-test/statuses/${statusId}`,
        body: {
            state: "success",
            description: "This change is semver-patch"
        },
        matchPartialBody: true
    }, 200);
}

/**
 * Mocks a successful status update for a given status ID with no patch release message.
 * @param {string} statusId The ID of the status to update.
 * @returns {void}
 */
function mockStatusSuccessNoPending(statusId) {
    fetchMock.mockGlobal().post({
        url: `${API_ROOT}/repos/test/repo-test/statuses/${statusId}`,
        body: {
            state: "success",
            description: "No patch release is pending"
        },
        matchPartialBody: true
    }, 200);
}

describe("release-monitor", () => {
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
        releaseMonitor(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
    });

    describe("issue labeled", () => {
        test("in post release phase then add appropriate status check to all PRs", async () => {
            mockAllOpenPrWithCommits([
                {
                    number: 1,
                    title: "New: add 1",
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                },
                {
                    number: 2,
                    title: "Fix: fix 2",
                    commits: [
                        {
                            sha: "222",
                            commit: {
                                message: "Fix: fix 2"
                            }
                        }
                    ]
                },
                {
                    number: 3,
                    title: "Update: add 3",
                    commits: [
                        {
                            sha: "333",
                            commit: {
                                message: "Update: add 3"
                            }
                        }
                    ]
                },
                {
                    number: 4,
                    title: "Breaking: add 4",
                    commits: [
                        {
                            sha: "444",
                            commit: {
                                message: "Breaking: add 4"
                            }
                        }
                    ]
                },
                {
                    number: 5,
                    title: "random message",
                    commits: [
                        {
                            sha: "555",
                            commit: {
                                message: "random message"
                            }
                        }
                    ]
                },
                {
                    number: 6,
                    title: "Docs: message",
                    commits: [
                        {
                            sha: "666",
                            commit: {
                                message: "Docs: message"
                            }
                        }
                    ]
                },
                {
                    number: 7,
                    title: "Upgrade: message",
                    commits: [
                        {
                            sha: "777",
                            commit: {
                                message: "Upgrade: message"
                            }
                        }
                    ]
                }
            ]);

            // Mock status API calls with fetchMock
            mockStatusPending(111);
            mockStatusSuccessWithPatch(222);
            mockStatusPending(333);
            mockStatusPending(444);
            mockStatusPending(555);
            mockStatusSuccessWithPatch(666);
            mockStatusSuccessWithPatch(777);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "labeled",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: RELEASE_LABEL
                            },
                            {
                                name: POST_RELEASE_LABEL
                            }
                        ],
                        number: 1,
                        html_url: "https://github.com/test/repo-test/issues/1"
                    },
                    label: {
                        name: POST_RELEASE_LABEL
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/111`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/222`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/333`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/444`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/555`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/666`)).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/777`)).toBeTruthy();
        }, 10000);

        test("with no post release label nothing happens", async () => {
            mockAllOpenPrWithCommits([
                {
                    number: 1,
                    title: "New: add 1",
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                },
                {
                    number: 2,
                    title: "Fix: fix 2",
                    commits: [
                        {
                            sha: "222",
                            commit: {
                                message: "Fix: fix 2"
                            }
                        }
                    ]
                }
            ]);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "labeled",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: RELEASE_LABEL
                            }
                        ],
                        number: 5
                    },
                    label: {
                        name: "something"
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called()).toBe(false);
        });

        test("with post release label on non release issue, nothing happens", async () => {
            mockAllOpenPrWithCommits([
                {
                    number: 1,
                    title: "New: add 1",
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                },
                {
                    number: 2,
                    title: "Fix: fix 2",
                    commits: [
                        {
                            sha: "222",
                            commit: {
                                message: "Fix: fix 2"
                            }
                        }
                    ]
                }
            ]);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "labeled",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: POST_RELEASE_LABEL
                            },
                            {
                                name: "bug"
                            }
                        ],
                        number: 5
                    },
                    label: {
                        name: POST_RELEASE_LABEL
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called()).toBe(false);
        });
    });

    describe("issue closed", () => {
        test("is release then update status on all PR", async () => {
            mockAllOpenPrWithCommits([
                {
                    number: 1,
                    title: "New: add 1",
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                },
                {
                    number: 2,
                    title: "Fix: fix 2",
                    commits: [
                        {
                            sha: "222",
                            commit: {
                                message: "Fix: fix 2"
                            }
                        }
                    ]
                },
                {
                    number: 3,
                    title: "Update: add 3",
                    commits: [
                        {
                            sha: "333",
                            commit: {
                                message: "Update: add 3"
                            }
                        }
                    ]
                },
                {
                    number: 4,
                    title: "Breaking: add 4",
                    commits: [
                        {
                            sha: "444",
                            commit: {
                                message: "Breaking: add 4"
                            }
                        }
                    ]
                },
                {
                    number: 5,
                    title: "random message",
                    commits: [
                        {
                            sha: "555",
                            commit: {
                                message: "random message"
                            }
                        }
                    ]
                },
                {
                    number: 6,
                    title: "Docs: message",
                    commits: [
                        {
                            sha: "666",
                            commit: {
                                message: "Docs: message"
                            }
                        }
                    ]
                },
                {
                    number: 7,
                    title: "Upgrade: message",
                    commits: [
                        {
                            sha: "777",
                            commit: {
                                message: "Upgrade: message"
                            }
                        }
                    ]
                }
            ]);

            mockStatusSuccessNoPending(111);
            mockStatusSuccessNoPending(222);
            mockStatusSuccessNoPending(333);
            mockStatusSuccessNoPending(444);
            mockStatusSuccessNoPending(555);
            mockStatusSuccessNoPending(666);
            mockStatusSuccessNoPending(777);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "closed",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: RELEASE_LABEL
                            }
                        ],
                        number: 5,
                        html_url: "https://github.com/test/repo-test/issues/1"
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called()).toBe(true);
        }, 10000);

        test("is not a release issue", async () => {
            mockAllOpenPrWithCommits([
                {
                    number: 1,
                    title: "New: add 1",
                    commits: [
                        {
                            sha: "111",
                            commit: {
                                message: "New: add 1"
                            }
                        }
                    ]
                },
                {
                    number: 2,
                    title: "Fix: fix 2",
                    commits: [
                        {
                            sha: "222",
                            commit: {
                                message: "Fix: fix 2"
                            }
                        }
                    ]
                }
            ]);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "closed",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: "test"
                            }
                        ],
                        number: 5,
                        html_url: "https://github.com/test/repo-test/issues/5"
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called()).toBe(false);
        });
    });

    ["opened", "reopened", "synchronize", "edited"].forEach(action => {
        describe(`pull request ${action}`, () => {
            test("put pending for non semver patch PR under post release phase", async () => {
                mockAllOpenPrWithCommits([
                    {
                        number: 1,
                        title: "New: add 1",
                        commits: [
                            {
                                sha: "111old",
                                commit: {
                                    message: "New: add 1"
                                }
                            },
                            {
                                sha: "111",
                                commit: {
                                    message: "New: add 1"
                                }
                            }
                        ]
                    }
                ]);

                fetchMock.mockGlobal().get(
                    `${API_ROOT}/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`,
                    [
                        {
                            html_url: "https://github.com/test/repo-test/issues/1"
                        }
                    ]
                );

                mockStatusPending(111);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action: "opened",
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "New: add 1"
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/111`)).toBe(true);
            });

            test("put success for semver patch PR under post release phase", async () => {
                mockAllOpenPrWithCommits([
                    {
                        number: 1,
                        title: "Fix: add 1",
                        commits: [
                            {
                                sha: "111",
                                commit: {
                                    message: "Fix: add 1"
                                }
                            }
                        ]
                    }
                ]);

                fetchMock.mockGlobal().get(
                    `${API_ROOT}/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`,
                    [
                        {
                            html_url: "https://github.com/test/repo-test/issues/1"
                        }
                    ]
                );

                mockStatusSuccessWithPatch(111);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action: "opened",
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "Fix: add 1"
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/111`)).toBe(true);
            });

            test("put success for all PR under outside release phase", async () => {
                mockAllOpenPrWithCommits([
                    {
                        number: 1,
                        title: "New: add 1",
                        commits: [
                            {
                                sha: "111",
                                commit: {
                                    message: "New: add 1"
                                }
                            }
                        ]
                    }
                ]);

                fetchMock.mockGlobal().get(
                    `${API_ROOT}/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`,
                    []
                );

                mockStatusSuccessNoPending(111);

                await bot.receive({
                    name: "pull_request",
                    payload: {
                        action: "opened",
                        installation: {
                            id: 1
                        },
                        pull_request: {
                            number: 1,
                            title: "New: add 1"
                        },
                        repository: {
                            name: "repo-test",
                            owner: {
                                login: "test"
                            }
                        }
                    }
                });

                expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/statuses/111`)).toBe(true);
            });
        });
    });
});
