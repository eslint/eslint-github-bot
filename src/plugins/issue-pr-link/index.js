/**
 * @fileoverview Validate PR eligibility and comment on referenced issues
 * @author ESLint GitHub Bot Contributors
 */

"use strict";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Context} ProbotContext */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Regex to find issue references in PR bodies
 * Matches patterns like: "Fix #123", "Fixes #123", "Closes #123", "Resolves #123", etc.
 */
const ISSUE_REFERENCE_REGEX =
	/\b(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved):?[ \t]+#(?<issueNumber>\d+)/giu;

/**
 * Maximum number of issues to comment on per PR to prevent abuse
 */
const MAX_ISSUES_PER_PR = 3;

/**
 * Extract issue numbers from PR body
 * @param {string} body PR body
 * @returns {number[]} Array of issue numbers
 * @private
 */
function extractIssueNumbers(body) {
	const matches = [];
	let match;

	// Reset regex lastIndex to ensure we start from the beginning
	ISSUE_REFERENCE_REGEX.lastIndex = 0;

	while (
		(match = ISSUE_REFERENCE_REGEX.exec(body)) !== null &&
		matches.length < MAX_ISSUES_PER_PR
	) {
		const issueNumber = parseInt(match.groups.issueNumber, 10);
		if (!matches.includes(issueNumber)) {
			matches.push(issueNumber);
		}
	}

	return matches;
}

/**
 * Create the comment message for the issue
 * @param {string} prUrl URL of the pull request
 * @param {string} prAuthor Author of the pull request
 * @returns {string} comment message
 * @private
 */
function createCommentMessage(prUrl, prAuthor) {
	return `👋 Hi! This issue is being addressed in pull request ${prUrl}. Thanks, @${prAuthor}!

[//]: # (issue-pr-link)`;
}

/**
 * Get an issue if it exists and is open
 * @param {ProbotContext} context Probot context object
 * @param {number} issueNumber Issue number to check
 * @returns {Promise<object|null>} The open issue, or null if unavailable
 * @private
 */
async function getOpenIssue(context, issueNumber) {
	try {
		const { data: issue } = await context.octokit.issues.get(
			context.repo({ issue_number: issueNumber }),
		);
		return issue.state === "open" ? issue : null;
	} catch {
		// Issue doesn't exist or we don't have access
		return null;
	}
}

/**
 * Check if we already commented on this issue for this PR
 * @param {ProbotContext} context Probot context object
 * @param {number} issueNumber Issue number
 * @param {number} prNumber PR number
 * @returns {Promise<boolean>} True if we already commented
 * @private
 */
async function hasExistingComment(context, issueNumber, prNumber) {
	try {
		const { data: comments } = await context.octokit.issues.listComments(
			context.repo({ issue_number: issueNumber }),
		);

		const botComments = comments.filter(
			comment =>
				comment.user.type === "Bot" &&
				comment.body.includes("[//]: # (issue-pr-link)") &&
				comment.body.includes(`/pull/${prNumber}`),
		);

		return botComments.length > 0;
	} catch {
		// If we can't check comments, assume we haven't commented
		return false;
	}
}

/**
 * Validate eligibility before commenting on issues referenced in the PR body
 * @param {ProbotContext} context Probot context object
 * @returns {Promise<void>}
 * @private
 */
async function commentOnReferencedIssues(context) {
	const { payload } = context;
	const pr = payload.pull_request;

	if (!pr || !pr.body || pr.state === "closed") {
		return;
	}

	const issueNumbers = extractIssueNumbers(pr.body);

	if (issueNumbers.length === 0) {
		return;
	}

	const prUrl = pr.html_url;
	const prAuthor = pr.user.login;
	const prNumber = pr.number;
	const openIssueNumbers = [];

	for (const issueNumber of issueNumbers) {
		const issue = await getOpenIssue(context, issueNumber);
		if (!issue) {
			continue;
		}

		if (
			!issue.labels.some(label => label.name === "accepted") ||
			!issue.assignees.some(
				assignee =>
					assignee.login.toLowerCase() === prAuthor.toLowerCase(),
			)
		) {
			await context.octokit.issues.createComment(
				context.repo({
					issue_number: prNumber,
					body: `Hey @${prAuthor}, thanks so much for the submission. In order to accept a PR, the issue must first be marked as accepted and you must be assigned to it. Issue #${issueNumber} does not meet these requirements. We're closing this in order to stick with our process, which you can read about here:

https://eslint.org/docs/latest/contribute/work-on-issue
https://eslint.org/docs/latest/contribute/pull-requests`,
				}),
			);
			await context.octokit.pulls.update(
				context.repo({ pull_number: prNumber, state: "closed" }),
			);
			return;
		}

		openIssueNumbers.push(issueNumber);
	}

	// Validate all issues before posting any link comments.
	for (const issueNumber of openIssueNumbers) {
		try {
			// Check if we already commented on this issue for this PR
			if (await hasExistingComment(context, issueNumber, prNumber)) {
				continue;
			}

			// Create the comment
			await context.octokit.issues.createComment(
				context.repo({
					issue_number: issueNumber,
					body: createCommentMessage(prUrl, prAuthor),
				}),
			);
		} catch (error) {
			// Log error but continue with other issues
			// eslint-disable-next-line no-console -- Logging errors is intentional
			console.error(`Failed to comment on issue #${issueNumber}:`, error);
		}
	}
}

//-----------------------------------------------------------------------------
// Robot
//-----------------------------------------------------------------------------

module.exports = robot => {
	robot.on(
		["pull_request.opened", "pull_request.edited"],
		commentOnReferencedIssues,
	);
};
