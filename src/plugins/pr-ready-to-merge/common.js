/**
 * @fileoverview Common git utils for the plugin
 * @author Gyandeep Singh
 */

"use strict";

const labels = {
    reviewLabel: "pr: ready to merge",
    successStatus: "success",
    failedStatus: "failed",
    prApprovedState: "approved",
    reviewApproved: "APPROVED",
    reviewChangeRequested: "CHANGES_REQUESTED"
};

/**
 * Removes the approved label from the pull request
 * @param {Object} context - context given by the probot
 * @returns {Promise} Promise that fulfills when the action is complete
 */
function removePrApprovedLabel(context) {
    return context.github.issues.removeLabel(context.issue({
        name: labels.reviewLabel
    }));
}

/**
 * Add the approved label to the pull request
 * @param {Object} context - context given by the probot
 * @returns {Promise} Promise that fulfills when the action is complete
 */
function addPrApprovedLabel(context) {
    return context.github.issues.addLabels(context.issue({
        labels: [labels.reviewLabel]
    }));
}

/**
 * Gets all the pull request based on the sha
 * it will return null if there is no related pr
 * will return the first one if their are multiple entries (which should be rare)
 * @param {Object} context - context given by the probot
 * @param {string} sha - git sha value
 * @returns {Promise.<Object|null>} Promise that fulfills when the action is complete
 */
async function getPullrequestBySha(context, sha) {
    const { data: { items } } = await context.github.search.issues({
        q: sha
    });

    return items.length === 1 ? items[0] : null;
}

/**
 * Gets all the commits using the PR number
 * @param {Object} context - context given by the probot
 * @param {int} prId - pull request number
 * @returns {Promise.<Array>} Resolves with commit collection
 */
async function getAllCommitsByPR(context, prId) {
    const { data: commits } = await context.github.pullRequests.getCommits(context.repo({
        number: prId
    }));

    return commits;
}

module.exports = {
    removePrApprovedLabel,
    addPrApprovedLabel,
    getPullrequestBySha,
    getAllCommitsByPR,
    labels
};
