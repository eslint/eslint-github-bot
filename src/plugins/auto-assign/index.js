/**
 * @fileoverview Automatically assigns issues to users who have indicated they're willing to submit a PR
 * @author xbinaryx
 */

"use strict";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Context} ProbotContext */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Checks if the issue body contains text indicating the user is willing to submit a PR
 * @param {string} body The issue body text
 * @returns {boolean} True if the user indicated they're willing to submit a PR
 * @private
 */
function isWillingToSubmitPR(body) {
    return body
        .toLowerCase()
        .includes(
            "- [x] I am willing to submit a pull request to implement this change."
        );
}

/**
 * Handler for issue opened event
 * @param {ProbotContext} context probot context object
 * @returns {Promise<void>} promise
 * @private
 */
async function issueOpenedHandler(context) {
    const { payload } = context;

    if (!isWillingToSubmitPR(payload.issue.body)) {
        return;
    }

    await context.octokit.issues.addAssignees(
        context.issue({
            assignees: [payload.issue.user.login],
        })
    );
}

module.exports = (robot) => {
    robot.on("issues.opened", issueOpenedHandler);
};
