[![Build Status](https://github.com/eslint/eslint-github-bot/workflows/CI/badge.svg)](https://github.com/eslint/eslint-github-bot/actions)

# ESLint GitHub bot

`eslint-github-bot` is a bot created with [probot](https://github.com/probot/probot) which automates some common tasks for repositories run by the ESLint team.

## :wrench: Setup

* Clone this repo.
* `npm install`
* Start the app
* `npm start` to start it as a GitHub APP

### ENV variables required:

* `PORT`: Port for web server _(optional, defaults to 8000)_.
* `WEBHOOK_SECRET`: Secret setup for GitHub webhook or you generated when you created the app.
* `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app.
* `APP_ID`: The numeric GitHub app ID

#### Adding plugins

To add a plugin:

1. Create the plugin as a new file in `src/plugins`.
1. Add the plugin to the list in `src/plugins/index.js`.
1. Add the plugin to the list in `src/app.js` to enable it by default.

## Deployment

The bot is deployed to a [Dokku](https://dokku.com) instance named <https://github-bot.eslint.org> and is installed as a GitHub Application at the organization level.

### Health Check

<https://github-bot.eslint.org/ping>
