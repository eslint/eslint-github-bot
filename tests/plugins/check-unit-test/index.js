const { checkUnitTest } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");

const mockPrWithFiles = (url) =>
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/files")
        .reply(200, [
            {
                blob_url: "https://github.com/test/repo-test/x/b/lime.js"
            },
            {
                blob_url: `https://github.com/test/repo-test/${url}`
            }
        ]);

const emitBotEvent = (bot, { action, title }) => bot.receive({
    event: "pull_request",
    payload: {
        installation: {
            id: 1
        },
        action,
        pull_request: {
            number: 1,
            title
        },
        sender: {
            login: "user-a"
        },
        repository: {
            name: "repo-test",
            html_url: "https://github.com/test/repo-test",
            owner: {
                login: "test"
            }
        }
    }
});

describe("check-unit-test", () => {
    let bot = null;
    let nockScope = null;

    beforeAll(() => {
        bot = probot.createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        checkUnitTest(bot);
    });

    beforeEach(() => {
        nockScope = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/1/comments")
            .reply(201);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("pull request opened", () => {
        test("Add message if the there are no test files", (done) => {
            mockPrWithFiles("src/make.js");
            emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not add message if the test folder is present", (done) => {
            mockPrWithFiles("src/tests/make.js");
            emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Add message if the test folder is not present tho a file with named test is", (done) => {
            mockPrWithFiles("src/lib/test.js");
            emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not add message if the test files are not present and commit is chore", (done) => {
            mockPrWithFiles("src/make.js");
            emitBotEvent(bot, {
                action: "opened",
                title: "Chore: some work done"
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
        test("Add message if the there are no test files", (done) => {
            mockPrWithFiles("src/make.js");
            emitBotEvent(bot, {
                action: "reopened",
                title: "New: some work done"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });

    describe("pull request synchronize", () => {
        test("Add message if the there are no test files", (done) => {
            mockPrWithFiles("src/make.js");
            emitBotEvent(bot, {
                action: "synchronize",
                title: "New: some work done"
            })
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });
});
