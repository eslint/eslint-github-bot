/**
 * @fileoverview Checks if the at least one user has approved the review
 * @author Gyandeep Singh
 */

"use strict";

const { getPullrequestBySha, labels } = require("./common");

/**
 * Gets all the reviews for the PR number
 * @param {Object} context context given by the probot
 * @param {int} prId pull request number
 * @returns {Promise<Array>} Resolves with all reviews collection
 */
async function getAllReviewsByPR(context, prId) {
    const { data: allReviews } = await context.octokit.pulls.getReviews(context.repo({
        number: prId
    }));

    return allReviews;
}

/**
 * Sorts all the reviews by creating buckets based on the user
 * @param {Array<Object>} allReviews collection of reviews
 * @returns {Map} Map of reviews to users
 */
function sortReviewsByUser(allReviews) {
    return allReviews.reduceRight((coll, review) => {
        if (coll.has(review.user.login)) {
            coll.get(review.user.login).push(review);
        } else {
            coll.set(review.user.login, []);
        }

        return coll;
    }, new Map());
}

/**
 * Sorts all the reviews based on submitted date time
 * @param {Array<Object>} allReviews collection of sorted reviews
 * @returns {Array<Object>} A list of sorted reviews
 */
function sortReviewsByDtTm(allReviews) {
    return allReviews.sort(
        (r1, r2) => new Date(r1.submitted_at).getTime() > new Date(r2.submitted_at).getTime()
    );
}

/**
 * Check to see if atleast one review has been approved.
 * if their are no reviews then it will say false
 * @param {Map} allReviewsMap Map of reviews to users
 * @returns {boolean} true id atleast one is approved
 */
function isAtleastOneApproved(allReviewsMap) {
    const relevantReviewCollection = [];

    allReviewsMap.forEach(reviews => {

        // find the first APPROVED or CHANGES_REQUESTED for each user
        const reviewObj = reviews.find(
            review =>
                review.state === labels.reviewApproved ||
                review.state === labels.reviewChangeRequested
        );

        if (reviewObj) {
            relevantReviewCollection.push(reviewObj);
        }
    });

    const sortedRelevantReviews = sortReviewsByDtTm(relevantReviewCollection);

    if (
        sortedRelevantReviews.length > 0 &&
        sortedRelevantReviews[0].state === labels.reviewApproved
    ) {
        return true;
    }

    return false;
}

/**
 * Check if the review on the PR is good or not
 * @param {Object} context context given by the probot
 * @param {string} sha git sha value
 * @returns {Promise<boolean>} True if its good
 */
async function isPrReviewSuccess(context, sha) {
    const prObject = await getPullrequestBySha(context, sha);

    if (prObject) {

        // makesure at least one review is approved
        const allReviews = await getAllReviewsByPR(context, prObject.number);

        return isAtleastOneApproved(sortReviewsByUser(allReviews));
    }

    return false;
}

module.exports = {
    isPrReviewSuccess
};
