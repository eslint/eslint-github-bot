/**
 * @fileoverview Create the message that needs to be commented in the Pull Request.
 * @author Aniketh Saha
 */

"use strict";

const MESSAGE_LENGTH_LIMIT = 72;

const ERROR_MESSAGES = {
    SPACE_AFTER_TAG_COLON: "- There should be a space following the initial tag and colon, for example 'New: Message'.",
    NON_UPPERCASE_FIRST_LETTER_TAG: "- The first letter of the tag should be in uppercase",
    NON_MATCHED_TAG: `- The commit message tag must be one of the following:

  The \`Tag\` is one of the following:

  - Fix - for a bug fix.
  - Update - either for a backwards-compatible enhancement or for a rule change that adds reported problems.
  - New - implements a new feature.
  - Breaking - for a backwards-incompatible enhancement or feature.
  - Docs - changes to documentation only.
  - Build - changes to build process only.
  - Upgrade - for a dependency upgrade.
  - Chore - for anything that isn't user-facing (for example, refactoring, adding tests, etc.).

  You can use the [labels of the issue you are working on](https://eslint.org/docs/developer-guide/contributing/working-on-issues#issue-labels) to determine the best tag.
`,
    LONG_MESSAGE: `- The length of the commit message must be less than or equal to ${MESSAGE_LENGTH_LIMIT}`,
    WRONG_REF: `- The issue reference must be formatted as follows:

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
 * Create a comment message body with the error details
 * @param {Array<string>} errors - list of the error codes
 * @param {boolean} isTitle - whether it is for title or the commit message
 * @param {string} username - username of the PR author
 * @returns {string} the message to comment
 * @private
 */
module.exports = function commentMessage(errors = [], isTitle = false, username) {
    const errorMessages = [];

    errors.forEach(err => {
        if (ERROR_MESSAGES[err]) {
            errorMessages.push(ERROR_MESSAGES[err]);
        }
    });

    return `Hi @${username}!, thanks for the Pull Request

The ${isTitle ? "pull request title" : "first commit message"} isn't properly formatted. We ask that you update the message to match this format, as we use it to generate changelogs and automate releases.

${errorMessages.join("\n")}

Read more about contributing to ESLint [here](https://eslint.org/docs/developer-guide/contributing/)
`;

};
