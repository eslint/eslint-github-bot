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
const disabledPlugins = [
    "prReadyToMerge"
];

// as probot library doesnt support this, i am juts injecting it for now
bot.robot.accountName = process.env.NAME || "test bot name"; // required

// load all the plugins from inside plugins folder except the one which are disabled
Object.keys(plugins)
    .filter((pluginId) => !disabledPlugins.includes(pluginId))
    .forEach((pluginId) => bot.load(plugins[pluginId]));

// start the server
bot.start();
