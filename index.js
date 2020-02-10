const core = require('@actions/core');
const github = require('@actions/github');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = JSON.parse(core.getInput("config"));

    if (!Array.isArray(config)) throw "Config must be an array"

    const issue = github.context.payload.issue;
    if (!issue) return core.warning("No issue. Exiting gracefully");

    const issueLabels = issue.labels.map((label) => label.name);

    core.warning("test ZD #1");

    config.forEach((entry) => {

      const match = entry.require.every((label) => issueLabels.includes(label));
      core.warning(match, entry.require);

    })

  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
