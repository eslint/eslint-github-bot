"use strict";

const eslintConfigESLint = require("eslint-config-eslint/cjs");
const globals = require("globals");

module.exports = [
    ...eslintConfigESLint,
    {
        ignores: ["coverage/"]
    },
    {
        rules: {
            camelcase: ["error", { properties: "never" }],
        }
    },
    {
        files: ["eslint.config.js"],
        rules: {
            "n/no-unpublished-require": "off"
        }
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.jest
            }
        },
        rules: {
            "n/no-unpublished-require": "off"
        }
    }
];
