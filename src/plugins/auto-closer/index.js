/**
 * Auto-closes issues in GitHub repos.
 * @author Nicholas C. Zakas
 */
"use strict";

const createScheduler = require("probot-scheduler");
const moment = require("moment");

const SEARCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACCEPTED_AUTO_CLOSE_DAYS = 90;
const ACTIVITY_AUTO_CLOSE_DAYS = 30;
const AUTO_CLOSE_LABEL = "auto closed";


/**
 * Checks whether the current repository has a `AUTO_CLOSE_LABEL` label
 * @param {probot.Context} context Probot context for the current repository
 * @returns {Promise<boolean>} `true` if the repository has a label with appropriate name
 */
async function hasAutoCloseLabel(context) {
    const allLabels = await context.github.paginate(
        context.github.issues.listLabelsForRepo(context.repo()),
        res => res.data
    );

    return allLabels.some(label => label.name === AUTO_CLOSE_LABEL);
}


/**
 * Creates a search query to look for issues in a given repo that have been
 * labeled "accepted", don't have an assignee/project/milestone, have been opened
 * for 90 days and have been inactive for 30 days.
 * @param {string} options.owner The owner of the repo where issues should be searched
 * @param {string} options.repo The name of the repo where issues should be searched
 * @returns {string} A search query to send to the GitHub API
 */
function createAutoCloseAcceptedSearchQuery({ owner, repo }) {
    const creationCutoffDate = moment().subtract({ days: ACCEPTED_AUTO_CLOSE_DAYS });
    const activityCutoffDate = moment().subtract({ days: ACTIVITY_AUTO_CLOSE_DAYS });

    return [
        "is:open is:issue",
        `repo:${owner}/${repo}`,
        "no:assignee no:milestone no:project label:accepted",
        `created:<${creationCutoffDate.format("YYYY-MM-DD")}`,
        `updated:<${activityCutoffDate.format("YYYY-MM-DD")}`
    ].join(" ");
}

/**
 * Creates a search query to look for issues in a given repo that have not been
 * labeled "accepted", don't have an assignee/project/milestone, have been
 * inactive for 30 days.
 * @param {string} options.owner The owner of the repo where issues should be searched
 * @param {string} options.repo The name of the repo where issues should be searched
 * @returns {string} A search query to send to the GitHub API
 */
function createAutoCloseUnacceptedSearchQuery({ owner, repo }) {
    const activityCutoffDate = moment().subtract({ days: ACTIVITY_AUTO_CLOSE_DAYS });

    return [
        "is:open is:issue",
        `repo:${owner}/${repo}`,
        "no:assignee no:milestone no:project -label:accepted -label:question",
        `updated:<${activityCutoffDate.format("YYYY-MM-DD")}`
    ].join(" ");
}

/**
 * Creates a search query to look for issues in a given repo that have not been
 * labeled "accepted", don't have an assignee/project/milestone, have been
 * inactive for 30 days, and are labeled "question".
 * @param {string} options.owner The owner of the repo where issues should be searched
 * @param {string} options.repo The name of the repo where issues should be searched
 * @returns {string} A search query to send to the GitHub API
 */
function createAutoCloseQuestionSearchQuery({ owner, repo }) {
    const activityCutoffDate = moment().subtract({ days: ACTIVITY_AUTO_CLOSE_DAYS });

    return [
        "is:open is:issue",
        `repo:${owner}/${repo}`,
        "no:assignee no:milestone no:project -label:accepted label:question",
        `updated:<${activityCutoffDate.format("YYYY-MM-DD")}`
    ].join(" ");
}

/**
 * Creates the bot comment to leave on auto-closed accepted issues.
 * @returns {string} comment message
 * @private
 */
