"use strict";

const { addToTriageProject } = require("../../../src/plugins/index");
const nock = require("nock");
const { Application } = require("probot");
const { NEEDS_TRIAGE_COLUMN_ID } = require("../../../src/constants");
const GitHubApi = require("@octokit/rest");

describe("add-to-triage-project", () => {
    let bot = null;

    beforeAll(() => {
        bot = new Application({
            id: "test",
            cert: "test",
            cache: {
                wrap: () => Promise.resolve({ data: { token: "test" } })
            }
        });
        bot.auth = () => new GitHubApi();
        addToTriageProject(bot);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("issue opened", () => {
        test("Adds the issue to the project", async () => {
            const addIssueToTriageProject = nock("https://api.github.com")
                .post(`/projects/columns/${NEEDS_TRIAGE_COLUMN_ID}/cards`, body => {
                    expect(body).toEqual({
                        content_id: 1234,
                        content_type: "Issue"
                    });
                    return true;
                })
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [],
                        number: 1,
                        id: 1234
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(addIssueToTriageProject.isDone()).toBeTruthy();
        });

        test("doesn't add the issue to the project when 'triage:no' label is present", async () => {

            const addIssueToTriageProject = nock("https://api.github.com")
                .post(`/projects/columns/${NEEDS_TRIAGE_COLUMN_ID}/cards`, body => {
                    expect(body).toEqual({
                        content_id: 1234,
                        content_type: "Issue"
                    });
                    return true;
                })
                .reply(200);

            await bot.receive({
                name: "issues",
                payload: {
                    action: "opened",
                    installation: {
                        id: 1
                    },
                    issue: {
                        labels: [
                            {
                                name: "triage:no"
                            }
                        ],
                        number: 1,
                        id: 1234
                    },
                    repository: {
                        name: "repo-test",
                        owner: {
                            login: "test"
                        }
                    }
                }
            });

            expect(addIssueToTriageProject.isDone()).toBeFalsy();

        });
    });
});
