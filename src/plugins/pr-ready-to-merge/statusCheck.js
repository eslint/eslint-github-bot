const { labels, getAllCommitsByPR } = require("./common");

/**
 * Gets the combined state of a particular sha commit
 * @param {object} context - context given by the probot
 * @param {string} sha - git sha value
 * @returns {Promise.<string>} value of the state
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
 * Get status for all the sha values
 * @param {object} context - context given by the probot
 * @param {Array<string>} allSha - All sha from a PR
 * @returns {Promise<Array<Promise>>} collection of promises
 */
const getStatusAllSha = (context, allSha) =>
    Promise.all(allSha.map((sha) => getStatusBySha(context, sha)));

/**
 * Get the sha values from all the commit objects
 * @param {Array< object>} commits - all the commits from the PR
 * @returns {Array<string>} sha values
 */
const pluckSha = async (commits) => commits.map((commit) => commit.sha);

/**
 * Check if every status is a success
 * @param {Array<string>} allStatus - collection of status
 * @returns {boolean} true if all are success
 */
const allStatusAreSuccess = (allStatus) =>
    allStatus.every((status) => status === labels.successStatus);

/**
 * Check to see if the PR build status is good or not
 * @param context - context given by the probot
 * @param {int} prId - pull request number
 * @returns {Promise<boolean>} true if its good
 */
const isPrStatusSuccess = (context, prId) =>
    getAllCommitsByPR(context, prId)
        .then(pluckSha)
        .then((shas) => getStatusAllSha(context, shas))
        .then(allStatusAreSuccess);

module.exports = {
    isPrStatusSuccess
};
