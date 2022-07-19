/**
 * @fileoverview Make sure the PR contains unit test.
 * This check will be ignored for Build|Chore|Docs|Upgrade PR title.
 * @author Gyandeep Singh
 */

"use strict";

const path = require("path");

const TAG_REGEX = /^(?:Build|Chore|Docs|Upgrade):/u;

/**
 * Check if the commit message follow the guidelines
 * @param {string} message commit message
 * @returns {boolean} True if it's ok
 * @private
 */
const isChoreTypePullRequest = TAG_REGEX.test.bind(TAG_REGEX);

/**
 * Create the comment for the commit message issue
 * @param {string} username user to tag on the comment
 * @returns {string} comment message
 * @private
 */
function commentMessage(username) {
    return `
Hi @${username},

It looks like you have made some code changes, but you have not added any unit tests. We require unit tests for all types of code changes.
If this is a mistake, then please ignore this message.

[//]: # (check-unit-test)
`;
}

/**
 * Checks if any unit test files are present in the pull request
 * @param {Array<Object>} files collection of files inside the pull request
 * @param {string} repoUrl url of the repo
 * @returns {boolean} True if atleast 1 test files is present
 * @private
 */
function areUnitTestFilesPresent(files, repoUrl) {
    return files
        .map(file => file.blob_url)
        .map(url => path.dirname(url))
        .map(url => url.slice(repoUrl.length))
        .some(url => url.includes("test"));
}

/**
 * Adds the triage label if the issue has no labels on it
 * @param {Object} context context given by the probot
 * @returns {Promise.<void>} promise
 * @private
 */
async function action(context) {
    const { payload, github } = context;

    if (!isChoreTypePullRequest(payload.pull_request.title)) {
        const { data: allFiles } = await github.pullRequests.listFiles(context.issue());

        if (!areUnitTestFilesPresent(allFiles, payload.repository.html_url)) {
            await github.issues.createComment(context.issue({
                body: commentMessage(payload.sender.login)
            }));
        }
    }
}

/**
 * Check if unit test are present or not
 * Ignore check if its a PR with title - Build|Chore|Docs|Upgrade
 */

module.exports = robot => {
    robot.on("pull_request.opened", action);
    robot.on("pull_request.reopened", action);
    robot.on("pull_request.synchronize", action);
};
