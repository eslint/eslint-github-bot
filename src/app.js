/**
 * @fileoverview Main file which starts the probot server and loads the plugins
 * @author Gyandeep Singh
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const plugins = require("./plugins");

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Probot} Probot */

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

const enabledPlugins = new Set([
	"autoAssign",
	"commitMessage",
	"issuePrLink",
	"needsInfo",
	"recurringIssues",
	"releaseMonitor",
	"wip",
]);

/**
 * Assign the plugins to the robot.
 * @param {Probot} robot The Probot instance.
 * @returns {void}
 */
function appFn(robot) {
	Object.keys(plugins)
		.filter(pluginId => enabledPlugins.has(pluginId))
		.forEach(pluginId => plugins[pluginId](robot));
}

// start the server
import("probot").then(({ run }) => run(appFn));
