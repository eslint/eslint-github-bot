/**
 * @fileoverview It add the triage label to the issues which doesn't have any labels.
 * @author Gyandeep Singh
 */

"use strict";

/**
 * Adds the triage label if the issue has no labels on it
 * @param {Context} context Probot webhook event context
 * @returns {Promise<void>} A Promise that fulfills when the action is complete
 * @private
 */
async function triage(context) {
    if (context.payload.issue.labels.length === 0) {

        /*
         * Fetch the issue again to double-check that it has no labels.
         * Sometimes, when an issue is opened with labels, the initial
         * webhook event contains no labels.
         * https://github.com/eslint/eslint-github-bot/issues/38
         */
        const issue = await context.github.issues.get(context.issue()).then(res => res.data);

        if (issue.labels.length === 0) {
            await context.github.issues.addLabels(context.issue({ labels: ["triage"] }));
        }
    }
}

/**
 * Add triage label when an issue is opened or reopened
 */

module.exports = robot => {
    robot.on("issues.opened", triage);
    robot.on("issues.reopened", triage);
    robot.on("pull_request.opened", triage);
    robot.on("pull_request.reopened", triage);
};
