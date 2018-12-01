/**
 * @fileoverview It removes all the duplicates comments by this bot and
 * leaves the last one of each type. It uses a unique hash from the comment message.
 * Makesure all comments have a hash at the end
 * @example
 *
 * hi
 *
 * [//]: # (hi)
 * @author Gyandeep Singh
 */

"use strict";

const botType = "Bot";

/**
 * Filters the comments based on the current user
 * @param {Array<Object>} comments - collection of comments as returned by the github
 * @returns {Array<Object>} filtered comments
 * @private
 */
function filterBotComments(comments) {
    return comments.filter(comment => comment.user.type === botType);
}

/**
 * Extract the comment hash from the comment
 * @param {string} comment - comment body
 * @returns {string} comment hash
 * @private
 */
function getCommentHash(comment) {
    const startIdx = comment.indexOf("[//]: # (") + 9;
    const endIndex = comment.indexOf(")", startIdx);

    // eslint-disable-next-line
    return comment.substring(startIdx, endIndex);
}

/**
 * Creates the collection of comments based on the hash present inside the comments
 * ignore the comments which doesnt have a hash
 * @param {Array<Object>} comments - collection of comments as returned by the github
 * @returns {Map} comments by hash map
 * @private
 */
function commentsByHash(comments) {
    return comments.reduce((coll, comment) => {
        const commentHash = getCommentHash(comment.body);

        // if there is no hash then just skip
        if (commentHash.length === 0) {
            return coll;
        }

        if (coll.has(commentHash)) {
            coll.get(commentHash).push(comment);
        } else {
            coll.set(commentHash, [comment]);
        }

        return coll;
    }, new Map());
}

/**
 * Filter comments that need to be deleted and return them
 * @param {Map} commentsMap - comments collection by hash value inside the comment
 * @returns {Array} Comments to be deleted
 * @private
 */
function getCommentsTobeDeleted(commentsMap) {
    const comments = [];

    commentsMap.forEach(commentSet => {
        if (commentSet.length > 1) {
            comments.push(...commentSet.slice(0, commentSet.length - 1));
        }
    });

    return comments;
}

/**
 * Process the comments and return the comments which are duplicate and needs to be deleted
 * @param {Array<Object>} comments - collection of comments as returned by the github
 * @returns {Array<Object>} comments to be deleted
 * @private
 */
function processComments(comments) {
    return getCommentsTobeDeleted(
        commentsByHash(
            filterBotComments(comments)
        )
    );
}

/**
 * Checks for duplicates comments and removes all the duplicates leaving the last one
 * @param {Object} context - context given by the probot
 * @returns {Promise.<void>} done when comments are removed
 * @private
 */
async function duplicateCheck(context) {
    const { payload, github } = context;

    if (payload.issue.state === "open") {
        const allComments = await github.issues.getComments(context.issue());

        await Promise.all(processComments(allComments.data)
            .map(
                comment => github.issues.deleteComment(
                    context.repo({ id: comment.id })
                )
            ));
    }
}

/**
 * Make sure all comments have a hash at the end
 * @example
 *
 * hi
 *
 * [//]: # (hi)
 */

module.exports = robot => {
    robot.on("issue_comment.created", duplicateCheck);
};