function createAcceptedAutoCloseMessage() {
    return `
Unfortunately, it looks like there wasn't enough interest from the team
or community to implement this change. While we wish we'd be able to
accommodate everyone's requests, we do need to prioritize. We've found
that accepted issues failing to be implemented after 90 days tend to
never be implemented, and as such, we [close those issues](https://eslint.org/docs/maintainer-guide/issues#when-to-close-an-issue).
This doesn't mean the idea isn't interesting or useful, just that it's
not something the team can commit to.

Thanks for contributing to ESLint and we appreciate your understanding.

[//]: # (auto-close)
`;
}

/**
 * Creates the bot comment to leave on auto-closed unaccepted issues.
 * @returns {string} comment message
 * @private
 */
function createUnacceptedAutoCloseMessage() {
    return `
Unfortunately, it looks like there wasn't enough interest from the team
or community to implement this change. While we wish we'd be able to
accommodate everyone's requests, we do need to prioritize. We've found
that issues failing to reach accepted status after 21 days tend to
never be accepted, and as such, we [close those issues](https://eslint.org/docs/maintainer-guide/issues#when-to-close-an-issue).
This doesn't mean the idea isn't interesting or useful, just that it's
not something the team can commit to.

Thanks for contributing to ESLint and we appreciate your understanding.

[//]: # (auto-close)
`;
}

/**
 * Creates the bot comment to leave on auto-closed questions.
 * @returns {string} comment message
 * @private
 */
function createQuestionAutoCloseMessage() {
    return `
It looks like the conversation is stalled here. As this is a question rather
than an action item, I'm closing the issue. If you still need help, please send
a message to our [mailing list](https://groups.google.com/group/eslint) or 
[chatroom](https://gitter.im/eslint/eslint). Thanks!
[//]: # (auto-close)
`;
}


/**
 * Closes an issue and adds the auto-close label.
 * @param {probot.Context} context Probot context for the current repository
 * @param {number} issueNum The issue number on the current repository
 * @param {string} commentText The text of the comment to post on the issue.
 * @returns {Promise<void>} A Promise that fulfills when the issue has been archived
 */
async function closeIssue(context, issueNum, commentText) {
    await Promise.all([
        context.github.issues.update(context.repo({ number: issueNum, state: "closed" })),
        context.github.issues.addLabels(context.repo({ number: issueNum, labels: [AUTO_CLOSE_LABEL] })),
        context.github.issues.createComment(context.repo({ number: issueNum, body: commentText }))
    ]);
}

/**
 * Gets all issues on the current repository that match a search query
 * @param {probot.Context} context Probot context for the current repository
 * @param {string} searchQuery A search query to send to the GitHub API
 * @returns {Promise<issue>} A list of issues that match the query
 */
function queryIssues(context, searchQuery) {
    return context.github.paginate(
        context.github.search.issues({ q: searchQuery, per_page: 100 }),
        result => result.data.items
    );
}

/**
 * Autocloses issues on a repository based on labels and activity level.
 * @param {probot.Context} context Probot context for the current repository
 * @returns {Promise<void>} A Promise that fulfills when the search is complete
 */
async function closeInactiveIssues(context) {

    // repos that want auto close must first create a label
    if (!await hasAutoCloseLabel(context)) {
        return;
    }

    const [acceptedIssues, unacceptedIssues, questionIssues] = await Promise.all([
        queryIssues(context, createAutoCloseAcceptedSearchQuery(context.repo())),
        queryIssues(context, createAutoCloseUnacceptedSearchQuery(context.repo())),
        queryIssues(context, createAutoCloseQuestionSearchQuery(context.repo()))
    ]);

    await Promise.all(acceptedIssues.map(
        issue => closeIssue(context, issue.number, createAcceptedAutoCloseMessage())
    ));

    await Promise.all(unacceptedIssues.map(
        issue => closeIssue(context, issue.number, createUnacceptedAutoCloseMessage())
    ));

    await Promise.all(questionIssues.map(
        issue => closeIssue(context, issue.number, createQuestionAutoCloseMessage())
    ));
}


module.exports = robot => {
    createScheduler(robot, { interval: SEARCH_INTERVAL_MS, delay: false });

    robot.on("schedule.repository", closeInactiveIssues);
};
