const probot = require("./probot");
const plugins = require("./plugins");

const port = process.env.PORT || 8000;
const bot = probot({
    port,
    secret: process.env.SECRET || "", // required
    token: process.env.TOKEN || "" // required
});

// as probot library doesnt support this, i am juts injecting it for now
bot.robot.accountName = process.env.NAME || "botAccountName"; // required

// load all the plugins from inside plugins folder
Object.keys(plugins).forEach((pluginId) => bot.load(plugins[pluginId]));

// only expose your local host to public for testing purpose
// ***** TEST ONLY *****
if (process.env.TUNNEL) {
    const setupTunnel = require("./probot/lib/tunnel");

    setupTunnel("gyandeeps", port)
        .then((tunnel) => console.log(`Listening on ${tunnel.url}`))
        .catch((err) => console.error(err));
}

// start the server
bot.start();
