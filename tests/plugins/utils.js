"use strict";

const utils = require("../../src/plugins/utils");

const COMMIT_MESSAGE = "Commit message";
const PULL_REQUEST_TITLE = "PR title";

const SINGLE_COMMIT = [
    {
        commit: {
            message: COMMIT_MESSAGE
        }
    }
];

const MULTIPLE_COMMITS = [
    {
        commit: {
            message: COMMIT_MESSAGE
        }
    },
    {
        commit: {
            message: COMMIT_MESSAGE
        }
    }
];

const PULL_REQUEST = {
    title: PULL_REQUEST_TITLE
};

describe("utils", () => {
    describe("getCommitMessageForPR", () => {
        test("Should return first commit summary if PR has one commit", () => {
            expect(utils.getCommitMessageForPR(SINGLE_COMMIT, PULL_REQUEST))
                .toBe(COMMIT_MESSAGE);
        });

        test("Should return PR title if PR has multiple commits", () => {
            expect(utils.getCommitMessageForPR(MULTIPLE_COMMITS, PULL_REQUEST))
                .toBe(PULL_REQUEST_TITLE);
        });
    });
});
