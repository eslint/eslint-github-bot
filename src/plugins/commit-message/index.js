/**
 * @fileoverview  It checks the first commit message on PR and
 * make sure it is formatted according to the guidelines. If not then it leaves a message on the PR.
 * @author Gyandeep Singh
 */

const TAG_REGEX = /^(?:Breaking|Build|Chore|Docs|Fix|New|Update|Upgrade):/;
const commitMessageIssue = "* The commit summary needs to begin with a tag (such as `Fix:` or `Update:`). Please check out our [guide](http://eslint.org/docs/developer-guide/contributing/pull-requests#step-2-make-your-changes) for how to properly format your commit summary and [update](http://eslint.org/docs/developer-guide/contributing/pull-requests#updating-the-commit-message) it on this pull request.";
const commitLengthIssue = "* The commit summary must be 72 characters or shorter. Please check out our [guide](http://eslint.org/docs/developer-guide/contributing/pull-requests#step-2-make-your-changes) for how to properly format your commit summary and [update](http://eslint.org/docs/developer-guide/contributing/pull-requests#updating-the-commit-message) it on this pull request.";
const messageLengthLimit = 72;

/**
 * Create the comment for the commit message issue
 * @param {string} username - user to tag on the comment
 * @param {Array<string>} messageIssues - collection of issue messages
 * @returns {string} comment message
 * @private
 */
const commentMessage = (username, messageIssues) => `
Thanks for the pull request, @${username}! I took a look to make sure it's ready for merging and found some changes are needed:

${messageIssues.join("\n")}

Can you please update the pull request to address these?
(More information can be found in our [pull request guide](http://eslint.org/docs/developer-guide/contributing/pull-requests).)

[//]: # (commit-message)
`;

/**
 * Check if the commit message follow the guidelines
 * @param {string} message - commit message
 * @returns {boolean} True if its ok
 * @private
 */
const isCommitMessageLegal = (message) => TAG_REGEX.test(message);

/**
 * Check if the commit message length is correct
 * @param {string} message - commit message
 * @returns {boolean} True if its ok
 * @private
 */
const isCommitMessageLengthLegal = (message) => message.length <= messageLengthLimit;

/**
 * Apply different checks on the commit message
 * @param {string} message - commit message
 * @returns {Array<string>} Collection of issue messages
 * @private
 */
const checkCommitMessage = (message) => {
    const issueMessages = [];

    if (!isCommitMessageLegal(message)) {
        issueMessages.push(commitMessageIssue);
    }

    if (!isCommitMessageLengthLegal(message)) {
        issueMessages.push(commitLengthIssue);
    }

    return issueMessages;
};


/**
 * If the first commit message is not legal then it adds a comment
 * @param {object} context - context given by the probot
 * @returns {Promise.<void>} promise
 * @private
 */
const processCommitMessage = async (context) => {
    const { payload, github } = context;
    const allCommits = await github.pullRequests.getCommits(context.issue());
    const messageIssues = checkCommitMessage(allCommits.data[0].commit.message);

    // only check first commit message
    if (messageIssues.length > 0) {
        github.issues.createComment(context.issue({
            body: commentMessage(payload.sender.login, messageIssues)
        }));
    }
};

/**
 * check commit message
 */
module.exports = (robot) => {
    robot.on("pull_request.opened", processCommitMessage);
    robot.on("pull_request.reopened", processCommitMessage);
    robot.on("pull_request.synchronize", processCommitMessage);
};
