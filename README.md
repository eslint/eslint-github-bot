[![Build Status](https://travis-ci.org/eslint/eslint-github-bot.svg?branch=master)](https://travis-ci.org/eslint/eslint-github-bot)

ESLint GitHub bot - GLaDOS
==========================

:alien: Plugin based Github bot :guardsman:

* _"Two plus two is f…f…f… f…10. IN BASE FOUR! I'M FINE!"_
* _Killing you and giving you advice aren't mutually exclusive. The rocket really is the way to go."_
* _"DANCING IS NOT SCIENCE!"_

## :wrench: Setup

* Clone this repo.
* `npm install`
* Start the app
    * `npm start` to start it as a GitHub APP

### ENV variables required.

* `PORT`: Port for web server _(default 8000)_.
* `SECRET`: Secret setup for GitHub webhook or you generated when you created the app.
* `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app.
* `APP_ID`: The numeric app ID

## :sunrise_over_mountains: Technical Insight

### :game_die: Core

#### GitHub APP

* It uses probot directly with no modifications.

### :electric_plug: Plugins

Plugins are the core part of the bot. They are standalone pieces which listen on certain types of webhook events and then react to it.

* **Triage** - It add the `triage` label to the issues which doesn't have any labels.
* **Commit message check** - It checks the first commit message on PR and make sure it is formatted according to the guidelines. If not then it leaves a message on the PR.
* **Duplicate comments** - It removes all the duplicates comments by this bot and leaves the last one of each type. It uses a unique hash from the comment message.
* **PR ready to merge*** - Checks if the PR is ready to merge and if it is then it adds the `pr: ready to merge` label.
    * At least one review is approved.
    * Build status is `success`.
* **Check unit test*** - Make sure the PR contains unit test. This check will be ignored for `Build|Chore|Docs|Upgrade` PR title.
* **Needs info** - It add the comment to the issue when `needs info` label is added to it.

_Note: All plugin names marked with `*` are experimental._

#### Adding plugins

To add a plugin:

1. Create the plugin as a new file in `src/plugins`.
1. Add the plugin to the list in `src/plugins/index.js`.
1. Add the plugin to the list `src/app.js` to enable it by default.
