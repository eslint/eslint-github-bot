/**
 * @fileoverview Creates new issues after specified old issues are closed
 * @author Teddy Katz
 */

"use strict";

const moment = require("moment-timezone");

/**
 * Gets the desired issue body for a release issue, given the date of the release.
 * @param {Moment} releaseDate The date of the release, as Moment UTC date
 * @returns {Promise<string>} The text of the issue
 */
async function getReleaseIssueBody(releaseDate) {
    return `

The scheduled release on ${releaseDate.format("dddd, MMMM Do, YYYY")} is assigned to:

* (needs volunteer)

Please use this issue to document how the release went, any problems during the release, and anything the team might want to know about the release process. This issue should be closed after all patch releases have been completed (or there was no patch release needed).

Resources:

* [Release guidelines](https://eslint.org/docs/maintainer-guide/releases)

`.trim();
}

/**
 * Gets the members of a particular team on GitHub
 * @param {GitHub} github A GitHub API client
 * @returns {{login: string, name: (string|null)}} A list of team member login names and full names
 */
async function getTeamMembers({ github, organizationName, teamName }) {

    /*
     * NOTE: This will fail if the organization contains more than 100 teams. This isn't
     * close to being a problem right now, so it hasn't been worth figuring out a good
     * way to paginate yet, but that would be a good enhancement in the future.
     */
    const teams = await github.orgs.getTeams({ org: organizationName, per_page: 100 }).then(res => res.data);
    const desiredTeam = teams.find(team => team.slug === teamName);

    if (!desiredTeam) {
        throw new Error(`No team with name ${teamName} found`);
    }

    const teamMembers = await github.orgs.getTeamMembers({ id: desiredTeam.id, per_page: 100 }).then(res => res.data);

    return Promise.all(teamMembers.map(async member => ({
        login: member.login,
        name: await github.users.getById({ id: member.id }).then(res => res.data.name)
    })));
}

/**
 * Formats a list of team members' names and GitHub usernames into a bulleted Markdown list
 * @param {{name: string, login: string}[]} teamMembers Information about team members
 * @returns {string} Markdown text containing a bulleted list of names
 */
function formatTeamMembers(teamMembers) {
    return teamMembers.map(({ login, name }) => `- ${name || login} (@${login}) - TSC`).join("\n");
}

/**
 * Gets the desired issue body for a release issue, given the date and of the meeting
 * @param {Moment} meetingDate The date and time when the meeting will take place, as a Moment date
 * @param {GitHub} github A GitHub API client
 * @returns {Promise<string>} The text of the issue
 */
async function getTscMeetingIssueBody({ meetingDate, github, organizationName, tscTeamName }) {
    const timeFormatString = "ddd DD-MMM-YYYY HH:mm";

    return `

# Time

UTC ${moment.utc(meetingDate).format(timeFormatString)}:
- Los Angeles: ${moment.tz(meetingDate, "America/Los_Angeles").format(timeFormatString)}
- Chicago: ${moment.tz(meetingDate, "America/Chicago").format(timeFormatString)}
- New York: ${moment.tz(meetingDate, "America/New_York").format(timeFormatString)}
- Madrid: ${moment.tz(meetingDate, "Europe/Madrid").format(timeFormatString)}
- Moscow: ${moment.tz(meetingDate, "Europe/Moscow").format(timeFormatString)}
- Tokyo: ${moment.tz(meetingDate, "Asia/Tokyo").format(timeFormatString)}
- Sydney: ${moment.tz(meetingDate, "Australia/Sydney").format(timeFormatString)}

# Location

https://eslint.org/chat/tsc-meetings

# Agenda

Extracted from:

* Issues and pull requests from the ESLint organization with the ["tsc agenda" label](https://github.com/issues?utf8=%E2%9C%93&q=org%3Aeslint+label%3A%22tsc+agenda%22)
* Comments on this issue

# Invited

${await getTeamMembers({ github, organizationName, teamName: tscTeamName }).then(formatTeamMembers)}

# Public participation

Anyone is welcome to attend the meeting as observers. We ask that you refrain from interrupting the meeting once it begins and only participate if invited to do so.

    `.trim();
}

/**
 * A function that determines whether an issue on GitHub was closed multiple times in the past.
 * @param {GitHub} github A GitHub API client
 * @param {Object} issueInfo information about the issue
 * @param {string} issueInfo.owner The owner of the repository
 * @param {string} issueInfo.repo The repo name
 * @param {number} issueInfo.number The issue number on GitHub
 * @returns {Promise<boolean>} A Promise that fulfills with `true` if the issue was closed multiple times
 */
