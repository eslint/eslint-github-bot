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

module.exports = (robot) => {
    robot.on("issues.opened", triage);
    robot.on("issues.reopened", triage);
};
