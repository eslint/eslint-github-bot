/**
 * @fileoverview Main file which starts the probot server and loads the plugins
 * @author Gyandeep Singh
 */

"use strict";

const probot = require("probot");
const plugins = require("./plugins");

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
const bot = probot.createProbot({
    port,
    secret: process.env.SECRET,
    cert: process.env.PRIVATE_KEY,
    id: process.env.APP_ID
});
const enabledPlugins = new Set([
    "autoCloser",
    "commitMessage",
    "issueArchiver",
    "needsInfo",
    "triage",
    "recurringIssues",
    "releaseMonitor",
    "wip"
]);

// load all the enabled plugins from inside plugins folder
Object.keys(plugins)
    .filter(pluginId => enabledPlugins.has(pluginId))
    .forEach(pluginId => bot.load(plugins[pluginId]));

// start the server
bot.start();
