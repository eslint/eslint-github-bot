const { triage } = require("../../../src/plugins/index");
const nock = require("nock");
const probot = require("probot");

/*
 * We have to mock this dependecny as its not worth the effort to solve all the things
 * related to private keys and request header cert.
 */
jest.mock("github-app", () => () => ({
    createToken: () => Promise.resolve({
        data: {
            token: "test"
        }
    })
}));

describe("triage", () => {
    let bot = null;

    beforeAll(() => {
        bot = probot({
            id: "test",
            cert: "test"
        });
        triage(bot.robot);
    });

    test("Adds the label if there are no labels present", (done) => {
        const issueLabelReq = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/1/labels", (body) => {
                expect(body).toContain("triage");
                return true;
            })
            .reply(200);

        bot.receive({
            event: "issues",
            payload: {
                action: "opened",
                installation: {
                    id: 1
                },
                issue: {
                    labels: [],
                    number: 1
                },
                repository: {
                    name: "repo-test",
                    owner: {
                        login: "test"
                    }
                }
            }
        });
        setTimeout(() => {
            expect(issueLabelReq.isDone()).toBeTruthy();
            done();
        }, 100);
    });

    test("Do not add the label if already present", (done) => {
        const issueLabelReq = nock("https://api.github.com")
            .post("/repos/test/repo-test/issues/1/labels", (body) => {
                expect(body).toContain("triage");
                return true;
            })
            .reply(200);

        bot.receive({
            event: "issues",
            payload: {
                action: "opened",
                installation: {
                    id: 1
                },
                issue: {
                    labels: [
                        "label"
                    ],
                    number: 1
                },
                repository: {
                    name: "repo-test",
                    owner: {
                        login: "test"
                    }
                }
            }
        });
        setTimeout(() => {
            expect(issueLabelReq.isDone()).not.toBeTruthy();
            done();
        }, 100);
    });
});
