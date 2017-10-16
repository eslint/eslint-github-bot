const { triage } = require("../../../src/plugins/index");
const nock = require("nock");
const { createRobot } = require("probot");

describe("triage", () => {
    let bot = null;

    beforeAll(() => {
        bot = createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        triage(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue opened", () => {
        test("Adds the label if there are no labels present", async () => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", (body) => {
                    expect(body).toContain("triage");
                    return true;
                })
                .reply(200);

            await bot.receive({
                event: "issues",
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

            expect(issueLabelReq.isDone()).toBeTruthy();
        });

        test("Do not add the label if already present", async () => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            await bot.receive({
                event: "issues",
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

            expect(issueLabelReq.isDone()).not.toBeTruthy();
        });
    });

    describe("issue reopened", () => {
        test("Adds the label if there are no labels present", async () => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", (body) => {
                    expect(body).toContain("triage");
                    return true;
                })
                .reply(200);

            await bot.receive({
                event: "issues",
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

            expect(issueLabelReq.isDone()).toBeTruthy();
        });

        test("Do not add the label if already present", async () => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            await bot.receive({
                event: "issues",
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
});
