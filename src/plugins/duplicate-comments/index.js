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

/**
 * Filters the comments based on the current user
 * @param {Array<object>} comments - collection of comments as returned by the github
 * @param {string} user - name of the account being used for admin purposes
 * @returns {Array<object>} filtered comments
 * @private
 */
const filterUserComments = (comments, user) =>
    comments.filter((comment) => comment.user.login === user);

/**
 * Extract the comment hash from the comment
 * @param {string} comment - comment body
 * @returns {string} comment hash
 * @private
 */
const getCommentHash = (comment) => {
    const startIdx = comment.indexOf("[//]: # (") + 9;
    const endIndex = comment.indexOf(")", startIdx);

    return comment.substring(startIdx, endIndex);
};

/**
 * Creates the collection of comments based on the hash present inside the comments
 * ignore the comments which doesnt have a hash
 * @param {Array<object>} comments - collection of comments as returned by the github
 * @returns {Map} comments by hash map
 * @private
 */
const commentsByHash = (comments) => comments.reduce((coll, comment) => {
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

/**
 * Filter comments that need to be deleted and return them
 * @param {Map} commentsMap - comments collection by hash value inside the comment
 * @returns {Array} Comments to be deleted
 * @private
 */
const getCommentsTobeDeleted = (commentsMap) => {
    const comments = [];

    commentsMap.forEach((commentSet) => {
        if (commentSet.length > 1) {
            comments.push(...commentSet.slice(0, commentSet.length - 1));
        }
    });

    return comments;
};

/**
 * Process the comments and return the comments which are duplicate and needs to be deleted
 * @param {Array<object>} comments - collection of comments as returned by the github
 * @param {string} user - name of the account being used for admin purposes
 * @returns {Array<object>} comments to be deleted
 * @private
 */
const processComments = (comments, user) =>
    getCommentsTobeDeleted(
        commentsByHash(
            filterUserComments(comments, user)
        )
    );

/**
 * Checks for duplicates comments and removes all the duplicates leaving the last one
 * @param {string} accountName - name of the account being used for admin purposes
 * @param {object} context - context given by the probot
 * @returns {Promise.<void>} done when comments are removed
 * @private
 */
const duplicateCheck = async (accountName, context) => {
    const { payload, github } = context;

    if (payload.issue.state === "open") {
        const allComments = await github.issues.getComments(context.issue());

        processComments(allComments.data, accountName)
            .forEach(
                (comment) => github.issues.deleteComment(
                    context.repo({ id: comment.id })
                )
            );
    }
};

/**
 * Makesure all comments have a hash at the end
 * @example
 *
 * hi
 *
 * [//]: # (hi)
 */
module.exports = (robot) => {
    robot.on("issue_comment.created", duplicateCheck.bind(null, robot.accountName));
};
