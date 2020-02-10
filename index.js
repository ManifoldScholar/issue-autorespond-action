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
    console.log("Issue Labels: ", issueLabels);

    config.forEach((entry) => {
      console.log("Found configuration:")
      console.log(entry);
      const match = entry.require.every((label) => issueLabels.includes(label));
      console.log("Match?", match);
    })

  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
