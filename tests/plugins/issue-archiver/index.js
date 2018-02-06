"use strict";

const { issueArchiver } = require("../../../src/plugins/index");

const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("github");

process.on("unhandledRejection", console.error); // eslint-disable-line

describe("issue-archiver", () => {
    let bot;

    beforeEach(async() => {
        bot = probot.createRobot({
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
            .reply(200, [{}]);

        nock("https://api.github.com")
            .get("/installation/repositories")
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
        const search = nock("https://api.github.com")
            .get("/search/issues")
            .query({ q: "is:closed repo:test/repo-test -label:\"archived due to age\" closed:<2017-08-10", per_page: 100 })
            .reply(200, {
                total_count: 2,
                incomplete_results: false,
                items: [
                    { number: 7 },
                    { number: 5 }
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

        await new Promise(resolve => setTimeout(resolve, 500));

        await bot.receive({
            event: "schedule.repository",
            payload: {
                installation: {
                    id: 1
                },
                repository: {
                    name: "repo-test",
                    owner: {
                        login: "test"
                    }
                }
            }
        });

        expect(search.isDone()).toBe(true);
        expect(firstLock.isDone()).toBe(true);
        expect(firstLabels.isDone()).toBe(true);
        expect(secondLock.isDone()).toBe(true);
        expect(secondLabels.isDone()).toBe(true);
    });
});
