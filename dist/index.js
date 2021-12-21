/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 82:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 509:
/***/ ((module) => {

module.exports = eval("require")("@useshortcut/client");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
let github = __nccwpck_require__(82)
let core = __nccwpck_require__(105)
const { ShortcutClient } = __nccwpck_require__(509);

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
    const client = new github.getOctokit(githubToken)
    const shortcut = new ShortcutClient(shortcutToken);

    const issue = await client.rest.pulls.get({
      ...github.context.repo,
      pull_number: github.context.payload.pull_request.number
    });

    const comments = await client.rest.issues.listComments({
      ...github.context.repo,
      issue_number: github.context.payload.pull_request.number
    });
    let stories = new Set([
      ...matchStories(issue.data.title),
      ...matchStories(issue.data.body),
      ...matchStories(issue.data.head.ref),
      ...comments.data.flatMap(c => matchStories(c.body))
    ]);

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

})();

module.exports = __webpack_exports__;
/******/ })()
;