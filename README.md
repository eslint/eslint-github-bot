GLaDOS
========

Plugin based Github bot.

## Setup

* Clone this repo.
* `npm install`
* `npm start` to start the server.

### ENV variables required.

* `PORT`: Port for web server _(default 8000)_.
* `SECRET`: Secret setup for GitHub webhook.
* `TOKEN`: Auth token for the bot.
* `NAME`: Name of the bot account.

## Technical Insight

### Core

* It uses a modified version of [Probot](https://github.com/probot/probot) project as the base.
* Have to use a modified version as probot doesn't support webhooks. It works for GitHub apps.

### Plugins

Plugins are the core part of the bot. They are standalone pieces which listen on certain types of webhook events and then react to it.

* **Triage** - It add the `triage` label to the issues which doesn't have any labels.
* **Commit message check** - It checks the first commit message on PR and make sure it is formatted according to the guidelines. If not then it leaves a message on the PR.
* **Duplicate comments** - It removes all the duplicates comments by this bot and leaves the last one of each type. It uses a unique hash from the comment message.
* **PR ready to merge*** - Checks if the PR is ready to merge and if it is then it adds the `pr: ready to merge` label.
    * At least one review is approved.
    * Build status is `success`.
* **Check unit test*** - Make sure the PR contains unit test. This check will be ignored for `Build`, `Chore`,etc PR's.

_Note: All plugin names marked with `*` are experimental._

#### How to disable a plugin

Works need to be done in this area but for now just comment the plugin which you want to disable inside `src/plugins/index` file.
