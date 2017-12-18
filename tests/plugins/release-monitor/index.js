"use strict";

const { releaseMonitor } = require("../../../src/plugins/index");
const nock = require("nock");
const { createRobot } = require("probot");
const GitHubApi = require("github");

const POST_RELEASE_LABEL = "post-release";
const RELEASE_LABEL = "release";

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
 * @param {Array<Object>} mockData - data for PR
 * @returns {undefined}
 * @private
 */
function mockAllOpenPrWithCommits(mockData = []) {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls?state=open")
        .reply(200, mockData);

    mockData.forEach(({ number, commits }) => {
        nock("https://api.github.com")
            .persist()
            .get(`/repos/test/repo-test/pulls/${number}/commits`)
            .reply(200, commits);
    });
}

/**
 * Asserts that the state value is pending
 * @param {string} _ - ignored param
 * @param {string} payload - payload sent ot the API
 * @returns {undefined}
 * @private
 */
function assertPendingStatus(_, payload) {
    expect(JSON.parse(payload).state).toBe("pending");
}

/**
 * Asserts that the state value is success
 * @param {string} _ - ignored param
 * @param {string} payload - payload sent ot the API
 * @returns {undefined}
 * @private
 */
function assertSuccessStatus(_, payload) {
    expect(JSON.parse(payload).state).toBe("success");
}

describe("release-monitor", () => {
    let bot = null;

    beforeAll(() => {
        bot = createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        releaseMonitor(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue labeled", () => {
        test("with post release then add pending on nom semver minor", async() => {
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
                }
            ]);
            const newPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/111")
                .reply(200, assertPendingStatus);

            const fixPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, {});

            const updatePrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/333")
                .reply(200, {});

            const breakingPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/444")
                .reply(200, {});

            const randomPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/555")
                .reply(200, {});

            const docPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/666")
                .reply(200, {});

            await bot.receive({
                event: "issues",
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

            expect(newPrStatus.isDone()).toBeTruthy();
            expect(fixPrStatus.isDone()).toBeFalsy();
            expect(docPrStatus.isDone()).toBeFalsy();
            expect(updatePrStatus.isDone()).toBeTruthy();
            expect(breakingPrStatus.isDone()).toBeTruthy();
            expect(randomPrStatus.isDone()).toBeTruthy();
        });

        test("with no post release label nothing happens", async() => {
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
            const pr1Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/111")
                .reply(200, {});

            const pr2Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, {});

            await bot.receive({
                event: "issues",
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

            expect(pr1Status.isDone()).toBeFalsy();
            expect(pr2Status.isDone()).toBeFalsy();
        });

        test("with post release label on non release issue, nothing happens", async() => {
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
            const pr1Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/111")
                .reply(200, {});

            const pr2Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, {});

            await bot.receive({
                event: "issues",
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

            expect(pr1Status.isDone()).toBeFalsy();
            expect(pr2Status.isDone()).toBeFalsy();
        });
    });

    describe("issue closed", () => {
        test("is release then update status on all PR", async() => {
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
                }
            ]);
            const newPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/111")
                .reply(200, assertSuccessStatus);

            const fixPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, assertSuccessStatus);

            const updatePrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/333")
                .reply(200, assertSuccessStatus);

            const breakingPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/444")
                .reply(200, assertSuccessStatus);

            const randomPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/555")
                .reply(200, assertSuccessStatus);

            const docPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/666")
                .reply(200, assertSuccessStatus);

            await bot.receive({
                event: "issues",
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
                        number: 5
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(newPrStatus.isDone()).toBeTruthy();
            expect(fixPrStatus.isDone()).toBeTruthy();
            expect(docPrStatus.isDone()).toBeTruthy();
            expect(updatePrStatus.isDone()).toBeTruthy();
            expect(breakingPrStatus.isDone()).toBeTruthy();
            expect(randomPrStatus.isDone()).toBeTruthy();
        });

        test("is not a release issue", async() => {
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
            const pr1Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/111")
                .reply(200, {});

            const pr2Status = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, {});

            await bot.receive({
                event: "issues",
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
                        number: 5
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(pr1Status.isDone()).toBeFalsy();
            expect(pr2Status.isDone()).toBeFalsy();
        });
    });

    ["opened", "reopened", "synchronize", "edited"].forEach(action => {
        describe(`pull request ${action}`, () => {
            test("put pending for non semver patch PR under post release phase", async() => {
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

                nock("https://api.github.com")
                    .get("/repos/test/repo-test/issues?labels=release%2Cpost-release")
                    .reply(200, [{}]);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertPendingStatus);

                await bot.receive({
                    event: "pull_request",
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

                expect(newPrStatus.isDone()).toBeTruthy();
            });

            test("put success for non semver patch PR under post release phase", async() => {
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

                nock("https://api.github.com")
                    .get("/repos/test/repo-test/issues?labels=release%2Cpost-release")
                    .reply(200, [{}]);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertSuccessStatus);

                await bot.receive({
                    event: "pull_request",
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

                expect(newPrStatus.isDone()).toBeTruthy();
            });

            test("put success for all PR under non post release phase", async() => {
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

                nock("https://api.github.com")
                    .get("/repos/test/repo-test/issues?labels=release%2Cpost-release")
                    .reply(200, []);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertSuccessStatus);

                await bot.receive({
                    event: "pull_request",
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

                expect(newPrStatus.isDone()).toBeTruthy();
            });
        });
    });
});
