const { commitMessage } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");

const mockCommitsWithMsg = (message) => {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/commits")
        .reply(200, [
            {
                commit: {
                    message
                }
            },
            {
                commit: {
                    message: "second message doenst matter as first commit is always checked"
                }
            }
        ]);
};

const emitBotEvent = (bot, payload = {}) => bot.receive({
    event: "pull_request",
    payload: Object.assign({
        installation: {
            id: 1
        },
        pull_request: {
            number: 1
        },
        sender: {
            login: "user-a"
        },
        repository: {
            name: "repo-test",
            owner: {
                login: "test"
            }
        }
    }, payload)
});

describe("commit-message", () => {
    let bot = null;

    beforeAll(() => {
        bot = probot({
            id: "test",
            cert: "test"
        });
        commitMessage(bot.robot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("pull request opened", () => {
        test("Add message if the commit message is not correct", (done) => {
            mockCommitsWithMsg("non standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "opened"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not add message if the commit message is correct", (done) => {
            mockCommitsWithMsg("New: standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "opened"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });

    describe("pull request reopened", () => {
        test("Add message if the commit message is not correct", (done) => {
            mockCommitsWithMsg("non standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "reopened"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not add message if the commit message is correct", (done) => {
            mockCommitsWithMsg("New: standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "reopened"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });

    describe("pull request synchronize", () => {
        test("Add message if the commit message is not correct", (done) => {
            mockCommitsWithMsg("non standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "synchronize"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not add message if the commit message is correct", (done) => {
            mockCommitsWithMsg("New: standard commit message");

            const nockScope = nock("https://api.github.com")
                .post("/repos/test/repo-test/issues/1/comments")
                .reply(201);

            emitBotEvent(bot, {
                action: "synchronize"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });
});
