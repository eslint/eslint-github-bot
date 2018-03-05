"use strict";

const { needsInfo } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest");

describe("needs-info", () => {
    let bot = null;
    let issueCommentReq = null;

    beforeAll(() => {
        bot = probot.createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        needsInfo(bot);
    });

    beforeEach(() => {
        issueCommentReq = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/1/comments")
            .reply(200);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue labeled", () => {
        test("Adds the comment if there needs info is added", async() => {
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
                                name: "needs info"
                            }
                        ],
                        user: {
                            login: "user-a"
                        },
                        number: 1
                    },
                    label: {
                        name: "needs info"
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(issueCommentReq.isDone()).toBeTruthy();
        });

        test("Do not add the comment if needs label label is not present", async() => {
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
                                name: "triage"
                            }
                        ],
                        user: {
                            login: "user-a"
                        },
                        number: 1
                    },
                    label: {
                        name: "triage"
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(issueCommentReq.isDone()).not.toBeTruthy();
        });
    });
});
