"use strict";

const { duplicateComments } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest");

/**
 * Creates a mock PR with the given comments
 * @param {Object[]} comments Comment objects in the API
 * @returns {Nock.Scope} A nock scope with the given fixtures
 */
function mockPrWithComments(comments = []) {
    return nock("https://api.github.com")
        .get("/repos/test/repo-test/issues/1/comments")
        .reply(200, comments);
}

/**
 * Creates a mock comment with the given properties
 * @param {string} id The comment id
 * @param {string} body The comment body
 * @param {string} type The comment type
 * @returns {Object} The comment information
 */
function createFakeComment(id, body, type) {
    return {
        id,
        body,
        user: {
            type
        }
    };
}

/**
 * Creates a mock PR with the given comments in addition to 3 sample comments
 * @param {Object[]} moreComments Comment objects in the API
 * @returns {Nock.Scope} A nock scope with the given fixtures
 */
function mockComments(moreComments = []) {
    return mockPrWithComments([
        createFakeComment(1, "actual comment", "user-a"),
        createFakeComment(2, "actual comment 123", "user-b"),
        createFakeComment(3, "actual comment 456", "user-c"),
        ...moreComments
    ]);
}

/**
 * Emits a bot event for this plugin
 * @param {probot.Robot} bot A probot instance
 * @param {string} state The state of the issue in the webhook
 * @returns {Promise<void>} A Promise that fulfills when the webhook completes
 */
function emitBotEvent(bot, state = "open") {
    return bot.receive({
        name: "issue_comment",
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
}

describe("duplicate-comments", () => {
    let bot = null;
    let nockScope = null;

    beforeAll(() => {
        bot = new probot.Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        duplicateComments(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    /**
     * Sets up a fixture for the comment-deletion endpoint
     * @param {string} id The comment ID
     * @returns {void}
     */
    function mockDeleteComment(id) {
        nockScope = nock("https://api.github.com")
            .delete(`/repos/test/repo-test/issues/comments/${id}`)
            .reply(201);
    }

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
