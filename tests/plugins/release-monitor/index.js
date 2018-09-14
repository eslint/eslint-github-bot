"use strict";

const { releaseMonitor } = require("../../../src/plugins/index");
const nock = require("nock");
const { Application } = require("probot");
const GitHubApi = require("@octokit/rest");

const POST_RELEASE_LABEL = "patch release pending";
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
    mockData.forEach((pullRequest, index) => {
        const linkHeaders = [];

        if (index !== mockData.length - 1) {
            linkHeaders.push(`<https://api.github.com/repos/test/repo-test/pulls?state=open&page=${index + 2}>; rel="next"`);
            linkHeaders.push(`<https://api.github.com/repos/test/repo-test/pulls?state=open&page=${mockData.length}>; rel="last"`);
        }

        if (index !== 0) {
            linkHeaders.push(`<https://api.github.com/repos/test/repo-test/pulls?state=open&page=${index}>; rel="prev"`);
            linkHeaders.push("<https://api.github.com/repos/test/repo-test/pulls?state=open&page=1>; rel=\"first\"");
        }

        nock("https://api.github.com")
            .get(`/repos/test/repo-test/pulls?state=open${index === 0 ? "" : `&page=${index + 1}`}`)
            .reply(200, [pullRequest], {
                Link: linkHeaders.join(", ")
            });

        nock("https://api.github.com")
            .persist()
            .get(`/repos/test/repo-test/pulls/${pullRequest.number}/commits`)
            .reply(200, pullRequest.commits);
    });
}

/**
 * Asserts that the state value is pending and that it links to an issue.
 * @param {string} _ - ignored param
 * @param {string} payload - payload sent ot the API
 * @returns {undefined}
 * @private
 */
function assertPendingStatusWithIssueLink(_, payload) {
    const data = JSON.parse(payload);

    expect(data.state).toBe("pending");
    expect(data.description).toBe("A patch release is pending");
    expect(data.target_url).toBe("https://github.com/test/repo-test/issues/1");
}

/**
 * Asserts that the state value is success
 * @param {string} _ - ignored param
 * @param {string} payload - payload sent ot the API
 * @returns {undefined}
 * @private
 */
function assertSuccessStatusWithNoPendingRelease(_, payload) {
    const data = JSON.parse(payload);

    expect(JSON.parse(payload).state).toBe("success");
    expect(data.description).toBe("No patch release is pending");
    expect(data.target_url).toBe("");
}

/**
 * Asserts that the state value is success
 * @param {string} _ - ignored param
 * @param {string} payload - payload sent ot the API
 * @returns {undefined}
 * @private
 */
function assertSuccessStatusWithPendingRelease(_, payload) {
    const data = JSON.parse(payload);

    expect(JSON.parse(payload).state).toBe("success");
    expect(data.description).toBe("This change is semver-patch");
}

describe("release-monitor", () => {
    let bot = null;

    beforeAll(async() => {
        bot = new Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            },
            app: () => "test"
        });

        const { paginate } = await bot.auth();

        bot.auth = () => Object.assign(new GitHubApi(), { paginate });
        releaseMonitor(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue labeled", () => {
        test("in post release phase then add appropriate status check to all PRs", async() => {
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
                .reply(200, assertPendingStatusWithIssueLink);

            const fixPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, assertSuccessStatusWithPendingRelease);

            const updatePrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/333")
                .reply(200, assertPendingStatusWithIssueLink);

            const breakingPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/444")
                .reply(200, assertPendingStatusWithIssueLink);

            const randomPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/555")
                .reply(200, assertPendingStatusWithIssueLink);

            const docPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/666")
                .reply(200, assertSuccessStatusWithPendingRelease);

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

            expect(newPrStatus.isDone()).toBe(true);
            expect(fixPrStatus.isDone()).toBe(true);
            expect(updatePrStatus.isDone()).toBe(true);
            expect(breakingPrStatus.isDone()).toBe(true);
            expect(randomPrStatus.isDone()).toBe(true);
            expect(docPrStatus.isDone()).toBe(true);
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
                .reply(200, assertSuccessStatusWithNoPendingRelease);

            const fixPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/222")
                .reply(200, assertSuccessStatusWithNoPendingRelease);

            const updatePrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/333")
                .reply(200, assertSuccessStatusWithNoPendingRelease);

            const breakingPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/444")
                .reply(200, assertSuccessStatusWithNoPendingRelease);

            const randomPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/555")
                .reply(200, assertSuccessStatusWithNoPendingRelease);

            const docPrStatus = nock("https://api.github.com")
                .post("/repos/test/repo-test/statuses/666")
                .reply(200, assertSuccessStatusWithNoPendingRelease);

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
                    .get(`/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`)
                    .reply(200, [
                        {
                            html_url: "https://github.com/test/repo-test/issues/1"
                        }
                    ]);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertPendingStatusWithIssueLink);

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

                expect(newPrStatus.isDone()).toBeTruthy();
            });

            test("put success for semver patch PR under post release phase", async() => {
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
                    .get(`/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`)
                    .reply(200, [
                        {
                            html_url: "https://github.com/test/repo-test/issues/1"
                        }
                    ]);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertSuccessStatusWithPendingRelease);

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

                expect(newPrStatus.isDone()).toBeTruthy();
            });

            test("put success for all PR under outside release phase", async() => {
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
                    .get(`/repos/test/repo-test/issues?labels=release%2C${encodeURIComponent(POST_RELEASE_LABEL)}`)
                    .reply(200, []);

                const newPrStatus = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/111")
                    .reply(200, assertSuccessStatusWithNoPendingRelease);

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

                expect(newPrStatus.isDone()).toBeTruthy();
            });
        });
    });
});
