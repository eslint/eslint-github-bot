"use strict";

const { defineConfig, globalIgnores } = require("eslint/config");
const eslintConfigESLint = require("eslint-config-eslint/cjs");
const globals = require("globals");

module.exports = defineConfig([
	globalIgnores(["coverage/"]),
	eslintConfigESLint,
	{
		rules: {
			camelcase: ["error", { properties: "never" }],
		},
	},
	{
		files: ["eslint.config.js"],
		rules: {
			"n/no-unpublished-require": "off",
		},
	},
	{
		files: ["tests/**/*.test.js"],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
		rules: {
			"n/no-unpublished-require": "off",
		},
	},
]);
