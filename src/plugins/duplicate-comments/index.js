const filterUserComments = (comments, user) =>
    comments.filter((comment) => comment.user.login === user);

const getCommentHash = (comment) => {
    const startIdx = comment.indexOf("[//]: # (") + 9;
    const endIndex = comment.indexOf(")", startIdx);

    return comment.substring(startIdx, endIndex);
};

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

const getCommentsTobeDeleted = (commentsMap) => {
    const comments = [];

    commentsMap.forEach((commentSet) => {
        if (commentSet.length > 1) {
            comments.push(...commentSet.slice(0, commentSet.length - 1));
        }
    });

    return comments;
};

const processComments = (comments, user) =>
    getCommentsTobeDeleted(
        commentsByHash(
            filterUserComments(comments, user)
        )
    );

const duplicateCheck = async (accountName, context) => {
    const { payload, github } = context;

    try {
        if (payload.issue.state === "open") {
            const allComments = await github.issues.getComments(context.issue());

            processComments(allComments.data, accountName)
                .forEach(
                    (comment) => github.issues.deleteComment(
                        context.repo({ id: comment.id })
                    )
                );
        }
    } catch (e) {
        console.error(e);
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
