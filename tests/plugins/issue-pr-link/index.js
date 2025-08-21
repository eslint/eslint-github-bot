"use strict";

const { issuePrLink } = require("../../../src/plugins/index");
const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");

const API_ROOT = "https://api.github.com";

describe("issue-pr-link", () => {
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
        issuePrLink(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
    });

    describe("pull request opened", () => {
        test("comments on issue when PR body references an issue", async () => {
            // Mock the issue exists and is open
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: []
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "Fix #123: resolve the bug",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBeTruthy();
        });

        test("does not comment when PR body has no issue references", async () => {
            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Add new feature",
                        body: "This PR adds a new feature to the application",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
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

        test("does not comment when issue is closed", async () => {
            // Mock the issue exists but is closed
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "closed", number: 123 }
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "Fix #123: resolve the bug",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBe(false);
        });

        test("does not comment when issue does not exist", async () => {
            // Mock the issue does not exist
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 404
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "Fix #123: resolve the bug",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBe(false);
        });

        test("does not comment when there is already a comment for this PR", async () => {
            // Mock the issue exists and is open, but we already commented
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: [{
                        user: { type: "Bot" },
                        body: "👋 Hi! This issue is being addressed in pull request https://github.com/test/repo-test/pull/456. Thanks, @contributor!\n\n[//]: # (issue-pr-link)"
                    }]
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "Fix #123: resolve the bug",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            const wasPostCalled = fetchMock.callHistory.calls().some(call => 
                call.url === `${API_ROOT}/repos/test/repo-test/issues/123/comments` && 
                call.options.method === "post"
            );
            
            expect(wasPostCalled).toBe(false);
        });

        test("handles multiple issue references correctly", async () => {
            // Mock multiple issues exist and are open
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/456`, {
                    status: 200,
                    body: { state: "open", number: 456 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: []
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/456/comments`, {
                    status: 200,
                    body: []
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/456/comments`, {
                    status: 200
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 789,
                        title: "Multiple fixes",
                        body: "Fix #123 and closes #456",
                        html_url: "https://github.com/test/repo-test/pull/789",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/456/comments`, "POST")).toBeTruthy();
        });

        test("respects maximum issues limit to prevent abuse", async () => {
            // Mock 5 issues but only first 3 should be processed
            for (let i = 1; i <= 5; i++) {
                fetchMock.mockGlobal()
                    .get(`${API_ROOT}/repos/test/repo-test/issues/${i}`, {
                        status: 200,
                        body: { state: "open", number: i }
                    })
                    .get(`${API_ROOT}/repos/test/repo-test/issues/${i}/comments`, {
                        status: 200,
                        body: []
                    })
                    .post(`${API_ROOT}/repos/test/repo-test/issues/${i}/comments`, {
                        status: 200
                    });
            }

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 789,
                        title: "Multiple fixes test",
                        body: "Fix #1 and fix #2 and fix #3 and fix #4 and fix #5",
                        html_url: "https://github.com/test/repo-test/pull/789",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            // Only first 3 issues should be commented on
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`, "POST")).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/2/comments`, "POST")).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/3/comments`, "POST")).toBeTruthy();
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/4/comments`, "POST")).toBe(false);
            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/5/comments`, "POST")).toBe(false);
        });

        test("handles optional colon after keywords", async () => {
            // Mock the issue exists and is open
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: []
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "resolve: #123",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBeTruthy();
        });

        test("handles duplicate issue references correctly", async () => {
            // Mock the issue exists and is open
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: []
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "resolve #123\nresolve #123", // Same issue referenced twice
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            // Should only comment once despite duplicate references
            const postCalls = fetchMock.callHistory.calls().filter(call => 
                call.url === `${API_ROOT}/repos/test/repo-test/issues/123/comments` && 
                call.options.method === "post"
            );
            expect(postCalls.length).toBe(1);
        });

        test("does not match keywords that are part of other words", async () => {
            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Update documentation",
                        body: "This prefix #123 should not match", // 'prefix' contains 'fix' but shouldn't match
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
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

        test("does not match when newline separates keyword and issue number", async () => {
            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Update documentation",
                        body: "resolve\n#123", // Newline between keyword and issue number should not match
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
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

    describe("pull request edited", () => {
        test("comments on issue when PR body is edited to reference an issue", async () => {
            // Mock the issue exists and is open
            fetchMock.mockGlobal()
                .get(`${API_ROOT}/repos/test/repo-test/issues/123`, {
                    status: 200,
                    body: { state: "open", number: 123 }
                })
                .get(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200,
                    body: []
                })
                .post(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, {
                    status: 200
                });

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "edited",
                    installation: {
                        id: 1
                    },
                    pull_request: {
                        number: 456,
                        title: "Resolve the bug",
                        body: "Fix #123: resolve the bug",
                        html_url: "https://github.com/test/repo-test/pull/456",
                        user: {
                            login: "contributor"
                        }
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/123/comments`, "POST")).toBeTruthy();
        });
    });
});
