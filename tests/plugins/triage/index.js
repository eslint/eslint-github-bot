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
        test("Adds the label if there are no labels present", (done) => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", (body) => {
                    expect(body).toContain("triage");
                    return true;
                })
                .reply(200);

            bot.receive({
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
            })
                .then(() => {
                    setTimeout(() => {
                        expect(issueLabelReq.isDone()).toBeTruthy();
                        done();
                    }, 50);
                });
        });

        test("Do not add the label if already present", (done) => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            bot.receive({
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
            })
                .then(() => {
                    setTimeout(() => {
                        expect(issueLabelReq.isDone()).not.toBeTruthy();
                        done();
                    }, 50);
                });
        });
    });

    describe("issue reopened", () => {
        test("Adds the label if there are no labels present", (done) => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels", (body) => {
                    expect(body).toContain("triage");
                    return true;
                })
                .reply(200);

            bot.receive({
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
            })
                .then(() => {
                    setTimeout(() => {
                        expect(issueLabelReq.isDone()).toBeTruthy();
                        done();
                    }, 50);
                });
        });

        test("Do not add the label if already present", (done) => {
            const issueLabelReq = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/labels")
                .reply(200);

            bot.receive({
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
            })
                .then(() => {
                    setTimeout(() => {
                        expect(issueLabelReq.isDone()).not.toBeTruthy();
                        done();
                    }, 50);
                });
        });
    });
});
