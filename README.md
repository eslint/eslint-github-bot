[![Build Status](https://travis-ci.org/eslint/eslint-github-bot.svg?branch=master)](https://travis-ci.org/eslint/eslint-github-bot)

ESLint GitHub bot
==========================

`eslint-github-bot` is a bot created with [probot](https://github.com/probot/probot) which automates some common tasks for repositories run by the ESLint team.

The bot can perform the following tasks:

* **Triage** - adds the "triage" label to newly-created issues which don't have labels.
* **Commit message check** - adds a status check to pull requests to verify that they follow ESLint's [pull request guidelines](https://eslint.org/docs/developer-guide/contributing/pull-requests#step-2-make-your-changes)
* **Needs info** - adds a comment to issues requesting more information when a maintainer adds the `needs info` label.
* **Release/TSC meeting issues** - creates a new issue with the `release`/`tsc meeting` label scheduled two weeks later, after another release/TSC meeting issue is closed.
* **Release monitor** - searches the repository for an issue with the `release` and `patch release pending` labels, indicating that a patch release might soon be created from `master`. If an issue is found, adds a pending status check to all PRs that would require a semver-minor release, to prevent anyone from accidentally merging them.
* **PR ready to merge** (experimental) - adds a label to all PRs which are "ready to merge", defined by the following criteria:
    * At least one review is approved.
    * Build status is `success`.
* **Check unit tests** (experimental) - makes sure a PR contains unit tests. This check will be ignored for PRs with `Build|Chore|Docs|Upgrade` in the commit message.
* **Duplicate comments** (inactive) - removes all the duplicates comments by this bot and leaves the last one of each type.

## :wrench: Setup

* Clone this repo.
* `npm install`
* Start the app
    * `npm start` to start it as a GitHub APP

### ENV variables required:

* `PORT`: Port for web server _(optional, defaults to 8000)_.
* `SECRET`: Secret setup for GitHub webhook or you generated when you created the app.
* `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app.
* `APP_ID`: The numeric app ID

#### Adding plugins

To add a plugin:

1. Create the plugin as a new file in `src/plugins`.
1. Add the plugin to the list in `src/plugins/index.js`.
1. Add the plugin to the list in `src/app.js` to enable it by default.
