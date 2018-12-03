"use strict";

module.exports = {
    rules: {
        "node/no-unpublished-require": "off",
        camelcase: [
            "error",
            {
                properties: "never"
            }
        ],
        "node/no-extraneous-require": [
            "error",
            {
                allowModules: [
                    "@octokit/rest"
                ]
            }
        ]
    },
    parserOptions: {
        ecmaVersion: 8
    },
    extends: [
        "eslint"
    ],
    env: {
        node: true,
        es6: true
    },
    root: true
};
