const { commitMessage } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("github");

const mockSingleCommitWithMessage = (message) => {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/commits")
        .reply(200, [
            {
                commit: {
                    message
                },
                sha: "first-sha"
            }
        ]);
};

const mockMultipleCommits = () => {
    nock("https://api.github.com")
        .get("/repos/test/repo-test/pulls/1/commits")
        .reply(200, [
            {
                commit: {
                    message: "foo"
                },
                sha: "first-sha"
            },
            {
                commit: {
                    message: "bar"
                },
                sha: "second-sha"
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
            number: 1,
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
        bot = probot.createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        commitMessage(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    ["opened", "reopened", "synchronize", "edited"].forEach((action) => {
        describe(`pull request ${action}`, () => {
            test("Posts failure status if commit message is not correct", async () => {
                mockSingleCommitWithMessage("non standard commit message");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", (req) => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if commit message is correct", async () => {
                mockSingleCommitWithMessage("New: standard commit message");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", (req) => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if the commit message is longer than 72 chars", async () => {
                mockSingleCommitWithMessage("New: standard commit message very very very long message and its beond 72");

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", (req) => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if the commit message is longer than 72 chars after the newline", async () => {
                mockSingleCommitWithMessage(
                    `New: foo\n\n${"A".repeat(72)}`
                );

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/first-sha", (req) => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts success status if there are multiple commit messages and the title is valid", async () => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", (req) => req.state === "success")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "Update: foo" } });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is invalid", async () => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", (req) => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: "foo" } });
                expect(nockScope.isDone()).toBeTruthy();
            });

            test("Posts failure status if there are multiple commit messages and the title is too long", async () => {
                mockMultipleCommits();

                const nockScope = nock("https://api.github.com")
                    .post("/repos/test/repo-test/statuses/second-sha", (req) => req.state === "failure")
                    .reply(201);

                await emitBotEvent(bot, { action, pull_request: { number: 1, title: `Update: ${"A".repeat(72)}` } });
                expect(nockScope.isDone()).toBeTruthy();
            });
        });
    });
});
