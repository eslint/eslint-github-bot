/**
 * @fileoverview It add a comment on issue when needs info label is added to it.
 * @author Gyandeep Singh
 */

"use strict";

const needInfoLabel = "needs info";

/**
 * Create the comment for the need info
 * @param {string} username - user to tag on the comment
 * @returns {string} comment message
 * @private
 */
function commentMessage(username) {
    return `
Hi @${username}, thanks for the issue. It looks like there's not enough information for us to know how to help you.

If you're reporting a bug, please be sure to include:

1. The version of ESLint you are using (run \`eslint -v\`)
2. Is it a bug or enhancement ?
3. What you did (the source code and ESLint configuration) ?
4. The actual ESLint output complete with numbers
5. What you expected to happen instead ?
6. Are you willing to submit a pull request if this issue is accepted ?

Requesting a new rule? Please see [Proposing a New Rule](http://eslint.org/docs/developer-guide/contributing/new-rules) for instructions.

Requesting a rule change? Please see [Proposing a Rule Change](http://eslint.org/docs/developer-guide/contributing/rule-changes) for instructions.

If it's something else, please just provide as much additional information as possible. Thanks!

[//]: # (needs-info)
`;
}

/**
 * Check if the needs info label is present or not
 * @param {Object} label - added label object
 * @returns {boolean} True if it does contain needs info label
 * @private
 */
function hasNeedInfoLabel(label) {
    return label.name === needInfoLabel;
}

/**
 * If the label is need info then add the comment
 * @param {Object} context - event payload from github
 * @returns {undefined}
 * @private
 */
async function check(context) {
    const { payload, github } = context;

    if (hasNeedInfoLabel(payload.label)) {
        await github.issues.createComment(context.issue({
            body: commentMessage(payload.issue.user.login)
        }));
    }
}

/**
 * If the label is need info then add the comment when issue is labeled
 */

module.exports = robot => {
    robot.on("issues.labeled", check);
};
