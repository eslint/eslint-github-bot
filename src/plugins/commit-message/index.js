const TAG_REGEX = /^(?:Breaking|Build|Chore|Docs|Fix|New|Update|Upgrade):/;

/**
 * Create the comment for the commit message issue
 * @param {string} username - user to tag on the comment
 * @returns {string} comment message
 * @private
 */
const commentMessage = (username) => `
**:tada: Thanks for contributing to <project name> :tada:**

@${username} Please fix the following issues :poop: : 
* Please update your first commit message :pencil2: to follow our commit message guidelines.

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
 * If the first commit message is not legal then it adds a comment
 * @param {object} context - context given by the probot
 * @returns {Promise.<void>} promise
 * @private
 */
const processCommitMessage = async (context) => {
    const { payload, github } = context;

    try {
        const allCommits = await github.pullRequests.getCommits(context.issue());

        // only check first commit message only
        if (!isCommitMessageLegal(allCommits.data[0].commit.message)) {
            github.issues.createComment(context.issue({
                body: commentMessage(payload.sender.login)
            }));
        }
    } catch (e) {
        console.error(e);
    }
};

/**
 * Add triage label when an issue is opened or reopened
 */
module.exports = (robot) => {
    robot.on("pull_request.opened", processCommitMessage);
    robot.on("pull_request.reopened", processCommitMessage);
    robot.on("pull_request.synchronize", processCommitMessage);
};
