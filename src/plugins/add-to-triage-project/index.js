/**
 * @fileoverview Adds a newly opened issue to the Triage project
 * @author Nicholas C. Zakas
 */

"use strict";

const { NEEDS_TRIAGE_COLUMN_ID } = require("../../constants");

/**
 * Adds the issue to the triage project.
 * @param {Context} context Probot webhook event context
 * @returns {Promise<void>} A Promise that fulfills when the action is complete
 * @private
 */
async function triage(context) {

    const issue = context.payload.issue;

    await context.github.projects.createCard({
        column_id: NEEDS_TRIAGE_COLUMN_ID,
        content_id: issue.id,
        content_type: "Issue"
    });
}

module.exports = robot => {
    robot.on("issues.opened", triage);
};
