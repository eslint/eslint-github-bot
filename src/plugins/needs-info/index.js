/**
 * @fileoverview It add a comment on issue when needs info label is added to it.
 * @author Gyandeep Singh
 */

"use strict";

const needInfoLabel = "needs info";

/**
 * Create the comment for the need info
 * @returns {string} comment message
 * @private
 */
function commentMessage() {
    return `
It looks like there wasn't enough information for us to know how to help you, so we're closing the issue.

Thanks for your understanding.

[//]: # (needs-info)
`;
}

/**
 * Check if the needs info label is present or not
 * @param {Object} label added label object
 * @returns {boolean} True if it does contain needs info label
 * @private
 */
function hasNeedInfoLabel(label) {
    return label.name === needInfoLabel;
}

/**
 * If the label is need info then add the comment
 * @param {Object} context event payload from github
 * @returns {undefined}
 * @private
 */
async function check(context) {
    const { payload, octokit } = context;

    if (payload.issue.labels.some(hasNeedInfoLabel)) {
        await octokit.issues.createComment(context.issue({
            body: commentMessage()
        }));
    }
}

/**
 * If the label is need info then add the comment when issue is labeled
 */

module.exports = robot => {
    robot.on("issues.closed", check);
};
