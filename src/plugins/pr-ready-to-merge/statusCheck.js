/**
 * @fileoverview Checks if the status of the latest commit on a PR
 * @author Gyandeep Singh
 */

const { labels, getAllCommitsByPR } = require("./common");

/**
 * Gets the combined state of a particular sha commit
 * @param {object} context - context given by the probot
 * @param {string} sha - git sha value
 * @returns {Promise<string>} value of the state
 */
const getStatusBySha = async (context, sha) => {
    const { data: { state, statuses } } = await context.github.repos.getCombinedStatus(
        context.repo({
            ref: sha
        })
    );

    return statuses.length > 0 ? state : labels.successStatus;
};

/**
 * Get the sha values from the commit objects
 * @param {object} commit - Commit
 * @returns {Promise<string>} sha values
 * @private
 */
const pluckSha = async (commit) => commit.sha;

/**
 * Get the latest commit
 * @param {Array<object>} commits - all the Commit
 * @returns {Promise<Object>} latest commit object
 * @private
 */
const getLatestCommit = async (commits) => commits.pop();

/**
 * Check if status is a success
 * @param {string} status - Status of a commit
 * @returns {boolean} true if it is success
 * @private
 */
const isStatusSuccess = (status) => status === labels.successStatus;

/**
 * Check to see if the PR build status is good or not
 * @param context - context given by the probot
 * @param {int} prId - pull request number
 * @returns {Promise<boolean>} true if its good
 */
const isPrStatusSuccess = (context, prId) =>
    getAllCommitsByPR(context, prId)
        .then(getLatestCommit)
        .then(pluckSha)
        .then((shas) => getStatusBySha(context, shas))
        .then(isStatusSuccess);

module.exports = {
    isPrStatusSuccess
};
