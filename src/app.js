const probot = require("./probot");
const plugins = require("./plugins");

const port = process.env.PORT || 8000;
const bot = probot({
    port,
    secret: process.env.SECRET || "",
    token: process.env.TOKEN || ""
});

bot.robot.accountName = process.env.NAME || "botAccountName";

// load all the plugins from inside plugins folder
Object.keys(plugins).forEach((pluginId) => bot.load(plugins[pluginId]));

// only expose your local host to public for testing purpose
if (process.env.TUNNEL) {
    const setupTunnel = require("./probot/lib/tunnel");

    setupTunnel("gyandeeps", port)
        .then((tunnel) => console.log(`Listening on ${tunnel.url}`))
        .catch((err) => console.error(err));
}

bot.start();
