/**
 * @fileoverview Validates that commit messages are formatted according
 * to the guidelines.
 * @author Gyandeep Singh
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const commentMessage = require("./createMessage");
const { TAG_LABELS } = require("./util");

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Context} ProbotContext */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const TAG_REGEX = /^(?:feat|build|chore|docs|fix|refactor|test|ci|perf)!?: /u;

const TAG_SPACE_REGEX = /^(?:[a-z]+!?: )/u;

const LOWERCASE_TAG_REGEX = /^[a-z]/u;

const MESSAGE_LENGTH_LIMIT = 72;

const EXCLUDED_REPOSITORY_NAMES = new Set([
    "eslint.github.io",
    "tsc-meetings"
]);

//-----------------------------------------------------------------------------
// Functions
//-----------------------------------------------------------------------------

/**
 * Apply different checks on the commit message
 * @param {string} message commit message
 * @returns {boolean} `true` if the commit message is valid
 * @private
 */
function getCommitMessageErrors(message) {
    const commitTitle = message.split(/\r?\n/u)[0];
    const errors = [];

    if (message.startsWith("Revert \"")) {
        return errors;
    }

    // First, check tag and summary length
    if (!TAG_REGEX.test(commitTitle)) {
        errors.push("NON_MATCHED_TAG");
    }

    // Check if there is any whitespace after the <Tag>:
    if (!TAG_SPACE_REGEX.test(commitTitle)) {
        errors.push("SPACE_AFTER_TAG_COLON");
    }

    if (!LOWERCASE_TAG_REGEX.test(commitTitle)) {
        errors.push("NON_LOWERCASE_FIRST_LETTER_TAG");
    }

    if (!(commitTitle.length <= MESSAGE_LENGTH_LIMIT)) {
        errors.push("LONG_MESSAGE");
    }

    return errors;
}

/**
 * Apply different checks on the commit message
 * @param {string} message commit message
 * @returns {Array<string>} The labels to add to the PR.
 * @private
 */
function getCommitMessageLabels(message) {
    const commitTitle = message.split(/\r?\n/u)[0];
    const [tag] = commitTitle.match(TAG_REGEX) || [""];

    return TAG_LABELS.get(tag.trim());
}

/**
 * If the first commit message is not legal then it adds a comment
 * @param {ProbotContext} context context given by the probot
 * @returns {Promise<void>} promise
 * @private
 */
async function processCommitMessage(context) {

    /*
     * We care about the default commit message that will appear when the
     * PR is merged. If the PR has exactly one commit, this is the commit
     * message of that commit. If the PR has more than one commit, this
     * is the title of the PR.
     */
    const { payload, octokit } = context;

    if (EXCLUDED_REPOSITORY_NAMES.has(payload.repository.name)) {
        return;
    }

    const allCommits = await octokit.pulls.listCommits(context.pullRequest());
    const messageToCheck = payload.pull_request.title;
    const errors = getCommitMessageErrors(messageToCheck);
    let description;
    let state;

    if (errors.length === 0) {
        state = "success";
        description = "PR title follows commit message guidelines";

        const labels = getCommitMessageLabels(messageToCheck);

        if (labels) {
            await context.octokit.issues.addLabels(context.issue({ labels }));
        }

    } else {
        state = "failure";
        description = "PR title doesn't follow commit message guidelines";
    }

    // create status on the last commit
    await octokit.repos.createCommitStatus(
        context.repo({
            sha: allCommits.data.at(-1).sha,
            state,
            target_url: "https://github.com/eslint/eslint-github-bot/blob/main/docs/commit-message-check.md",
            description,
            context: "commit-message"
        })
    );

    if (state === "failure") {
        await octokit.issues.createComment(context.issue({
            body: commentMessage(errors, payload.pull_request.user.login)
        }));
    }

}

/**
 * check commit message
 */

module.exports = robot => {
    robot.on("pull_request.opened", processCommitMessage);
    robot.on("pull_request.reopened", processCommitMessage);
    robot.on("pull_request.synchronize", processCommitMessage);
    robot.on("pull_request.edited", processCommitMessage);
};
