let github = require('@actions/github')
let core = require('@actions/core')
const { ShortcutClient } = require('@useshortcut/client');

let pattern = /(?:\[|\/)(?:(?:sc-?)|(?:ch))(\d+)(?:\]|\/)/g
function matchStories(str){
  let result = []
  str = str || ''
  const matches = str.matchAll(pattern)
  for (const match of matches) {
    result.push(match[1])
  }
  return result
}

async function main () {
  try {
    const githubToken = core.getInput('GITHUB_TOKEN')
    const shortcutToken = core.getInput('SHORTCUT_TOKEN')
    const workflowStateName = core.getInput('workflowStateName')
    const prNumbers = core.getMultilineInput('prNumbers')
    const client = new github.getOctokit(githubToken)
    const shortcut = new ShortcutClient(shortcutToken);

    if (prNumbers.length === 0) {
      prNumbers.push(github.context.payload.pull_request.number)
    }

    let stories = new Set()

    prNumbers.map(async x => {
      const issue = await client.rest.pulls.get({
        ...github.context.repo,
        pull_number: x
      });

      const comments = await client.rest.issues.listComments({
        ...github.context.repo,
        issue_number: x
      });

      stories.add(...matchStories(issue.data.title))
      stories.add(...matchStories(issue.data.body))
      stories.add(...matchStories(issue.data.title))
      stories.add(...comments.data.flatMap(c => matchStories(c.body)))
    })

    console.log(stories);

    if (workflowStateName) {
      Promise.all(Array.from(stories).map(async storyId => {
            const storyResponse = await shortcut.getStory(storyId);
            const workflowResponse = await shortcut.getWorkflow(storyResponse.data.workflow_id);
            const workflowState = workflowResponse.data.states.find(x =>
                x.name.toLowerCase() === workflowStateName.toLowerCase());

            if (!workflowState) {
              throw 'Workflow State "' + workflowStateName + '" not found';
            }

            return shortcut.updateStory(storyId, { workflow_state_id: workflowState.id});
          }
      ));
    }

  } catch (e) {
    core.setFailed(e.message)
  }
}

main();
