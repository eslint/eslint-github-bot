/**
 * @fileoverview Common git utils for the plugin
 * @author Gyandeep Singh
 */

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
 * @param {object} context - context given by the probot
 * @return {undefined}
 */
const removePrApprovedLabel = (context) =>
    context.github.issues.removeLabel(context.issue({
        name: labels.reviewLabel
    }));

/**
 * Add the approved label to the pull request
 * @param {object} context - context given by the probot
 * @return {undefined}
 */
const addPrApprovedLabel = (context) =>
    context.github.issues.addLabels(context.issue({
        labels: [labels.reviewLabel]
    }));

/**
 * Gets all the pull request based on the sha
 * it will return null if there is no related pr
 * will return the first one if their are multiple entries (which should be rare)
 * @param {object} context - context given by the probot
 * @param {string} sha - git sha value
 * @returns {Promise.<object|null>}
 */
const getPullrequestBySha = async (context, sha) => {
    const { data: { items } } = await context.github.search.issues({
        q: sha
    });

    return items.length === 1 ? items[0] : null;
};

/**
 * Gets all the commits using the PR number
 * @param {object} context - context given by the probot
 * @param {int} prId - pull request number
 * @returns {Promise.<Array>} Resolves with commit collection
 */
const getAllCommitsByPR = async (context, prId) => {
    const { data: commits } = await context.github.pullRequests.getCommits(context.repo({
        number: prId
    }));

    return commits;
};

module.exports = {
    removePrApprovedLabel,
    addPrApprovedLabel,
    getPullrequestBySha,
    getAllCommitsByPR,
    labels
};
