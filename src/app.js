/**
 * @fileoverview Main file which starts the probot server and loads the plugins
 * @author Gyandeep Singh
 */

const probot = require("probot");
const plugins = require("./plugins");

const port = process.env.PORT || 8000;
const bot = probot({
    port,
    secret: process.env.SECRET || "", // required
    cert: process.env.PRIVATE_KEY || "", // required
    id: process.env.APP_ID || "" // required
});
const enabledPlugins = new Set([
    "commitMessage",
    "needsInfo",
    "triage"
]);

// load all the enabled plugins from inside plugins folder
Object.keys(plugins)
    .filter((pluginId) => enabledPlugins.has(pluginId))
    .forEach((pluginId) => bot.load(plugins[pluginId]));

// start the server
bot.start();
