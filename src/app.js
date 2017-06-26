const probot = require("./probot");
const setupTunnel = require("./probot/lib/tunnel");
const plugins = require("./plugins");

const port = process.env.PORT || 8000;
const bot = probot({
    port,
    secret: process.env.SECRET || "test",
    token: process.env.TOKEN || ""
});

bot.robot.accountName = process.env.NAME || "gyandeeps";

// load all the plugins from inside plugins folder
Object.keys(plugins).forEach((pluginId) => bot.load(plugins[pluginId]));

setupTunnel("gyandeeps", port)
    .then((tunnel) => console.log(`Listening on ${tunnel.url}`))
    .catch((err) => console.error(err));

bot.start();
