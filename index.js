const core = require('@actions/core');
const github = require('@actions/github');
const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = JSON.parse(core.getInput("config"));

    if (!Array.isArray(config)) throw "Config must be an array"

    const issue = github.context.payload.issue;
    if (!issue) return console.log("No issue. Exiting gracefully");

    const issueLabels = issue.labels.map((label) => label.name);

    config.forEach((entry) => {

      const match = entry.require.every((label) => issueLabels.includes(label));
      console.log(match, entry.require);

    })



  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
