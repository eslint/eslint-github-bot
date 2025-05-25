/**
 * @fileoverview Tests for the auto-assign plugin
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");
const autoAssign = require("../../../src/plugins/auto-assign");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const API_ROOT = "https://api.github.com";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("auto-assign", () => {
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

        autoAssign(bot);
    });

    afterEach(() => {
        fetchMock.unmockGlobal();
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
    });

    describe("issue opened", () => {
        test("assigns issue to author when they indicate willingness to submit PR", async () => {
            fetchMock.mockGlobal().post(
                `${API_ROOT}/repos/test/repo-test/issues/1/assignees`,
                { status: 200 }
            );

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        number: 1,
                        body: "- [x] I am willing to submit a pull request to implement this change.",
                        user: {
                            login: "user-a"
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

            expect(fetchMock.callHistory.called(`${API_ROOT}/repos/test/repo-test/issues/1/assignees`)).toBeTruthy();
        });

        test("does not assign issue when author does not indicate willingness to submit PR", async () => {
            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        number: 1,
                        body: "- [] I am willing to submit a pull request to implement this change.",
                        user: {
                            login: "user-a"
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
}); 