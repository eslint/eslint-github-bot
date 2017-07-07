const { duplicateComments } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");

const mockPrWithComments = (comments = []) =>
    nock("https://api.github.com")
        .get("/repos/test/repo-test/issues/1/comments")
        .reply(200, comments);

const createFakeComment = (id, body, login) => ({
    id,
    body,
    user: {
        login
    }
});

const mockComments = (moreComments = []) =>
    mockPrWithComments([
        createFakeComment(1, "actual comment", "user-a"),
        createFakeComment(2, "actual comment 123", "user-b"),
        createFakeComment(3, "actual comment 456", "user-c"),
        ...moreComments
    ]);

const emitBotEvent = (bot, state = "open") => bot.receive({
    event: "issue_comment",
    payload: {
        installation: {
            id: 1
        },
        action: "created",
        issue: {
            number: 1,
            state
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

describe("duplicate-comments", () => {
    let bot = null;
    let nockScope = null;

    beforeAll(() => {
        bot = probot({
            id: "test",
            cert: "test"
        });
        bot.robot.accountName = "botAccountName";
        duplicateComments(bot.robot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    const mockDelteComment = (id) => {
        nockScope = nock("https://api.github.com")
            .delete(`/repos/test/repo-test/issues/comments/${id}`)
            .reply(201);
    };

    describe("issue comment created", () => {
        test("Removes the duplicate comment of the bot", (done) => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", bot.robot.accountName),
                createFakeComment(5, "test [//]: # (test)", bot.robot.accountName)
            ]);
            mockDelteComment(4);
            emitBotEvent(bot)
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not remove any comment if no bot comment is repeated", (done) => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", bot.robot.accountName),
                createFakeComment(5, "test [//]: # (test-1)", bot.robot.accountName)
            ]);
            mockDelteComment(4);
            emitBotEvent(bot)
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });

        test("Do not remove any comment even if non bot comment are repeated", (done) => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", "user-x"),
                createFakeComment(5, "test [//]: # (test)", "user-x")
            ]);
            mockDelteComment(4);
            emitBotEvent(bot)
                .then(() => {
                    setTimeout(() => {
                        expect(nockScope.isDone()).not.toBeTruthy();
                        done();
                    }, 1000);
                });
        });
    });
});
