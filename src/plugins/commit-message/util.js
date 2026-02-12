/**
 * @fileoverview Shared data for plugin and tests of commit-message
 * @author Nicholas C. Zakas
 */

"use strict";

exports.TAG_LABELS = new Map([
	["feat:", ["feature"]],
	["feat!:", ["feature", "breaking"]],
	["build:", ["build"]],
	["chore:", ["chore"]],
	["docs:", ["documentation"]],
	["fix:", ["bug"]],
	["fix!:", ["bug", "breaking"]],
	["refactor:", ["chore"]],
	["test:", ["chore"]],
	["ci:", ["build"]],
	["perf:", ["chore"]],
]);
