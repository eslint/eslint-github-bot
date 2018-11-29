/**
 * @fileoverview Exports all plugins for easy inclusion elsewhere.
 * @author Gyandeep Singh
 */

"use strict";

/**
 * All the exposed plugins
 *
 * Note that exported plugins are not automatically loaded into
 * the bot. You need to also update app.js.
 */

module.exports = {
    autoCloser: require("./auto-closer"),
    checkUnitTest: require("./check-unit-test"),
    commitMessage: require("./commit-message"),
    duplicateComments: require("./duplicate-comments"),
    issueArchiver: require("./issue-archiver"),
    prReadyToMerge: require("./pr-ready-to-merge"),
    needsInfo: require("./needs-info"),
    triage: require("./triage"),
    recurringIssues: require("./recurring-issues"),
    releaseMonitor: require("./release-monitor"),
    wip: require("./wip")
};
