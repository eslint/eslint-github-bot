const bunyan = require("bunyan");
const bunyanFormat = require("bunyan-format");
const cacheManager = require("cache-manager");
const createWebhook = require("github-webhook-handler");

const createRobot = require("./lib/robot");
const createServer = require("./lib/server");

module.exports = (options) => {
    const cache = cacheManager.caching({
        store: "memory",
        ttl: 60 * 60 // 1 hour
    });

    const logger = bunyan.createLogger({
        name: "PRobot",
        level: process.env.LOG_LEVEL || "debug",
        stream: bunyanFormat({ outputMode: process.env.LOG_FORMAT || "short" }),
        serializers: {
            repository: (repository) => repository.full_name
        }
    });

    const webhook = createWebhook({ path: "/", secret: options.secret });
    const server = createServer(webhook);
    const robot = createRobot({ webhook, cache, logger });

    robot.auth({
        token: options.token
    });

    // Log all webhook errors
    webhook.on("error", logger.error.bind(logger));

    // Log all unhandled rejections
    process.on("unhandledRejection", logger.error.bind(logger));

    return {
        server,
        robot,

        start() {
            server.listen(options.port);
            logger.trace(`Listening on http://localhost:${options.port}`);
        },

        load(plugin) {
            plugin(robot);
        }
    };
};
