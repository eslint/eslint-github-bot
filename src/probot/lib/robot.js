const GitHubApi = require("github");
const Bottleneck = require("bottleneck");
const Context = require("./context");


// Hack client to only allow one request at a time with a 1s delay
// https://github.com/mikedeboer/node-github/issues/526
function rateLimitedClient(github) {
    const limiter = new Bottleneck(1, 1000);
    const oldHandler = github.handler;
    github.handler = (msg, block, callback) => { // eslint-disable-line no-param-reassign
        limiter.submit(oldHandler.bind(github), msg, block, callback);
    };
    return github;
}

function probotEnhancedClient(github) {
    const modGithub = rateLimitedClient(github);

    modGithub.paginate = require("./paginate");

    return modGithub;
}

// Return a function that defaults to "debug" level, and has properties for
// other levels:
//
//     robot.log("debug")
//     robot.log.trace("verbose details");
//
function wrapLogger(logger) {
    const fn = logger.debug.bind(logger);

    // Add level methods on the logger
    ["trace", "debug", "info", "warn", "error", "fatal"].forEach((level) => {
        fn[level] = logger[level].bind(logger);
    });

    return fn;
}

/**
 * The `robot` parameter available to plugins
 *
 * @property {logger} log - A logger
 */
class Robot {
    constructor({ webhook, cache, logger }) {
        this.webhook = webhook;
        this.cache = cache;
        this.log = wrapLogger(logger);
        this.github = null;

        this.webhook.on("*", event => this.log.trace(event, "webhook received"));
    }

    /**
   * Listen for [GitHub webhooks](https://developer.github.com/webhooks/),
   * which are fired for almost every significant action that users take on
   * GitHub.
   *
   * @param {string} eventName - the name of the [GitHub webhook
   * event](https://developer.github.com/webhooks/#events). Most events also
   * include an "action". For example, the * [`issues`](
   * https://developer.github.com/v3/activity/events/types/#issuesevent)
   * event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`,
   * `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`.
   * Often, your bot will only care about one type of action, so you can append
   * it to the event name with a `.`, like `issues.closed`.
   *
   * @param {Robot~webhookCallback} callback - a function to call when the
   * webhook is received.
   *
   * @example
   *
   * robot.on('push', context => {
   *   // Code was just pushed.
   * });
   *
   * robot.on('issues.opened', context => {
   *   // An issue was just opened.
   * });
   */
    on(eventName, callback) {
        const [name, action] = eventName.split(".");

        return this.webhook.on(name, async (event) => {
            if (!action || action === event.payload.action) {
                try {
                    callback(new Context(event, this.github));
                } catch (err) {
                    this.log.error(err);
                }
            }
        });
    }

    /**
   * Authenticate and get a GitHub client that can be used to make API calls.
   *
   * You'll probably want to use `context.github` instead.
   *
   * **Note**: `robot.auth` is asynchronous, so it needs to be prefixed with a
   * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
   * to wait for the magic to happen.
   *
   * @example
   *
   *  module.exports = function(robot) {
   *    robot.on('issues.opened', async context => {
   *      const github = await robot.auth();
   *    });
   *  };
   *
   * @returns {Promise<github>} - An authenticated GitHub API client
   * @private
   */
    async auth(options) {
        this.github = new GitHubApi({
            debug: process.env.LOG_LEVEL === "trace"
        });
        this.github.authenticate({ type: "token", token: options.token });
        this.github = probotEnhancedClient(this.github);
    }
}

module.exports = (...args) => new Robot(...args);

/**
* Do the thing
* @callback Robot~webhookCallback
* @param {Context} context - the context of the event that was triggered,
*   including `context.payload`, and helpers for extracting information from
*   the payload, which can be passed to GitHub API calls.
*
*  ```js
*  module.exports = robot => {
*    robot.on('push', context => {
*      // Code was pushed to the repo, what should we do with it?
*      robot.log(context);
*    });
*  };
*  ```
*/

/**
 * A [GitHub webhook event](https://developer.github.com/webhooks/#events) payload
 *
 * @typedef payload
 */

/**
 * the [github Node.js module](https://github.com/mikedeboer/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/mikedeboer/node-github}
 */

/**
  * A logger backed by [bunyan](https://github.com/trentm/node-bunyan)
  *
  * The default log level is `debug`, but you can change it by setting the
  * `LOG_LEVEL` environment variable to `trace`, `info`, `warn`, `error`, or
  * `fatal`.
  *
  * @typedef logger
  *
  * @example
  *
  * robot.log("This is a debug message");
  * robot.log.debug("…so is this");
  * robot.log.trace("Now we're talking");
  * robot.log.info("I thought you should know…");
  * robot.log.warn("Woah there");
  * robot.log.error("ETOOMANYLOGS");
  * robot.log.fatal("Goodbye, cruel world!");
  */
