"use strict";

const { issueArchiver } = require("../../../src/plugins/index");

const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest");

describe("issue-archiver", () => {
    let bot;

    beforeEach(async() => {
        bot = new probot.Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            },
            app: () => "test"
        });

        const { paginate } = await bot.auth();

        bot.auth = () => Object.assign(new GitHubApi(), { paginate });

        nock.disableNetConnect();

        nock("https://api.github.com")
            .get("/app/installations")
            .query(true)
            .reply(200, [{
                id: 1,
                account: {
                    login: "test"
                }
            }]);

        nock("https://api.github.com")
            .get("/installation/repositories")
            .query(true)
            .reply(200, {
                total_count: 1,
                repositories: [
                    {
                        owner: {
                            login: "test"
                        },
                        name: "repo-test"
                    }
                ]
            });

        issueArchiver(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it("performs a search, and labels/archives all returned issues", async() => {
        const labelSearch = nock("https://api.github.com")
            .get("/repos/test/repo-test/labels")
            .reply(200, [
                {
                    name: "foo"
                },
                {
                    name: "archived due to age"
                }
            ]);

        const issueSearch = nock("https://api.github.com")
            .get("/search/issues")
            .query(true)
            .reply(200, {
                total_count: 2,
                incomplete_results: false,
                items: [
                    { number: 7, locked: false },
                    { number: 6, locked: true },
                    { number: 5, locked: false }
                ]
            }, {
            });

        const firstLock = nock("https://api.github.com")
            .put("/repos/test/repo-test/issues/7/lock")
            .reply(200);

        const firstLabels = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/7/labels")
            .reply(200);

        const secondLock = nock("https://api.github.com")
            .put("/repos/test/repo-test/issues/5/lock")
            .reply(200);

        const secondLabels = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/5/labels")
            .reply(200);

        await new Promise(resolve => setTimeout(resolve, 5000));

        expect(labelSearch.isDone()).toBe(true);
        expect(issueSearch.isDone()).toBe(true);
        expect(firstLock.isDone()).toBe(true);
        expect(firstLabels.isDone()).toBe(true);
        expect(secondLock.isDone()).toBe(true);
        expect(secondLabels.isDone()).toBe(true);
    });

    it("does not lock any issues if the appropriate label does not exist", async() => {
        const labelSearch = nock("https://api.github.com")
            .get("/repos/test/repo-test/labels")
            .reply(200, [
                {
                    name: "foo"
                },
                {
                    name: "bar"
                }
            ]);

        await new Promise(resolve => setTimeout(resolve, 5000));

        expect(labelSearch.isDone()).toBe(true);
    });
});
