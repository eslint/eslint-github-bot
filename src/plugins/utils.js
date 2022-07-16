/**
 * @fileoverview Utilities shared across multiple plugins.
 * @author Kevin Partington
 */

"use strict";

/**
 * Get the correct commit message for a PR
 * @param {Object[]} allCommits A list of commit objects from GitHub's API
 * @param {Object} pr Pull request object
 * @returns {string} Commit message
 */
function getCommitMessageForPR(allCommits, pr) {
    return allCommits.length === 1
        ? allCommits[0].commit.message
        : pr.title;
}

module.exports = {
    getCommitMessageForPR
};
