"use strict";

const { triage } = require("../../../src/plugins/index");
const nock = require("nock");
const { Application } = require("probot");
const GitHubApi = require("@octokit/rest");

describe("triage", () => {
    let bot = null;

    beforeAll(() => {
        bot = new Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        triage(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue opened", () => {
        test("Adds the label if there are no labels present", async() => {
            const issueLabelGetReq = nock("https://api.github.com")
                .get("/repos/test/repo-test/issues/1")
                .reply(200, {
                    labels: []
                });

            const issueLabelPostReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", body => {
                    expect(body).toEqual(["triage"]);
                    return true;
                })
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [],
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

            expect(issueLabelGetReq.isDone()).toBeTruthy();
            expect(issueLabelPostReq.isDone()).toBeTruthy();
        });

        test("Does not add the label if already present in the initial webhook event", async() => {
            const issueLabelGetReq = nock("https://api.github.com")
                .get("/repos/test/repo-test/issues/1")
                .reply(200, {
                    labels: [{ name: "triage" }]
                });
            const issueLabelPostReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            "label"
                        ],
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

            expect(issueLabelGetReq.isDone()).toBe(false);
            expect(issueLabelPostReq.isDone()).toBe(false);
        });

        test("Does not add the label if already present when the issue is fetched", async() => {
            const issueLabelGetReq = nock("https://api.github.com")
                .get("/repos/test/repo-test/issues/1")
                .reply(200, {
                    labels: [{ name: "triage" }]
                });
            const issueLabelPostReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [],
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

            expect(issueLabelGetReq.isDone()).toBe(true);
            expect(issueLabelPostReq.isDone()).toBe(false);
        });
    });

    describe("issue reopened", () => {
        test("Adds the label if there are no labels present", async() => {
            const issueLabelGetReq = nock("https://api.github.com")
                .get("/repos/test/repo-test/issues/1")
                .reply(200, { labels: [] });
            const issueLabelPostReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", body => {
                    expect(body).toEqual(["triage"]);
                    return true;
                })
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "reopened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [],
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

            expect(issueLabelGetReq.isDone()).toBe(true);
            expect(issueLabelPostReq.isDone()).toBe(true);
        });

        test("Do not add the label if already present", async() => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "reopened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            "label"
                        ],
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

            expect(issueLabelReq.isDone()).not.toBeTruthy();
        });
    });

    describe("When a pull request is opened", () => {
        test("Adds the label if there are no labels present", async() => {
            const issueLabelGetReq = nock("https://api.github.com")
                .get("/repos/test/repo-test/issues/1")
                .reply(200, {
                    labels: []
                });

            const issueLabelPostReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", body => {
                    expect(body).toEqual(["triage"]);
                    return true;
                })
                .reply(200);

            await bot.receive({
                name: "pull_request",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    pull_request: {
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

            expect(issueLabelGetReq.isDone()).toBe(true);
            expect(issueLabelPostReq.isDone()).toBe(true);
        });
    });
});
