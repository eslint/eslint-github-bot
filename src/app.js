const probot = require("./probot");
const setupTunnel = require("./probot/lib/tunnel");
const plugins = require("./plugins");

const bot = probot({
    port: 8000,
    secret: process.env.SECRET || "test",
    token: process.env.TOKEN || "dd51261924325463ee67a1cd8ea17b72015a2903"
});

bot.robot.accountName = process.env.NAME || "gyandeeps";

Object.keys(plugins).forEach((pluginId) => bot.load(plugins[pluginId]));

setupTunnel("gyandeeps", 8000)
    .then((tunnel) => console.log(`Listening on ${tunnel.url}`))
    .catch((err) => console.error(err));

bot.start();
