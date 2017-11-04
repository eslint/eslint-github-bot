/**
 * @fileoverview Creates a new issue with the "release" label if the old one is closed
 * @author Teddy Katz
 */

"use strict";

const moment = require("moment");

const LABEL_NAME = "release";

const ISSUE_TITLE_FORMAT = "[Scheduled release for ]MMMM Do, YYYY";

/**
 * Gets the desired issue body for a release issue, given the date of the release.
 * @param {Moment} releaseDate The date of the release, as Moment UTC date
 * @returns {string} The text of the issue
 */
function getIssueBody(releaseDate) {
    return `

The scheduled release on ${releaseDate.format("dddd, MMMM Do, YYYY")} is assigned to:

* (needs volunteers)
* (needs volunteers)

Please use this issue to document how the release went, any problems during the release, and anything the team might want to know about the release process. This issue should be closed after all patch releases have been completed (or there was no patch release needed).

Resources:

* [Release guidelines](https://eslint.org/docs/maintainer-guide/releases)

`.trim();
}

/**
 * A function that determines whether an issue on GitHub was closed multiple times in the past.
 * @param {GitHub} github A GitHub API client
 * @param {Object} issueInfo information about the issue
 * @param {string} issueInfo.owner The owner of the repository
 * @param {string} issueInfo.repo The repo name
 * @param {number} issueInfo.number The issue number on GitHub
 * @returns {Promise<void>} A Promise when the action is complete
 */
async function issueWasClosedMultipleTimes(github, { owner, repo, number }) {
    const issueEvents = await github.issues.getEvents({
        owner,
        repo,
        issue_number: number,
        per_page: 100
    }).then(res => res.data);

    return issueEvents.filter(eventObj => eventObj.event === "closed").length > 1;
}

/**
 * A listener for when an issue gets closed
 * @param {probot.Context} context webhook event context
 * @returns {Promise<void>} A Promise when the action is complete
 */
async function handleIssueClosed(context) {

    // If the issue does not have the "release" label, skip it.
    if (!context.payload.issue.labels.some(label => label.name === LABEL_NAME)) {
        return;
    }

    // If the issue was previously closed and then reopened, skip it.
    if (await issueWasClosedMultipleTimes(context.github, context.issue())) {
        return;
    }

    const oldReleaseDate = moment.utc(context.payload.issue.title, ISSUE_TITLE_FORMAT, true);

    // If the issue title can't be parsed as a date, skip it.
    if (!oldReleaseDate.isValid()) {
        return;
    }

    const newReleaseDate = oldReleaseDate.clone().add({ weeks: 2 });

    const newIssueTitle = newReleaseDate.format(ISSUE_TITLE_FORMAT);
    const newIssueBody = getIssueBody(newReleaseDate);

    // Create a new issue with a date 2 weeks in the future.
    await context.github.issues.create(
        context.repo({
            title: newIssueTitle,
            body: newIssueBody,
            labels: [LABEL_NAME, "tsc agenda"]
        })
    );
}

module.exports = robot => {
    robot.on("issues.closed", handleIssueClosed);
};
