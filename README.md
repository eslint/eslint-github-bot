[![Build Status](https://github.com/eslint/eslint-github-bot/workflows/CI/badge.svg)](https://github.com/eslint/eslint-github-bot/actions)

# ESLint GitHub bot

`eslint-github-bot` is a bot created with [probot](https://github.com/probot/probot) which automates some common tasks for repositories run by the ESLint team.

## Environment Variables:

* `APP_ID` (required): The numeric GitHub app ID
* `PRIVATE_KEY` (required): the contents of the private key you downloaded after creating the app.
* `WEBHOOK_SECRET` (required): Secret setup for GitHub webhook or you generated when you created the app.
* `PORT`: Port for web server _(optional, defaults to 8000)_.

## :wrench: Setup

* Clone this repo
* `npm install`
* `npm test`

To start the server locally, you'll need:

* A PEM file
* A `.env` file that specifies the required environment variables

The `APP_ID` and `WEBHOOK_SECRET` need to be present but need not be the registered application ID or webhook secret to start the server. `PRIVATE_KEY` must be a valid PEM private key.

#### Adding plugins

To add a plugin:

1. Create the plugin as a new file in `src/plugins`.
1. Add the plugin to the list in `src/plugins/index.js`.
1. Add the plugin to the list in `src/app.js` to enable it by default.

## Deployment

The bot is deployed to a [Dokku](https://dokku.com) instance named <https://github-bot.eslint.org> and is installed as a GitHub Application at the organization level.

The URL to receive webhooks is the default for Probot, which is `/api/github/webhooks`. This must be configured for the app on the ESLint organization.

### Health Check

<https://github-bot.eslint.org/ping>
