/**
 * @fileoverview Checks if the PR is ready to merge and
 * if it is then it adds the pr: ready to merge label.
 * - At least one review is approved.
 * - Build status is success.
 * @author Gyandeep Singh
 */

const { labels, removePrApprovedLabel, addPrApprovedLabel } = require("./common");
const { isPrReviewSuccess } = require("./reviewCheck");
const { isPrStatusSuccess } = require("./statusCheck");

/**
 * Adds the triage label if the issue has no labels on it
 * @param {object} context - context given by the probot
 * @returns {undefined}
 * @private
 */
const handleStatusChange = async (context) => {
    if (context.payload.state === labels.successStatus) {
        if (await isPrReviewSuccess(context, context.payload.sha)) {
            addPrApprovedLabel(context);
        }
    } else if (context.payload.state === labels.failedStatus) {
        // remove pr approved label
        removePrApprovedLabel(context);
    }
};

/**
 * Adds the triage label if the issue has no labels on it
 * @param {object} context - context given by the probot
 * @returns {undefined}
 * @private
 */
const handlePrReviewChange = async (context) => {
    if (context.payload.review.state === labels.prApprovedState) {
        if (await isPrStatusSuccess(context, context.payload.pull_request.number)) {
            addPrApprovedLabel(context);
        }
    } else {
        // remove pr approved label
        removePrApprovedLabel(context);
    }
};

/**
 * Add pr ready to merge label when
 * - At least one review is approved.
 * - Build status is success.
 */
module.exports = (robot) => {
    robot.on("status", handleStatusChange);
    robot.on("pull_request_review", handlePrReviewChange);
};
