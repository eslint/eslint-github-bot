"use strict";

const checkUnitTest = require("../../../src/plugins/check-unit-test/index.js");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest").Octokit;

/**
 * Mocks a given PR on issue existing with specified files
 * @param {string} url The relative URL of the file from the repository root
 * @returns {NockScope} A nock scope with the given responses
 */
function mockPrWithFiles(url) {
    return nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/files")
        .reply(200, [
            {
                blob_url: "https://github.com/test/repo-test/x/b/lime.js"
            },
            {
                blob_url: `https://github.com/test/repo-test/${url}`
            }
        ]);
}

/**
 * Emits a bot event for this plugin
 * @param {probot.Robot} bot A probot instance
 * @param {Object} options Configure the event
 * @param {string} options.action The name of the webhook action
 * @param {string} options.title The title of the PR
 * @returns {Promise<void>} A Promise that fulfills when the webhook completes
 */
function emitBotEvent(bot, { action, title }) {
    return bot.receive({
        name: "pull_request",
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
}

describe("check-unit-test", () => {
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
        test("Add message if the there are no test files", async () => {
            mockPrWithFiles("src/make.js");
            await emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            });

            expect(nockScope.isDone()).toBeTruthy();
        });

        test("Do not add message if the test folder is present", async () => {
            mockPrWithFiles("src/tests/make.js");
            await emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            });

            expect(nockScope.isDone()).not.toBeTruthy();
        });

        test("Add message if the test folder is not present tho a file with named test is", async () => {
            mockPrWithFiles("src/lib/test.js");
            await emitBotEvent(bot, {
                action: "opened",
                title: "New: some work done"
            });

            expect(nockScope.isDone()).toBeTruthy();
        });

        test("Do not add message if the test files are not present and commit is chore", async () => {
            mockPrWithFiles("src/make.js");
            await emitBotEvent(bot, {
                action: "opened",
                title: "Chore: some work done"
            });

            expect(nockScope.isDone()).not.toBeTruthy();
        });
    });

    describe("pull request reopened", () => {
        test("Add message if the there are no test files", async () => {
            mockPrWithFiles("src/make.js");
            await emitBotEvent(bot, {
                action: "reopened",
                title: "New: some work done"
            });

            expect(nockScope.isDone()).toBeTruthy();
        });
    });

    describe("pull request synchronize", () => {
        test("Add message if the there are no test files", async () => {
            mockPrWithFiles("src/make.js");
            await emitBotEvent(bot, {
                action: "synchronize",
                title: "New: some work done"
            });

            expect(nockScope.isDone()).toBeTruthy();
        });
    });
});
