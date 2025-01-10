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
    commitMessage: require("./commit-message"),
    needsInfo: require("./needs-info"),
    recurringIssues: require("./recurring-issues"),
    releaseMonitor: require("./release-monitor"),
    wip: require("./wip")
};
