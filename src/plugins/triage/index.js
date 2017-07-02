/**
 * Adds the triage label if the issue has no labels on it
 * @param {object} payload - event payload from github
 * @param {object} github - github interface
 * @returns {Promise.<void>} promise
 * @private
 */
const triage = async ({ payload, github }) => {
    try {
        if (payload.issue.labels.length === 0) {
            await github.issues.addLabels({
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                number: payload.issue.number,
                labels: ["triage"]
            });
        }
    } catch (e) {
        console.error(e);
    }
};

/**
 * Add triage label when an issue is opened or reopened
 */
module.exports = (robot) => {
    robot.on("issues.opened", triage);
    robot.on("issues.reopened", triage);
};
