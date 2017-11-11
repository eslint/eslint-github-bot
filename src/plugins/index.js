"use strict";

/**
 * All the exposed plugins
 */

module.exports = {
    checkUnitTest: require("./check-unit-test"),
    commitMessage: require("./commit-message"),
    duplicateComments: require("./duplicate-comments"),
    prReadyToMerge: require("./pr-ready-to-merge"),
    needsInfo: require("./needs-info"),
    triage: require("./triage"),
    recurringIssues: require("./recurring-issues"),
    releaseMerge: require("./release-merge-purifier")
};
