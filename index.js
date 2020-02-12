const core = require('@actions/core');
const github = require('@actions/github');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = JSON.parse(core.getInput("config"));
    const token = process.env.GITHUB_TOKEN;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    const issue = github.context.payload.issue;
    const comment = github.context.payload.comment;
    const commentAuthor = comment.user.login
    const issueId = issue.node_id
    const issueNumber = issue.number

    if (!comment.body.trim().startsWith("@bot")) return;

    const cmdRegex = /^@bot\s*(.*)$/
    const cmd = comment.body.trim().match(cmdRegex)[1].trim();

    if (!Array.isArray(config)) throw "Config must be an array"
    if (!issue) return core.warning("No issue. Exiting gracefully");
    if (!token) return core.setFailed("GITHUB_TOKEN is not available");

    const octokit = new github.GitHub(token);
    const issueLabels = issue.labels.map((label) => label.name);

    console.log("");
    console.log(`Removing bot attention grabbing comments`);
    const result = await octokit.graphql(`
      {
        repository(owner: "${owner}", name: "${repo}") {
          assignableUsers(first:100) {
             edges {
              node {
                id
                login
              }
            }
          }                
          labels(first: 100){
            edges {
              node {
                id
                name
              }
            }
          }
          issue(number: ${issueNumber}) {
            id
            comments(first: 100) {
              edges {
                node {
                  id
                  body
                }
              }
            }
          }
        }
      }
    `);

    console.log(`Checking authorization...`);
    const assignableUsers = result.repository.assignableUsers.edges.map(u => u.node.login)
    console.log(`Comment author is ${commentAuthor}`);
    if (!assignableUsers.includes(commentAuthor)) {
      console.log(`The user ${commentAuthor} is not allowed to trigger this bot.`)
      return;
    }

    const labelLookup = {}
    result.repository.labels.edges.forEach((labelEdge) => {
      labelLookup[labelEdge.node.name] = labelEdge.node.id;
    })

    const commentEdges = result.repository.issue.comments.edges;
    commentEdges.forEach(async (edge) => {
      if (edge.node.body.startsWith("@bot")) {
        console.log(`Removing comment ${edge.node.id}`);
        await octokit.graphql(`
          mutation($id: ID!) {
            deleteIssueComment(input: {id: $id}) {
              clientMutationId
            }
          }
        `, { id: edge.node.id });
      }
    })


    const entry = config.find((entry) => entry.cmd === cmd);
    if (!entry) {
      console.log(`No matching command found for ${cmd}.`);
      return;
    }

    console.log("");
    console.log(`Processing "${entry.cmd}" for issue ${issueId}...`)

    console.log(`Labeling issue with ${entry.labels}`);
    const labelIds = entry.labels.map((labelName) => labelLookup[labelName]);
    await octokit.graphql(`
      mutation($labelableId: ID!, $labelIds: [ID!]! ) {
        addLabelsToLabelable(input: { labelableId: $labelableId, labelIds: $labelIds }) {
          clientMutationId
        }
     }
    `, { labelableId: issueId, labelIds });

    console.log(`Grabbing message from ${entry.message}`);
    const { repository } = await octokit.graphql(`
    {
      repository(owner: "${owner}", name: "${repo}") {
        object(expression: "${entry.message}") {
          ... on Blob {
            text
          }
        }
      }
    }
    `);

    if (!repository.object) {
      core.warning(`Could not find message at ${entry.message}`)
      return;
    }
    const responseBody = repository.object.text;
    console.log(`Found message for ${entry.cmd}...`);

    console.log(`Checking if comment already exists...`);
    const commentExists = commentEdges.some((edge) => {
      return edge.node.body === responseBody;
    })
    if (commentExists) {
      console.log("Comment already exists.");
      return;
    }
    console.log("Comment does not exist.")

    console.log(`Adding comment to issue for ${entry.cmd}...`);
    await octokit.graphql(`
      mutation($subjectId: ID!, $responseBody: String!) {
        addComment(input: { subjectId: $subjectId, body: $responseBody}) {
          clientMutationId
        }
      }
    `, { subjectId: issueId, responseBody });
    console.log('Comment added...')

    if (entry.close) {
      console.log(`Closing issue...`)
      await octokit.graphql(`
        mutation($id: ID!) {
          updateIssue(input: { id: $id, state: CLOSED}) {
            clientMutationId
          }
        }
      `, { id: issueId });
    }

    console.log('Processing complete.')

    console.log("");
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
