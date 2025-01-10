/**
 * @fileoverview Main file which starts the probot server and loads the plugins
 * @author Gyandeep Singh
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { Probot, run } = require("probot");
const plugins = require("./plugins");

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("probot").Probot} Probot */
/** @typedef {import("probot").Context<any>} ProbotContext */
/** @typedef {import("probot").ProbotOctokit} ProbotOctokit */

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

if (!process.env.SECRET) {
    throw new Error("Missing 'SECRET' environment variable");
}

if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing 'PRIVATE_KEY' environment variable");
}

if (!process.env.APP_ID) {
    throw new Error("Missing 'APP_ID' environment variable");
}

const port = process.env.PORT || 8000;
const app = new Probot({
    privateKey: process.env.PRIVATE_KEY,
    appId: process.env.APP_ID,
    secret: process.env.SECRET,
    port
});

const enabledPlugins = new Set([
    "commitMessage",
    "needsInfo",
    "recurringIssues",
    "releaseMonitor",
    "wip"
]);

// load all the enabled plugins from inside plugins folder
Object.keys(plugins)
    .filter(pluginId => enabledPlugins.has(pluginId))
    .forEach(pluginId => app.load(plugins[pluginId]));

// start the server
run(app);
