/**
 * @fileoverview Handle PR status after the release and when the release is complete
 * @author Gyandeep Singh
 */

"use strict";

const PATCH_COMMIT_MESSAGE_REGEX = /^(?:Build|Chore|Docs|Fix):/;
const POST_RELEASE_LABEL = "post-release";
const RELEASE_LABEL = "release";

/**
 * Apply different checks on the commit message to see if its ok for a patch release
 * @param {string} message - commit message
 * @returns {boolean} `true` if the commit message is valid for patch release
 * @private
 */
function isMessageValidForPatchRelease(message) {
    return PATCH_COMMIT_MESSAGE_REGEX.test(message);
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
 * @returns {Promise} collection of pr objects
 * @private
 */
function getAllOpenPRs(context) {
    return context.github.pullRequests.getAll(
        context.repo({
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
            context: "release-monitor"
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
function createSuccessPRStatus({ context, sha, description = "No patch release is pending" }) {
    return createStatusOnPR({
        context,
        state: "success",
        description,
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
function createPendingPRStatus({ context, sha }) {
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
 * @returns {Promise} Resolves when the all PR objects are retrieved
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
 * @returns {Promise} Resolves when the status is created on the PRs
 * @private
 */
async function createStatusOnPRs({ context, prs, isSuccess }) {
    const statusFunc = isSuccess ? createSuccessPRStatus : createPendingPRStatus;

    await Promise.all(prs.map(async pr => {
        const allCommits = await getAllCommitForPR(context, pr.number);

        await statusFunc({
            context,
            sha: pluckLatestCommitSha(allCommits)
        });
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
 * Returns collection of all the PRs which are not semver-patch
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function getNonSemverPatchPRs(context) {
    const { data: allOpenPrs } = await getAllOpenPRs(context);

    return Promise.all(
        allOpenPrs.map(async pr => {
            const allCommits = await getAllCommitForPR(context, pr.number);

            if (!isMessageValidForPatchRelease(getCommitMessageForPR(allCommits, pr))) {
                return pr;
            }

            return null;
        })
    )
        .then(results => results.filter(result => result !== null));
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
 * Check if it is Post Release label
 * @param {Object} label - label object
 * @returns {boolean} True if its post release label
 * @private
 */
function isPostReleaseLabel({ name }) {
    return name === POST_RELEASE_LABEL;
}

/**
 * Handler for issue label event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function issueLabeledHandler(context) {

    // check if the label is post-release and the same issue has release label
    if (isPostReleaseLabel(context.payload.label) && hasReleaseLabel(context.payload.issue.labels)) {

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

        // remove pending status and add success status on all PRs
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
    const isSemverPatchPr = isMessageValidForPatchRelease(getCommitMessageForPR(allCommits, context.payload.pull_request));
    const statusFunc =
        releaseIssue.length === 0 || isSemverPatchPr
            ? createSuccessPRStatus
            : createPendingPRStatus;

    await statusFunc({
        context,
        sha: pluckLatestCommitSha(allCommits),
        description: isSemverPatchPr ? "This change is semver-patch" : void 0
    });
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
