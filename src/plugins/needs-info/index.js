/**
 * @fileoverview It add a comment on issue when needs info label is added to it.
 * @author Gyandeep Singh
 */

const needInfoLabel = "needs info";

/**
 * Create the comment for the need info
 * @param {string} username - user to tag on the comment
 * @returns {string} comment message
 * @private
 */
const commentMessage = (username) => `
Hi @${username}, thanks for the issue. It looks like there's not enough information for us to know how to help you.

If you're reporting a bug, please be sure to include:

1. The version of ESLint you are using (run \`eslint -v\`)
2. What you did (the source code and ESLint configuration)
3. The actual ESLint output complete with numbers
4. What you expected to happen instead

Requesting a new rule? Please see [Proposing a New Rule](http://eslint.org/docs/developer-guide/contributing/new-rules) for instructions.

Requesting a rule change? Please see [Proposing a Rule Change](http://eslint.org/docs/developer-guide/contributing/rule-changes) for instructions.

If it's something else, please just provide as much additional information as possible. Thanks!

[//]: # (needs-info)
`;

/**
 * Check if the needs info label is present or not
 * @param {Array<Object>} labels - collection of labels on the issue
 * @returns {boolean} True if it does contain needs info label
 * @private
 */
const hasNeedInfoLabel = (labels) =>
    labels.some((label) => label.name === needInfoLabel);

/**
 * If the label is need info then add the comment
 * @param {object} payload - event payload from github
 * @param {object} github - github interface
 * @returns {undefined}
 * @private
 */
const check = async (context) => {
    const { payload, github } = context;

    if (hasNeedInfoLabel(payload.issue.labels)) {
        await github.issues.createComment(context.issue({
            body: commentMessage(payload.issue.user.login)
        }));
    }
};

/**
 * If the label is need info then add the comment when issue is labeled
 */
module.exports = (robot) => {
    robot.on("issues.labeled", check);
};
