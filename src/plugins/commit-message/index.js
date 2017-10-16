/**
 * @fileoverview Validates that commit messages are formatted according
 * to the guidelines.
 * @author Gyandeep Singh
 */

const TAG_REGEX = /^(?:Breaking|Build|Chore|Docs|Fix|New|Update|Upgrade):/;
const MESSAGE_LENGTH_LIMIT = 72;

/**
 * Apply different checks on the commit message
 * @param {string} message - commit message
 * @returns {boolean} `true` if the commit message is valid
 * @private
 */
function checkCommitMessage(message) {
    return TAG_REGEX.test(message) && message.split(/\r?\n/)[0].length <= MESSAGE_LENGTH_LIMIT;
}

/**
 * If the first commit message is not legal then it adds a comment
 * @param {object} context - context given by the probot
 * @returns {Promise.<void>} promise
 * @private
 */
const processCommitMessage = async (context) => {
    /*
     * We care about the default commit message that will appear when the
     * PR is merged. If the PR has exactly one commit, this is the commit
     * message of that commit. If the PR has more than one commit, this
     * is the title of the PR.
     */
    const { payload, github } = context;
    const allCommits = await github.pullRequests.getCommits(context.issue());
    const messageToCheck = allCommits.data.length === 1
        ? allCommits.data[0].commit.message
        : payload.pull_request.title;
    const isValid = checkCommitMessage(messageToCheck);
    let description;
    let state;

    if (isValid) {
        state = "success";
        description = allCommits.data.length === 1
            ? "Commit message follows guidelines"
            : "PR title follows commit message guidelines";
    } else {
        state = "failure";
        description = allCommits.data.length === 1
            ? "Commit message doesn't follow guidelines"
            : "PR title doesn't follow commit message guidelines";
    }

    // only check first commit message
    return github.repos.createStatus(
        context.repo({
            sha: allCommits.data[allCommits.data.length - 1].sha,
            state,
            target_url: "https://eslint.org/docs/developer-guide/contributing/pull-requests#step-2-make-your-changes",
            description,
            context: "commit-message"
        })
    );
};

/**
 * check commit message
 */
module.exports = (robot) => {
    robot.on("pull_request.opened", processCommitMessage);
    robot.on("pull_request.reopened", processCommitMessage);
    robot.on("pull_request.synchronize", processCommitMessage);
    robot.on("pull_request.edited", processCommitMessage);
};
