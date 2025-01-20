/**
 * @fileoverview Handle PR status for works in progress, using either "WIP" in title or "do not merge" label
 * @author Kevin Partington
 */

"use strict";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Context} ProbotContext */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const WIP_IN_TITLE_REGEX = /^WIP:|\(WIP\)/iu;
const DO_NOT_MERGE_LABEL = "do not merge";

/**
 * Create status on the PR
 * @param {Object} options Configure the status
 * @param {ProbotContext} options.context probot context object
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
            context: "wip"
        })
    );
}

/**
 * Creates a pending status on the PR to indicate it is a WIP.
 * @param {ProbotContext} context Probot context object
 * @param {string} sha The SHA hash representing the latest commit to the PR.
 * @returns {Promise<void>} A Promise that will fulfill when the status check is created
 */
function createPendingWipStatusOnPR(context, sha) {
    return createStatusOnPR({
        context,
        sha,
        state: "pending",
        description: "This PR appears to be a work in progress"
    });
}

/**
 * Creates a pending status on the PR to indicate it is WIP.
 * @param {ProbotContext} context Probot context object
 * @param {string} sha The SHA hash representing the latest commit to the PR.
 * @returns {Promise<void>} A Promise that will fulfill when the status check is created
 */
function createSuccessWipStatusOnPR(context, sha) {
    return createStatusOnPR({
        context,
        sha,
        state: "success",
        description: "This PR is no longer a work in progress"
    });
}

/**
 * Check to see if there is an existing pending wip status check on the PR.
 * If so, create a success wip status check.
 * @param {ProbotContext} context Probot context object
 * @param {string} sha Commit SHA hash associated with the status check
 * @returns {Promise<void>} A Promise which will resolve when a success status check
 * is created on the PR, or an immediately-resolved Promise if no status check
 * is needed.
 */
async function maybeResolveWipStatusOnPR(context, sha) {
    const repoAndRef = context.repo({
        ref: sha
    });

    const { octokit } = context;
    const statuses = await octokit.paginate(octokit.repos.getCombinedStatusForRef, repoAndRef);
    const statusCheckExists = statuses.some(status => status.context === "wip");

    if (statusCheckExists) {
        return createSuccessWipStatusOnPR(context, sha);
    }

    return null;
}

/**
 * Get all the commits for a PR
 * @param {Object} options Configure the request
 * @param {ProbotContext} options.context Probot context object
 * @param {Object} options.pr pull request object from GitHub's API
 * @returns {Promise<Object[]>} A Promise that fulfills with a list of commit objects from GitHub's API
 * @private
 */
async function getAllCommitsForPR({ context, pr }) {
    const { data: commitList } = await context.octokit.pulls.listCommits(
        context.repo({ pull_number: pr.number })
    );

    return commitList;
}

/**
 * Checks to see if a PR has the "do not merge" label.
 * @param {Array<Object>} labels collection of label objects
 * @returns {boolean} True if release label is present
 * @private
 */
function hasDoNotMergeLabel(labels) {
    return labels.some(({ name }) => name === DO_NOT_MERGE_LABEL);
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
 * Checks to see if a PR's title has a WIP indication.
 * @param {Object} pr Pull request object
 * @returns {boolean} True if the PR title indicates WIP
 * @private
 */
function prHasWipTitle(pr) {
    return WIP_IN_TITLE_REGEX.test(pr.title);
}

/**
 * Handler for PR events (opened, reopened, synchronize, edited, labeled,
 * unlabeled).
 * @param {ProbotContext} context probot context object
 * @returns {Promise<void>} promise
 * @private
 */
async function prChangedHandler(context) {
    const pr = context.payload.pull_request;

    const allCommits = await getAllCommitsForPR({
        context,
        pr
    });

    const sha = pluckLatestCommitSha(allCommits);

    const isWip = prHasWipTitle(pr) || hasDoNotMergeLabel(pr.labels);

    if (isWip) {
        return createPendingWipStatusOnPR(context, sha);
    }

    return maybeResolveWipStatusOnPR(context, sha);
}

//-----------------------------------------------------------------------------
// Robot
//-----------------------------------------------------------------------------

module.exports = robot => {
    robot.on(
        [
            "pull_request.opened",
            "pull_request.reopened",
            "pull_request.edited",
            "pull_request.labeled",
            "pull_request.unlabeled",
            "pull_request.synchronize"
        ],
        prChangedHandler
    );
};
