const { releaseIssues } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("github");

describe("release-issues", () => {
    let issueWasCreated;
    let issue;

    function runBot({ issueTitle, labelNames, eventTypes }) {
        issueWasCreated = false;

        const bot = probot.createRobot({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        releaseIssues(bot);

        nock("https://api.github.com")
            .get("/repos/test/repo-test/issues/1/events?per_page=100")
            .reply(200, eventTypes.map((type) => ({ event: type })));

        nock("https://api.github.com")
            .post("/repos/test/repo-test/issues")
            .reply(200, (uri, requestBody) => {
                issueWasCreated = true;
                issue = JSON.parse(requestBody);
                return {};
            });

        return bot.receive({
            event: "issues",
            payload: {
                installation: {
                    id: 1
                },
                action: "closed",
                issue: {
                    number: 1,
                    title: issueTitle,
                    labels: labelNames.map((name) => ({ name }))
                },
                repository: {
                    owner: {
                        login: "test"
                    },
                    name: "repo-test"
                }
            }
        });
    }

    afterEach(() => {
        nock.cleanAll();
    });

    describe("when an issue does not have the release label", () => {
        test("ignores the issue", async () => {
            await runBot({
                issueTitle: "Scheduled release for October 27th, 2017",
                labelNames: ["foo"],
                eventTypes: ["closed"]
            });

            expect(issueWasCreated).toBe(false);
        });
    });

    describe("when an issue has already been closed and reopened", () => {
        test("ignores the issue", async () => {
            await runBot({
                issueTitle: "Scheduled release for October 27th, 2017",
                labelNames: ["release"],
                eventTypes: ["foo", "closed", "reopened", "closed"]
            });

            expect(issueWasCreated).toBe(false);
        });
    });

    describe("when an issue has an invalid title", () => {
        test("ignores the issue", async () => {
            await runBot({
                issueTitle: "Foo bar!",
                labelNames: ["release"],
                eventTypes: ["closed"]
            });

            expect(issueWasCreated).toBe(false);
        });
    });

    describe("when an issue has a parseable title, has the release label, and has never been closed", () => {
        test("creates a new issue", async () => {
            await runBot({
                issueTitle: "Scheduled release for October 27th, 2017",
                labelNames: ["release"],
                eventTypes: ["closed"]
            });

            expect(issueWasCreated).toBe(true);
            expect(issue.title).toBe("Scheduled release for November 10th, 2017");
            expect(issue.body.startsWith("The scheduled release on Friday, November 10th, 2017")).toBe(true);
        });
    });
});
