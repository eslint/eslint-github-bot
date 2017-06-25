const probot = require("./probot");
const setupTunnel = require("./probot/lib/tunnel");

setupTunnel("gyandeeps", 8000)
    .then(tunnel => console.log(`Listening on ${tunnel.url}`))
    .catch(err => console.error(err));

const bot = probot({
    port: 8000,
    secret: "test",
    token: process.env.TOKEN || ""
});

const plugins = require("./plugins");

Object.keys(plugins).forEach(pluginId => bot.load(plugins[pluginId]));

bot.start();
