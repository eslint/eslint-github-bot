"use strict";

const eslintConfigESLint = require("eslint-config-eslint");
const globals = require("globals");

module.exports = [
    ...eslintConfigESLint,
    {
        languageOptions: {
            sourceType: "commonjs",
            ecmaVersion: 2018,
            globals: {
                ...globals.node,
                ...globals.es2015
            }
        },
        rules: {
            camelcase: ["error", { properties: "never" }]
        }
    },
    {
        files: ["eslint.config.js", "tests/**/*.js"],
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
