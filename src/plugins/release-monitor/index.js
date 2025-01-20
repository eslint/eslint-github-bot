/**
 * @fileoverview Handle PR status after the release and when the release is complete
 * @author Gyandeep Singh
 */

"use strict";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Context} ProbotContext */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const PATCH_COMMIT_MESSAGE_REGEX = /^(?:Build|Chore|Docs|Fix|Upgrade):/u;
const POST_RELEASE_LABEL = "patch release pending";
const RELEASE_LABEL = "release";

/**
 * Apply different checks on the commit message to see if its ok for a patch release
 * @param {string} message commit message
 * @returns {boolean} `true` if the commit message is valid for patch release
 * @private
 */
function isMessageValidForPatchRelease(message) {
    return PATCH_COMMIT_MESSAGE_REGEX.test(message);
}

/**
 * Get the sha value from the latest commit
 * @param {Object[]} allCommits A list of commit objects from GitHub's API
 * @returns {string} latest commit sha
 * @private
 */
function pluckLatestCommitSha(allCommits) {
    return allCommits.at(-1).sha;
}

/**
 * Gets all the open PR
 * @param {ProbotContext} context context object
 * @returns {Promise<any>} collection of pr objects
 * @private
 */
function getAllOpenPRs(context) {
    return context.octokit.paginate(
        context.octokit.pulls.list,
        context.repo({
            state: "open"
        })
    );
}

/**
 * Create status on the PR
 * @param {Object} options Configure the status
 * @param {Object} options.context probot context object
 * @param {string} options.state state can be either success or failure
 * @param {string} options.sha sha for the commit
 * @param {string} options.description description for the status
 * @param {string} options.targetUrl The URL that the status should link to
 * @returns {Promise<void>} Resolves when the status is created on the PR
 * @private
 */
function createStatusOnPR({ context, state, sha, description, targetUrl }) {
    return context.octokit.repos.createCommitStatus(
        context.repo({
            sha,
            state,
            target_url: targetUrl || "",
            description,
            context: "release-monitor"
        })
    );
}

/**
 * Get all the commits for a PR
 * @param {Object} options Configure the request
 * @param {Object} options.context Probot context object
 * @param {Object} options.pr pull request object from GitHub's API
 * @returns {Promise<Object[]>} A Promise that fulfills with a list of commit objects from GitHub's API
 * @private
 */
async function getAllCommitsForPR({ context, pr }) {
    const commits = await context.octokit.pulls.listCommits(
        context.repo({ pull_number: pr.number })
    );

    return commits.data;
}

/**
 * Creates an appropriate status on a PR, based on the current patch release state and the PR type.
 * * If there is no pending patch release, creates a success status with the message "No patch release is pending".
 * * If there is a pending patch release and this PR is semver-patch, creates a success status with the message
 * "This change is semver-patch" and a link to the release issue.
 * * If there is a pending patch release and this PR is not semver-patch, creates a pending status with the message
 * "A patch release is pending" and a link to the release issue.
 * @param {Object} options Configure the status
 * @param {Object} options.context Probot context object
 * @param {Object} options.pr pull request object from GitHub's API
 * @param {string|null} options.pendingReleaseIssueUrl If a patch release is pending, this is the HTML URL of the
 * release issue. Otherwise, this is null.
 * @returns {Promise<void>} A Promise that fulfills when the status check has been created
 */
async function createAppropriateStatusForPR({ context, pr, pendingReleaseIssueUrl }) {
    const allCommits = await getAllCommitsForPR({ context, pr });
    const sha = pluckLatestCommitSha(allCommits);

    if (pendingReleaseIssueUrl === null) {
        await createStatusOnPR({
            context,
            sha,
            state: "success",
            description: "No patch release is pending"
        });
    } else if (isMessageValidForPatchRelease(pr.title)) {
        await createStatusOnPR({
            context,
            sha,
            state: "success",
            description: "This change is semver-patch",
            targetUrl: pendingReleaseIssueUrl
        });
    } else {
        await createStatusOnPR({
            context,
            sha,
            state: "pending",
            description: "A patch release is pending",
            targetUrl: pendingReleaseIssueUrl
        });
    }
}

/**
 * Get all the commits for a PR
 * @param {Object} options Configure the status
 * @param {Object} options.context probot context object
 * @param {string|null} options.pendingReleaseIssueUrl A link to the pending release issue, if it exists
 * @returns {Promise<void>} Resolves when the status is created on the PR
 * @private
 */
async function createStatusOnAllPRs({ context, pendingReleaseIssueUrl }) {
    const allOpenPrs = await getAllOpenPRs(context);

    return Promise.all(allOpenPrs.map(pr =>
        createAppropriateStatusForPR({
            context,
            pr,
            pendingReleaseIssueUrl
        })));
}

/**
 * Release label is present
 * @param {Array<Object>} labels collection of label objects
 * @returns {boolean} True if release label is present
 * @private
 */
function hasReleaseLabel(labels) {
    return labels.some(({ name }) => name === RELEASE_LABEL);
}

/**
 * Check if it is Post Release label
 * @param {Object} label label options
 * @param {string} label.name label name
 * @returns {boolean} True if its post release label
 * @private
 */
function isPostReleaseLabel({ name }) {
    return name === POST_RELEASE_LABEL;
}

/**
 * Handler for issue label event
 * @param {ProbotContext} context probot context object
 * @returns {Promise<void>} promise
 * @private
 */
async function issueLabeledHandler(context) {

    // check if the label is post-release and the same issue has release label
    if (isPostReleaseLabel(context.payload.label) && hasReleaseLabel(context.payload.issue.labels)) {
        await createStatusOnAllPRs({
            context,
            pendingReleaseIssueUrl: context.payload.issue.html_url
        });
    }
}

/**
 * Handler for issue close event
 * @param {ProbotContext} context probot context object
 * @returns {Promise<void>} promise
 * @private
 */
async function issueCloseHandler(context) {

    // check if the closed issue is a release issue
    if (hasReleaseLabel(context.payload.issue.labels)) {
        await createStatusOnAllPRs({
            context,
            pendingReleaseIssueUrl: null
        });
    }
}

/**
 * Handler for pull request open and reopen event
 * @param {ProbotContext} context probot context object
 * @returns {Promise<void>} promise
 * @private
 */
async function prOpenHandler(context) {

    /**
     * check if the release issue has the label for no semver minor merge please
     * false: add success status to pr
     * true: add failure message if its not a fix or doc pr else success
     */
    const { data: releaseIssues } = await context.octokit.issues.listForRepo(
        context.repo({
            labels: `${RELEASE_LABEL},${POST_RELEASE_LABEL}`
        })
    );

    await createAppropriateStatusForPR({
        context,
        pr: context.payload.pull_request,
        pendingReleaseIssueUrl: releaseIssues.length ? releaseIssues[0].html_url : null
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
