/**
 * @fileoverview Adds fail status to all non-semver pr's after release
 * @author Gyandeep Singh
 */

"use strict";

const semver = require("semver");

const TAG_REGEX = /^(?:Build|Chore|Docs|Fix):/;

/**
 * Apply different checks on the commit message to see if its ok for a patch release
 * @param {string} message - commit message
 * @returns {boolean} `true` if the commit message is valid for patch release
 * @private
 */
function isMessageValidForPatchRelease(message) {
    return TAG_REGEX.test(message);
}

/**
 * Get the correct commit message for a PR
 * @param {Object} allCommits - Collection of all commit objects
 * @param {Object} context - context object
 * @returns {string} Commit message
 * @private
 */
function getCommitMessageForPR(allCommits, context) {
    return allCommits.data.length === 1
        ? allCommits.data[0].commit.message
        : context.payload.pull_request.title;
}

/**
 * Check if the version is atleast minor
 * @param {string} version - version to check
 * @returns {boolean} true if its minor version
 * @private
 */
function atLeastMinorVersion(version) {
    return semver.patch(semver.clean(version)) === 0;
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
 * @returns {Array<Object>} collection of release objects
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
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function createStatusOnPR(context, state, sha) {
    return context.github.repos.createStatus(
        context.repo({
            sha,
            state,
            target_url: "",
            description: "semver-patch merge only phase",
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
    return createStatusOnPR(context, "success", sha);
}

/**
 * Create failure status on the PR
 * @param {Object} context - probot context object
 * @param {string} sha - sha for the commit
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
function createFailurePRStatus(context, sha) {
    return createStatusOnPR(context, "failure", sha);
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
 * Get all the commits for a PR
 * @param {Object} context - probot context object
 * @param {boolean} isSuccess - to create a success status
 * @returns {Promise} Resolves when the status is created on the PR
 * @private
 */
async function createStatusOnAllPRs(context, isSuccess) {

    // put error status on every PR which doesn't have fix or docs status.
    const { data: allOpenPrs } = await getAllOpenPRs(context);
    const statusFunc = isSuccess ? createSuccessPRStatus : createFailurePRStatus;

    await Promise.all(allOpenPrs.map(async pr => {
        const allCommits = await getAllCommitForPR(context, pr.number);

        await statusFunc(context, pluckLatestCommitSha(allCommits));
    }));
}

/**
 * Release label is present
 * @param {Array<Object>} labels - collection of label objects
 * @returns {boolean} True if release label is present
 * @private
 */
function hasReleaseLabel(labels) {
    return labels.some(({ name }) => name === "release");
}

/**
 * Handler for release publish event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function releasePublishedHandler(context) {

    // https://developer.github.com/v3/activity/events/types/#releaseevent
    // check if the version is major or minor
    if (context.payload.release.prerelease || !atLeastMinorVersion(context.payload.release.tag_name)) {
        return;
    }

    // add a label on release issue to say we are in the no semver minor merge please
    const { data: allOpenReleaseIssue } = await context.github.issues.getForRepo(context.repo({
        state: "open",
        labels: "release"
    }));

    if (allOpenReleaseIssue.length === 0) {
        return;
    }

    await context.github.issues.addLabels(
        context.issue({
            number: allOpenReleaseIssue[0].number,
            labels: ["post-release"]
        })
    );

    // put error status on every PR which doesn't have fix or docs status.
    await createStatusOnAllPRs(context, false);
}

/**
 * Handler for issue close event
 * @param {Object} context - probot context object
 * @returns {Promise} promise
 * @private
 */
async function issueCloseHandler(context) {

    // check if the closed issue is a release issue
    if (!hasReleaseLabel(context.payload.issue.labels)) {
        return;
    }

    // remove all the error status from any pr out their
    await createStatusOnAllPRs(context, true);
}

/**
 * Handler for release publish event
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
    const { data: releaseIssue } = await context.github.search.issues({
        q: "label:release label:post-release",
        sort: "created"
    });

    const allCommits = await context.github.pullRequests.getCommits(context.issue());
    const statusFunc =
        releaseIssue.total_count === 0 || isMessageValidForPatchRelease(getCommitMessageForPR(allCommits, context))
            ? createSuccessPRStatus
            : createFailurePRStatus;

    await statusFunc(context, pluckLatestCommitSha(allCommits));
}

module.exports = robot => {
    robot.on("release.published", releasePublishedHandler);
    robot.on("issues.closed", issueCloseHandler);
    robot.on(["pull_request.opened", "pull_request.reopened"], prOpenHandler);
};
