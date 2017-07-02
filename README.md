GLaDOS
========

Plugin based Github bot.

## Setup

* Clone this repo.
* `npm install`
* `npm start` to start the server.

### ENV variables required.

* `PORT`: Port for web server _(default 8000)_.
* `SECRET`: Webhook secret setup for GitHub webhook.
* `TOKEN`: Auth token for the bot.
* `NAME`: Name of the bot account.

## Technical Insight

### Core

* It uses a modified version of [Probot](https://github.com/probot/probot) project as the base.
* Have to use a modified version as probot doesnt support webhooks. It works for github apps.

### Plugins

Plugins are the core part of the bot. They are standalone pieces which listen on certain types of webhook events and then react to it.

* **Triage** - It add the `triage` label to the issues which doesnt have any labels.
* **Commit message check** - It checks the first commit message on PR and makesure it is formated according to the guidelines. If not then it leaves a message on the PR.
* **Duplicate comments** - It removes all the duplicates comments by this bot and leaves thhe last one of each type. It uses a unique hash from the comment message.
* _**PR ready to merge**_ - Checks if the PR is ready to merge and if it is then it adds the `pr: ready to merge` label.
    * Atleast one review is approved.
    * Build status is `success`.
* _**Check unit test**_ - Makesure the PR contains unit test. This chheck will be ignored for `Build`, `Chore`,etc PR's.

_Note: All italic plugin names are experimental._
