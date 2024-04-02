"use strict";

const { recurringIssues } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");
const GitHubApi = require("@octokit/rest").Octokit;

describe("recurring-issues", () => {
    let issueWasCreated;
    let issue;

    /**
     * Runs the bot with the given arguments, setting up fixtures and running the webhook listener
     * @param {Object} options Configure API responses the bot will see
     * @param {string} options.issueTitle The title of the existing issue which was closed
     * @param {string[]} options.labelNames The labels of the issue which was closed
     * @param {string[]} options.eventTypes The events that have occurred for the issue
     * @returns {Promise<void>} A Promise that fulfills after the webhook action is complete
     */
    function runBot({ issueTitle, labelNames, eventTypes }) {
        issueWasCreated = false;

        const bot = new probot.Application({
            id: 110,
            githubToken: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });

        bot.auth = () => new GitHubApi();
        recurringIssues(bot);

        const ORGANIZATION_NAME = "test";
        const TEAM_ID = 55;

        nock("https://api.github.com")
            .get(`/repos/${ORGANIZATION_NAME}/repo-test/issues/1/events?per_page=100`)
            .reply(200, eventTypes.map(type => ({ event: type })));

        nock("https://api.github.com")
            .post("/repos/test/repo-test/issues")
            .reply(200, (uri, requestBody) => {
                issueWasCreated = true;
                issue = requestBody;
                return {};
            });

        nock("https://api.github.com")
            .get(`/orgs/${ORGANIZATION_NAME}/teams?per_page=100`)
            .reply(200, [
                {
                    id: TEAM_ID,
                    slug: "eslint-tsc"
                }
            ]);

        nock("https://api.github.com")
            .get(`/teams/${TEAM_ID}/members?per_page=100`)
            .reply(200, [
                {
                    id: 1,
                    login: "user1"
                },
                {
                    id: 2,
                    login: "user2"
                }
            ]);

        nock("https://api.github.com")
            .get("/user/1")
            .reply(200, {
                login: "user1",
                name: "User One"
            });

        nock("https://api.github.com")
            .get("/user/2")
            .reply(200, {
                login: "user2",
                name: "User Two"
            });

        return bot.receive({
            name: "issues",
            payload: {
                installation: {
                    id: 1
                },
                action: "closed",
                issue: {
                    number: 1,
                    title: issueTitle,
                    labels: labelNames.map(name => ({ name }))
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
            expect(issue.body.startsWith("The next scheduled release will occur on Friday, November 10th, 2017")).toBe(true);
        });
    });

    describe("when an issue has a parseable title, has the tsc meeting label, and has never been closed", () => {
        test("creates a new issue", async () => {
            await runBot({
                issueTitle: "TSC meeting 26-October-2017",
                labelNames: ["tsc meeting"],
                eventTypes: ["closed"]
            });

            expect(issueWasCreated).toBe(true);
            expect(issue.title).toBe("TSC meeting 09-November-2017");
            expect(issue.body).toBe([
                "# Time",
                "",
                "UTC Thu 09-Nov-2017 21:00:",
                "- Los Angeles: Thu 09-Nov-2017 13:00",
                "- Chicago: Thu 09-Nov-2017 15:00",
                "- New York: Thu 09-Nov-2017 16:00",
                "- Madrid: Thu 09-Nov-2017 22:00",
                "- Moscow: Fri 10-Nov-2017 00:00",
                "- Tokyo: Fri 10-Nov-2017 06:00",
                "- Sydney: Fri 10-Nov-2017 08:00",
                "",
                "# Location",
                "",
                "https://eslint.org/chat/tsc-meetings",
                "",
                "# Agenda",
                "",
                "Extracted from:",
                "",
                "* Issues and pull requests from the ESLint organization with the [\"tsc agenda\" label](https://github.com/issues?utf8=%E2%9C%93&q=org%3Aeslint+label%3A%22tsc+agenda%22)",
                "* Comments on this issue",
                "",
                "# Invited",
                "",
                "- User One (@user1) - TSC",
                "- User Two (@user2) - TSC",
                "",
                "# Public participation",
                "",
                "Anyone is welcome to attend the meeting as observers. We ask that you refrain from interrupting the meeting once it begins and only participate if invited to do so."
            ].join("\n"));
        });
    });
});
