/**
 * @fileoverview Tests for the auto-assign plugin
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { Probot, ProbotOctokit } = require("probot");
const { default: fetchMock } = require("fetch-mock");
const autoAssign = require("../../../src/plugins/auto-assign");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const API_URL =
	"https://api.github.com/repos/test/repo-test/issues/1/assignees";

/**
 * Returns an array of strings representing the issue body.
 * @param {'x' | ''} checkMark Check mark to use in the issue body.
 * @returns {string[]} Array of strings representing the issue body.
 */
function issueBodies(checkMark) {
	return [
		`- [${checkMark}] I am willing to submit a pull request for this issue.`,
		`- [${checkMark}] I am willing to submit a pull request for this change.`,
		`- [${checkMark}] I am willing to submit a pull request to implement this rule.`,
		`- [${checkMark}] I am willing to submit a pull request to implement this change.`,
	];
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("auto-assign", () => {
	let bot = null;

	beforeEach(() => {
		bot = new Probot({
			appId: 1,
			githubToken: "test",
			Octokit: ProbotOctokit.defaults(instanceOptions => ({
				...instanceOptions,
				throttle: { enabled: false },
				retry: { enabled: false },
			})),
		});

		autoAssign(bot);

		fetchMock.mockGlobal().post(API_URL, { status: 200 });
	});

	afterEach(() => {
		fetchMock.unmockGlobal();
		fetchMock.removeRoutes();
		fetchMock.clearHistory();
	});

	describe("issue opened", () => {
		test("assigns issue to author when they indicate willingness to submit PR", async () => {
			for (const body of issueBodies("x")) {
				await bot.receive({
					name: "issues",
					payload: {
						action: "opened",
						installation: {
							id: 1,
						},
						issue: {
							number: 1,
							body,
							user: {
								login: "user-a",
							},
						},
						repository: {
							name: "repo-test",
							owner: {
								login: "test",
							},
						},
					},
				});

				expect(fetchMock.callHistory.called(API_URL)).toBeTruthy();
			}
		});

		test("does not assign issue when author does not indicate willingness to submit PR", async () => {
			for (const body of issueBodies("")) {
				await bot.receive({
					name: "issues",
					payload: {
						action: "opened",
						installation: {
							id: 1,
						},
						issue: {
							number: 1,
							body,
							user: {
								login: "user-a",
							},
						},
						repository: {
							name: "repo-test",
							owner: {
								login: "test",
							},
						},
					},
				});

				expect(fetchMock.callHistory.called(API_URL)).toBe(false);
			}
		});
	});
});
