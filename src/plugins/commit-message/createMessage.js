/**
 * @fileoverview Create the message that needs to be commented in the Pull Request.
 * @author Aniketh Saha
 */

"use strict";

const MESSAGE_LENGTH_LIMIT = 72;

const ERROR_MESSAGES = {
    SPACE_AFTER_TAG_COLON: "- There should be a space following the initial tag and colon, for example 'feat: Message'.",
    NON_LOWERCASE_FIRST_LETTER_TAG: "- The first letter of the tag should be in lowercase",
    NON_MATCHED_TAG: "- The commit message tag wasn't recognized. Did you mean \"docs\", \"fix\", or \"feat\"?",
    LONG_MESSAGE: `- The length of the commit message must be less than or equal to ${MESSAGE_LENGTH_LIMIT}`
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

The **${isTitle ? "pull request title" : "first commit message"}** isn't properly formatted. We ask that you update the message to match this format, as we use it to generate changelogs and automate releases.

${errorMessages.join("\n")}

**To Fix:** You can fix this problem by ${isTitle ? "clicking 'Edit' next to the pull request title at the top of this page." : "running `git commit --amend`, editing your commit message, and then running `git push -f` to update this pull request."}

Read more about contributing to ESLint [here](https://eslint.org/docs/developer-guide/contributing/)
`;

};
