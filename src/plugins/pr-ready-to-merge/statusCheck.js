/**
 * @fileoverview Checks if the status of the latest commit on a PR
 * @author Gyandeep Singh
 */

"use strict";

const { labels, getAllCommitsByPR } = require("./common");

/**
 * Gets the combined state of a particular sha commit
 * @param {Object} context - context given by the probot
 * @param {string} sha - git sha value
 * @returns {Promise<string>} value of the state
 */
async function getStatusBySha(context, sha) {
    const { data: { state, statuses } } = await context.github.repos.getCombinedStatus(
        context.repo({
            ref: sha
        })
    );

    return statuses.length > 0 ? state : labels.successStatus;
}

/**
 * Get the sha values from the commit objects
 * @param {Object} commit - Commit
 * @returns {string} sha values
 * @private
 */
function pluckSha(commit) {
    return commit.sha;
}

/**
 * Get the latest commit
 * @param {Array<Object>} commits - all the Commit
 * @returns {Object} latest commit object
 * @private
 */
function getLatestCommit(commits) {
    return commits[commits.length - 1];
}

/**
 * Check if status is a success
 * @param {string} status - Status of a commit
 * @returns {boolean} true if it is success
 * @private
 */
function isStatusSuccess(status) {
    return status === labels.successStatus;
}

/**
 * Check to see if the PR build status is good or not
 * @param {Object} context - context given by the probot
 * @param {int} prId - pull request number
 * @returns {Promise<boolean>} true if its good
 */
function isPrStatusSuccess(context, prId) {
    return getAllCommitsByPR(context, prId)
        .then(getLatestCommit)
        .then(pluckSha)
        .then(shas => getStatusBySha(context, shas))
        .then(isStatusSuccess);
}

module.exports = {
    isPrStatusSuccess
};
