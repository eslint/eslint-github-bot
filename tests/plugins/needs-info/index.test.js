"use strict";

const { needsInfo } = require("../../../src/plugins/index");
const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");

const API_ROOT = "https://api.github.com";

describe("needs-info", () => {
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
        needsInfo(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
    });

    describe("issue labeled", () => {
        test("Adds the comment if there needs info is added", async () => {
            fetchMock.mockGlobal().post(
                `${API_ROOT}/repos/test/repo-test/issues/1/comments`,
                { status: 200 }
            );

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
                                name: "needs info"
                            }
                        ],
                        user: {
                            login: "user-a"
                        },
                        number: 1
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/comments`)).toBeTruthy();
        });

        test("Do not add the comment if needs label label is not present", async () => {
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
                                name: "triage"
                            }
                        ],
                        user: {
                            login: "user-a"
                        },
                        number: 1
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
});
