/**
 * @fileoverview Adds fail status to all non-semver pr's after release
 * @author Gyandeep Singh
 */

"use strict";

const COMMIT_MESSAGE_REGEX = /^(?:Build|Chore|Docs|Fix):/;
const POST_RELEASE_LABEL = "post-release";
const RELEASE_LABEL = "release";

/**
 * Apply different checks on the commit message to see if its ok for a patch release
 * @param {string} message - commit message
 * @returns {boolean} `true` if the commit message is valid for patch release
 * @private
 */
function isMessageValidForPatchRelease(message) {
    return COMMIT_MESSAGE_REGEX.test(message);
}

/**
 * Get the correct commit message for a PR
 * @param {Object} allCommits - Collection of all commit objects
 * @param {Object} pr - Pull request object
 * @returns {string} Commit message
 * @private
 */
function getCommitMessageForPR(allCommits, pr) {
    return allCommits.data.length === 1
        ? allCommits.data[0].commit.message
        : pr.title;
}

/**
 * Get the sha value from the latest commit
 * @param {Object} allCommits - all commit data
 * @returns {string} latest commit sha
 * @private
 */
function pluckLatestCommitSha(allCommits) {
    return allCommits.data[allCommits.data.length - 1].sha;
}

/**
 * Gets all the open PR
 * @param {Object} context - context object
 * @returns {Promise} collection of release objects
 * @private
 */
function getAllOpenPRs(context) {
    return context.github.pullRequests.getAll(
        context.issue({
            state: "open"
        })
    );
}

/**
 * Create status on the PR
 * @param {Object} context - probot context object
 * @param {string} state - state can be either success or failure
 * @param {string} sha - sha for the commit
 * @param {string} description - description for the status
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function createStatusOnPR({ context, state, sha, description }) {
    return context.github.repos.createStatus(
        context.repo({
            sha,
            state,
            target_url: "",
            description,
            context: "Release monitor"
        })
    );
}

/**
 * Create success status on the PR
 * @param {Object} context - probot context object
 * @param {string} sha - sha for the commit
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function createSuccessPRStatus(context, sha) {
    return createStatusOnPR({
        context,
        state: "success",
        description: "No patch release is pending",
        sha
    });
}

/**
 * Create pending status on the PR
 * @param {Object} context - probot context object
 * @param {string} sha - sha for the commit
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function createPendingPRStatus(context, sha) {
    return createStatusOnPR({
        context,
        state: "pending",
        description: "A patch release is pending",
        sha
    });
}

/**
 * Get all the commits for a PR
 * @param {Object} context - probot context object
 * @param {string} number - pr number
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function getAllCommitForPR(context, number) {
    return context.github.pullRequests.getCommits(
        context.repo({
            number
        })
    );
}

/**
 * Updates the status on all the provided prs
 * @param {Object} context - probot context object
 * @param {Array<Object>} prs - Collection of prs
 * @param {boolean} isSuccess - to create a success status
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
async function createStatusOnPRs({ context, prs, isSuccess }) {
    const statusFunc = isSuccess ? createSuccessPRStatus : createPendingPRStatus;

    await Promise.all(prs.map(async pr => {
        const allCommits = await getAllCommitForPR(context, pr.number);

        await statusFunc(context, pluckLatestCommitSha(allCommits));
    }));
}

/**
 * Get all the commits for a PR
 * @param {Object} context - probot context object
 * @param {boolean} isSuccess - to create a success status
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
async function createStatusOnAllPRs({ context, isSuccess }) {
    const { data: allOpenPrs } = await getAllOpenPRs(context);

    return createStatusOnPRs({
        context,
        prs: allOpenPrs,
        isSuccess
    });
}

/**
 * Returns collection of all the PRs which do not have fix or docs tag on it
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function getNonSemverPatchPRs(context) {
    const { data: allOpenPrs } = await getAllOpenPRs(context);

    return allOpenPrs.reduce(async(previousPromise, pr) => {
        const coll = await previousPromise;
        const allCommits = await getAllCommitForPR(context, pr.number);

        if (!isMessageValidForPatchRelease(getCommitMessageForPR(allCommits, pr))) {
            coll.push(pr);
        }

        return coll;
    }, Promise.resolve([]));
}

/**
 * Release label is present
 * @param {Array<Object>} labels - collection of label objects
 * @returns {boolean} True if release label is present
 * @private
 */
function hasReleaseLabel(labels) {
    return labels.some(({ name }) => name === RELEASE_LABEL);
}

/**
 * Post Release label is present
 * @param {Array<Object>} labels - collection of label objects
 * @returns {boolean} True if post release label is present
 * @private
 */
function hasPostReleaseLabel(labels) {
    return labels.some(({ name }) => name === POST_RELEASE_LABEL);
}

/**
 * Handler for issue label event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function issueLabeledHandler(context) {

    // check if the label is post-release and the same issue has release label
    if (hasPostReleaseLabel([context.payload.label]) && hasReleaseLabel(context.payload.issue.labels)) {

        // put pending status on every PR which doesn't have fix or docs status.
        await createStatusOnPRs({
            context,
            prs: await getNonSemverPatchPRs(context),
            isSuccess: false
        });
    }
}

/**
 * Handler for issue close event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function issueCloseHandler(context) {

    // check if the closed issue is a release issue
    if (hasReleaseLabel(context.payload.issue.labels)) {

        // remove all the error status from any pr out their
        await createStatusOnAllPRs({
            context,
            isSuccess: true
        });
    }
}

/**
 * Handler for pull request open and reopen event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function prOpenHandler(context) {

    /**
     * check if the release issue has the label for no semver minor merge please
     * false: add success status to pr
     * true: add failure message if its not a fix or doc pr else success
     */
    const { data: releaseIssue } = await context.github.issues.getForRepo(
        context.repo({
            labels: `${RELEASE_LABEL},${POST_RELEASE_LABEL}`
        })
    );

    const allCommits = await context.github.pullRequests.getCommits(context.issue());
    const statusFunc =
        releaseIssue.length === 0 || isMessageValidForPatchRelease(getCommitMessageForPR(allCommits, context.payload.pull_request))
            ? createSuccessPRStatus
            : createPendingPRStatus;

    await statusFunc(context, pluckLatestCommitSha(allCommits));
}

module.exports = robot => {
    robot.on("issues.labeled", issueLabeledHandler);
    robot.on("issues.closed", issueCloseHandler);
    robot.on(
        [
            "pull_request.opened",
            "pull_request.reopened",
            "pull_request.synchronize",
            "pull_request.edited"
        ],
        prOpenHandler
    );
};
