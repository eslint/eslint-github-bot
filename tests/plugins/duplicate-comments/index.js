const { duplicateComments } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");

const mockPrWithComments = (comments = []) =>
    nock("https://api.github.com")
        .get("/repos/test/repo-test/issues/1/comments")
        .reply(200, comments);

const createFakeComment = (id, body, type) => ({
    id,
    body,
    user: {
        type
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
        bot = probot.createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        duplicateComments(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    const mockDeleteComment = (id) => {
        nockScope = nock("https://api.github.com")
            .delete(`/repos/test/repo-test/issues/comments/${id}`)
            .reply(201);
    };

    describe("issue comment created", () => {
        test("Removes the duplicate comment of the bot", async () => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", "Bot"),
                createFakeComment(5, "test [//]: # (test)", "Bot")
            ]);
            mockDeleteComment(4);
            await emitBotEvent(bot);
            expect(nockScope.isDone()).toBeTruthy();
        });

        test("Do not remove any comment if no bot comment is repeated", async () => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", "Bot"),
                createFakeComment(5, "test [//]: # (test-1)", "Bot")
            ]);
            mockDeleteComment(4);
            await emitBotEvent(bot);
            expect(nockScope.isDone()).not.toBeTruthy();
        });

        test("Do not remove any comment even if non bot comment are repeated", async () => {
            mockComments([
                createFakeComment(4, "test [//]: # (test)", "user-x"),
                createFakeComment(5, "test [//]: # (test)", "user-x")
            ]);
            mockDeleteComment(4);
            await emitBotEvent(bot);
            expect(nockScope.isDone()).not.toBeTruthy();
        });
    });
});
