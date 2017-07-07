const probot = require("probot");
const plugins = require("./plugins");

const port = process.env.PORT || 8000;
const bot = probot({
    port,
    secret: process.env.SECRET || "", // required
    cert: process.env.PRIVATE_KEY || "", // required
    id: process.env.APP_ID || "" // required
});

// as probot library doesnt support this, i am juts injecting it for now
bot.robot.accountName = process.env.NAME || "eslint"; // required

// load all the plugins from inside plugins folder
Object.keys(plugins).forEach((pluginId) => bot.load(plugins[pluginId]));

// start the server
bot.start();