async function issueWasClosedMultipleTimes(github, { owner, repo, number }) {
    const issueEvents = await github.issues.getEvents({
        owner,
        repo,
        number,
        per_page: 100
    }).then(res => res.data);

    return issueEvents.filter(eventObj => eventObj.event === "closed").length > 1;
}

/**
 * Creates a webhook handler that responds when an issue is closed for the first time
 * by creating a new issue.
 * @param {string} labelTrigger A label that the closed issue must have for this webhook
 * to run
 * @param {string[]} newLabels The labels that the newly-created issue should be given
 * @param {Function} shouldCreateNewIssue A function that accepts an object with `title` and
 * `body` properties as an argument, and returns a Promise for a boolean indicating whether
 * a new issue should be created. If the Promise fulfills with `false`, creating a new issue
 * will be cancelled.
 * @param {Function} getNewIssueInfo A function to get the title and body of the new issue.
 * Accepts a single parameter with `title` and `body` properties for the old issue, as well as
 * a `github` property containing a GitHub API client and an `organizationName` property containing
 * the name of the organization that owns the repo where the issue was filed. Returns a promise
 * for an object with `title` and `body` properties for the new issue.
 * @returns {function(probot.Context): Promise<void>} A Probot event listener
 */
function createIssueHandler({ labelTrigger, newLabels, shouldCreateNewIssue, getNewIssueInfo }) {
    return async context => {
        const { title: oldTitle, body: oldBody, labels: oldLabels } = context.payload.issue;

        // If the issue does not have the correct label, skip it.
        if (!oldLabels.some(label => label.name === labelTrigger)) {
            return;
        }

        // If the issue was previously closed and then reopened, skip it.
        if (await issueWasClosedMultipleTimes(context.github, context.issue())) {
            return;
        }

        if (!await shouldCreateNewIssue({ title: oldTitle, body: oldBody })) {
            return;
        }

        const { title: newTitle, body: newBody } = await getNewIssueInfo({
            title: oldTitle,
            body: oldBody,
            github: context.github,
            organizationName: context.repo().owner
        });

        // Create a new issue.
        await context.github.issues.create(
            context.repo({
                title: newTitle,
                body: newBody,
                labels: newLabels
            })
        );
    };
}

const RELEASE_ISSUE_TITLE_FORMAT = "[Scheduled release for ]MMMM Do, YYYY";
const releaseIssueHandler = createIssueHandler({
    labelTrigger: "release",
    newLabels: ["release", "tsc agenda"],
    async shouldCreateNewIssue({ title }) {
        return moment.utc(title, RELEASE_ISSUE_TITLE_FORMAT, true).isValid();
    },
    async getNewIssueInfo({ title }) {
        const oldReleaseDate = moment.utc(title, RELEASE_ISSUE_TITLE_FORMAT, true);
        const newReleaseDate = oldReleaseDate.clone().add({ weeks: 2 });

        return {
            title: newReleaseDate.format(RELEASE_ISSUE_TITLE_FORMAT),
            body: await getReleaseIssueBody(newReleaseDate)
        };
    }
});

const TSC_MEETING_TITLE_FORMAT = "[TSC meeting ]DD-MMMM-YYYY";
const tscMeetingIssueHandler = createIssueHandler({
    labelTrigger: "tsc meeting",
    newLabels: ["tsc meeting"],
    async shouldCreateNewIssue({ title }) {
        return moment.utc(title, TSC_MEETING_TITLE_FORMAT, true).isValid();
    },
    async getNewIssueInfo({ title, github, organizationName }) {
        const meetingDate = moment.tz(title, TSC_MEETING_TITLE_FORMAT, "America/New_York")
            .hour(16)
            .add({ weeks: 2 });


        const newTitle = meetingDate.format(TSC_MEETING_TITLE_FORMAT);
        const newBody = await getTscMeetingIssueBody({
            meetingDate,
            github,
            organizationName,
            tscTeamName: "eslint-tsc"
        });

        return { title: newTitle, body: newBody };
    }
});

module.exports = robot => {
    robot.on("issues.closed", releaseIssueHandler);
    robot.on("issues.closed", tscMeetingIssueHandler);
};
