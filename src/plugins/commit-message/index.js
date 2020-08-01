/**
 * @fileoverview Validates that commit messages are formatted according
 * to the guidelines.
 * @author Gyandeep Singh
 */

"use strict";

const { getCommitMessageForPR } = require("../utils");

const TAG_REGEX = /^(?:Breaking|Build|Chore|Docs|Fix|New|Update|Upgrade): /;

const TAG_SPACE_REGEX = /^(?:[A-Z][a-z]+: )/;

const POTENTIAL_ISSUE_REF_REGEX = /#\d+/;

const VALID_ISSUE_REF = "(?:(?:fixes|refs) (?:[^/]+[/][^/]+)?#\\d+)";
const CORRECT_ISSUE_REF_REGEX = new RegExp(` \\(${VALID_ISSUE_REF}(?:, ${VALID_ISSUE_REF})*\\)$`);

const MESSAGE_LENGTH_LIMIT = 72;

const EXCLUDED_REPOSITORY_NAMES = new Set([
    "eslint.github.io",
    "tsc-meetings"
]);

const ERR_CODES_MAPS = {
    SPACE_AFTER_TAG_COLON: "- There should be only one whitespace after tag followed by colon i.e `<tag>: `.",
    NON_MATCHED_TAG: `- The commit message tag doesnt match the tags mentioned below

  The \`Tag\` is one of the following:

  - Fix - for a bug fix.
  - Update - either for a backwards-compatible enhancement or for a rule change that adds reported problems.
  - New - implemented a new feature.
  - Breaking - for a backwards-incompatible enhancement or feature.
  - Docs - changes to documentation only.
  - Build - changes to build process only.
  - Upgrade - for a dependency upgrade.
  - Chore - for refactoring, adding tests, etc. (anything that isn't user-facing).

  Use the [labels of the issue you are working](https://eslint.org/docs/developer-guide/contributing/working-on-issues#issue-labels) on to determine the best tag.
`,
    LONG_MESSAGE: `- The lenght of the commit message should be less than or equal to ${MESSAGE_LENGTH_LIMIT}`,
    WRONG_REF: `- The issue reference is not as per the format.

  If the pull request addresses an issue, then the issue number should be mentioned at the end. If the commit doesn't completely fix the issue, then use \`(refs #1234)\` instead of \`(fixes #1234)\`.

  Here are some good commit message summary examples:

  \`\`\`
  Build: Update Travis to only test Node 0.10 (refs #734)
  Fix: Semi rule incorrectly flagging extra semicolon (fixes #840)
  Upgrade: Esprima to 1.2, switch to using comment attachment (fixes #730)
  \`\`\`
`
};


/**
 * Apply different checks on the commit message
 * @param {string} message - commit message
 * @returns {boolean} `true` if the commit message is valid
 * @private
 */
function checkCommitMessage(message) {
    const commitTitle = message.split(/\r?\n/)[0];
    const errCode = [];

    if (message.startsWith("Revert \"")) {
        return [true, []];
    }

    let isValid = true;

    // First, check tag and summary length
    if (!TAG_REGEX.test(commitTitle)) {
        isValid = false;
        errCode.push("NON_MATCHED_TAG");
    }

    // Check if there is any whitespace after the <Tag>:
    if (!TAG_SPACE_REGEX.test(commitTitle)) {
        isValid = false;
        errCode.push("SPACE_AFTER_TAG_COLON");
    }

    if (!(commitTitle.length <= MESSAGE_LENGTH_LIMIT)) {
        isValid = false;
        errCode.push("LONG_MESSAGE");
    }

    // Then, if there appears to be an issue reference, test for correctness
    if (isValid && POTENTIAL_ISSUE_REF_REGEX.test(commitTitle)) {
        const issueSuffixMatch = CORRECT_ISSUE_REF_REGEX.exec(commitTitle);

        // If no suffix, or issue ref occurs before suffix, message is invalid
        if (!issueSuffixMatch || POTENTIAL_ISSUE_REF_REGEX.test(commitTitle.slice(0, issueSuffixMatch.index))) {
            isValid = false;
            errCode.push("WRONG_REF");
        }
    }

    return [isValid, errCode];
}

/**
 * Create a comment message body with the error details
 * @param {Array<string>} errCodes - list of the error codes
 * @param {boolean} isTitle - whether it is for title or the commit message
 * @param {string} username - username of the PR author
 * @returns {string} the message to comment
 * @private
 */
function commentMessage(errCodes = [], isTitle = false, username) {
    const errorMessages = [];

    errCodes.forEach(err => {
        if (ERR_CODES_MAPS[err]) {
            errorMessages.push(ERR_CODES_MAPS[err]);
        }
    });

    return `Hi @${username}!, thanks for the Pull Request

The ${isTitle ? "PR title" : "first commit message"} format is not according to our format.

#### Here are the following errors

${errorMessages.join("\n")}

Read more about contributing to Eslint [here](https://eslint.org/docs/developer-guide/contributing/)
`;

}

/**
 * If the first commit message is not legal then it adds a comment
 * @param {Object} context - context given by the probot
 * @returns {Promise.<void>} promise
 * @private
 */
async function processCommitMessage(context) {

    /*
     * We care about the default commit message that will appear when the
     * PR is merged. If the PR has exactly one commit, this is the commit
     * message of that commit. If the PR has more than one commit, this
     * is the title of the PR.
     */
    const { payload, github } = context;

    if (EXCLUDED_REPOSITORY_NAMES.has(payload.repository.name)) {
        return;
    }

    const allCommits = await github.pullRequests.listCommits(context.issue());
    const messageToCheck = getCommitMessageForPR(allCommits.data, payload.pull_request);
    const [isValid, errCodes] = checkCommitMessage(messageToCheck);
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
    await github.repos.createStatus(
        context.repo({
            sha: allCommits.data[allCommits.data.length - 1].sha,
            state,
            target_url: "https://github.com/eslint/eslint-github-bot/blob/master/docs/commit-message-check.md",
            description,
            context: "commit-message"
        })
    );

    if (state === "failure") {
        await github.issues.createComment(context.issue({
            body: commentMessage(errCodes, allCommits.data.length !== 1, payload.pull_request.user.login)
        }));
    }

}

/**
 * check commit message
 */

module.exports = robot => {
    robot.on("pull_request.opened", processCommitMessage);
    robot.on("pull_request.reopened", processCommitMessage);
    robot.on("pull_request.synchronize", processCommitMessage);
    robot.on("pull_request.edited", processCommitMessage);
};
