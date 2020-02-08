const core = require('@actions/core');
const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = JSON.parse(core.getInput("config"));
    console.log(config);

  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
