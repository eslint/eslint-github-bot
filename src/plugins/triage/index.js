/**
 * @fileoverview It add the triage label to the issues which doesn't have any labels.
 * @author Gyandeep Singh
 */

"use strict";

/**
 * Adds the triage label if the issue has no labels on it
 * @param {Object} payload - event payload from github
 * @param {Object} github - github interface
 * @returns {Promise<void>} A Promise that fulfills when the action is complete
 * @private
 */
async function triage({ payload, github }) {
    if (payload.issue.labels.length === 0) {
        await github.issues.addLabels({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            number: payload.issue.number,
            labels: ["triage"]
        });
    }
}

/**
 * Add triage label when an issue is opened or reopened
 */

module.exports = robot => {
    robot.on("issues.opened", triage);
    robot.on("issues.reopened", triage);
};
