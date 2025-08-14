/**
 * @fileoverview Comment on issues when PRs are created/edited to fix them
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

// Regex to find issue references in PR titles
// Matches patterns like: "Fix #123", "Fixes #123", "Closes #123", "Resolves #123"
const ISSUE_REFERENCE_REGEX = /(?:fix|fixes|close|closes|resolve|resolves)\s+#(\d+)/giu;

// Maximum number of issues to comment on per PR to prevent abuse
const MAX_ISSUES_PER_PR = 3;

/**
 * Extract issue numbers from PR title
 * @param {string} title PR title
 * @returns {number[]} Array of issue numbers
 * @private
 */
function extractIssueNumbers(title) {
    const matches = [];
    let match;

    // Reset regex lastIndex to ensure we start from the beginning
    ISSUE_REFERENCE_REGEX.lastIndex = 0;

    while ((match = ISSUE_REFERENCE_REGEX.exec(title)) !== null && matches.length < MAX_ISSUES_PER_PR) {
        const issueNumber = parseInt(match[1], 10);
        if (!matches.includes(issueNumber)) {
            matches.push(issueNumber);
        }
    }

    return matches;
}

/**
 * Create the comment message for the issue
 * @param {string} prUrl URL of the pull request
 * @param {string} prTitle Title of the pull request
 * @param {string} prAuthor Author of the pull request
 * @returns {string} comment message
 * @private
 */
function createCommentMessage(prUrl, prTitle, prAuthor) {
    return `👋 Hi! This issue is being addressed in pull request ${prUrl}. Thanks, @${prAuthor}!

[//]: # (issue-pr-link)`;
}

/**
 * Check if an issue exists and is open
 * @param {ProbotContext} context Probot context object
 * @param {number} issueNumber Issue number to check
 * @returns {Promise<boolean>} True if issue exists and is open
 * @private
 */
async function isIssueOpenAndExists(context, issueNumber) {
    try {
        const { data: issue } = await context.octokit.issues.get(
            context.repo({ issue_number: issueNumber })
        );
        return issue.state === "open";
    } catch {
        // Issue doesn't exist or we don't have access
        return false;
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
            context.repo({ issue_number: issueNumber })
        );

        const botComments = comments.filter(comment => 
            comment.user.type === "Bot" && 
            comment.body.includes("[//]: # (issue-pr-link)") &&
            comment.body.includes(`/pull/${prNumber}`)
        );

        return botComments.length > 0;
    } catch {
        // If we can't check comments, assume we haven't commented
        return false;
    }
}

/**
 * Comment on issues referenced in the PR title
 * @param {ProbotContext} context Probot context object
 * @returns {Promise<void>}
 * @private
 */
async function commentOnReferencedIssues(context) {
    const { payload } = context;
    const pr = payload.pull_request;
    
    if (!pr || !pr.title) {
        return;
    }

    const issueNumbers = extractIssueNumbers(pr.title);
    
    if (issueNumbers.length === 0) {
        return;
    }

    const prUrl = pr.html_url;
    const prTitle = pr.title;
    const prAuthor = pr.user.login;
    const prNumber = pr.number;

    // Comment on each referenced issue
    for (const issueNumber of issueNumbers) {
        try {
            // Check if issue exists and is open
            if (!(await isIssueOpenAndExists(context, issueNumber))) {
                continue;
            }

            // Check if we already commented on this issue for this PR
            if (await hasExistingComment(context, issueNumber, prNumber)) {
                continue;
            }

            // Create the comment
            await context.octokit.issues.createComment(
                context.repo({
                    issue_number: issueNumber,
                    body: createCommentMessage(prUrl, prTitle, prAuthor)
                })
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
    robot.on("pull_request.opened", commentOnReferencedIssues);
    robot.on("pull_request.edited", commentOnReferencedIssues);
};