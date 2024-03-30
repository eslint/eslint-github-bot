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

            // Remove after https://github.com/eslint/eslint/pull/17900 is included in new release
            "jsdoc/no-multi-asterisks": ["error", { allowWhitespace: true }]
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
            "n/no-unpublished-require": "off",
            "n/no-extraneous-require": [
                "error",
                {
                    allowModules: [
                        "@octokit/rest"
                    ]
                }
            ]
        }
    }
];
