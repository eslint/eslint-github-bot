"use strict";

const createScheduler = require("probot-scheduler");
const moment = require("moment");

const SEARCH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ARCHIVAL_AGE_DAYS = 180;
const ARCHIVED_LABEL = "archived due to age";

/**
 * Checks whether the current repository has a `ARCHIVED_LABEL` label
 * @param {probot.Context} context Probot context for the current repository
 * @returns {Promise<boolean>} `true` if the repository has a label with appropriate name
 */
async function hasArchivedLabel(context) {
    const allLabels = await context.github.paginate(
        context.github.issues.getLabels(context.repo()),
        res => res.data
    );

    return allLabels.some(label => label.name === ARCHIVED_LABEL);
}


/**
 * Creates a search query to look for issuesin a given repo which have been closed for at least
 * `ARCHIVAL_AGE_DAYS` days since the current date, and have not yet been archived.
 * @param {string} options.owner The owner of the repo where issues should be searched
 * @param {string} options.repo The name of the repo where issues should be searched
 * @returns {string} A search query to send to the GitHub API
 */
function createSearchQuery({ owner, repo }) {
    const earliestDayWithinArchivalAge = moment().subtract({ days: ARCHIVAL_AGE_DAYS });

    return [
        "is:closed",
        `repo:${owner}/${repo}`,
        `-label:"${ARCHIVED_LABEL}"`,
        `closed:<${earliestDayWithinArchivalAge.format("YYYY-MM-DD")}`
    ].join(" ");
}

/**
 * Locks an issue and adds the `ARCHIVED_LABEL` label.
 * @param {probot.Context} context Probot context for the current repository
 * @param {number} issueNum The issue number on the current repository
 * @returns {Promise<void>} A Promise that fulfills when the issue has been archived
 */
async function archiveIssue(context, issueNum) {
    await Promise.all([
        context.github.issues.lock(context.repo({ number: issueNum })),
        context.github.issues.addLabels(context.repo({ number: issueNum, labels: [ARCHIVED_LABEL] }))
    ]);
}

/**
 * Gets all archived issues on the current repository
 * @param {probot.Context} context Probot context for the current repository
 * @param {string} searchQuery A search query to send to the GitHub API
 * @returns {Promise<number[]>} A list of issue numbers that match the query
 */
async function getAllSearchResults(context) {
    const searchQuery = createSearchQuery(context.repo());

    return context.github.paginate(
        context.github.search.issues({ q: searchQuery, per_page: 100 }),
        result => result.data.items.map(item => item.number)
    );
}

/**
 * Archives all closed issues and pull requests on a repository which have been closed for at least
 * `ARCHIVAL_AGE_DAYS` days. An issue is "archived" by locking it and adding the `ARCHIVED_LABEL` label.
 * @param {probot.Context} context Probot context for the current repository
 * @returns {Promise<void>} A Promise that fulfills when the search is complete
 */
async function archiveOldIssues(context) {
    if (!await hasArchivedLabel(context)) {
        return;
    }

    const issueNumbersToArchive = await getAllSearchResults(context);

    await Promise.all(issueNumbersToArchive.map(issueNum => archiveIssue(context, issueNum)));
}

module.exports = robot => {
    createScheduler(robot, { interval: SEARCH_INTERVAL_MS, delay: false });

    robot.on("schedule.repository", archiveOldIssues);
};
