const core = require('@actions/core');
const github = require('@actions/github');

// Function to get workflow runs from a repository
async function getWorkflowRuns(octokit, owner, repo) {
  try {
    const { data: { workflow_runs: workflowRuns = [] } = {} } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 100,
    });
    return workflowRuns;
  } catch (err) {
    core.error(`Failed to list workflow runs: ${err.message}`);
    return [];
  }
}

// Function to delete a single workflow run
async function deleteWorkflowRun(octokit, owner, repo, runId) {
  try {
    await octokit.rest.actions.deleteWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
  } catch (err) {
    core.error(`Failed to delete workflow run ${runId}: ${err.message}`);
  }
}

function calculateDuration(span) {
  if (span) {
    const value = parseInt(span.slice(0, -1), 10);
    const unit = span.slice(-1);
    const unitToMs = { d: 86400000, w: 604800000, m: 2592000000, y: 31536000000 };
    return value * (unitToMs[unit] || 0);
  }
  return 0;
}

(async () => {
  // Parsing and preparing filters based on the action inputs
  const repository = core.getInput('repository');
  const token = core.getInput('token');
  const eventArr = core
    .getInput('event-filter')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const statusArr = core
    .getInput('status-filter')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const branchStr = core.getInput('branch-filter');
  const actorStr = core.getInput('actor-filter');
  const duration = calculateDuration(core.getInput('maintain-span'));

  // Defining filter functions for workflow runs
  const eventFilter = item => eventArr.length === 0 || eventArr.includes(item?.event);
  const statusFilter = item =>
    statusArr.length === 0 || statusArr.includes(item?.status) || statusArr.includes(item?.conclusion);
  const branchFilter = item => !branchStr || item?.head_branch === branchStr;
  const actorFilter = item => !actorStr || item?.actor?.login === actorStr;
  const spanFilter = item =>
    duration == 0 || Date.now() - Date.parse(item.updated_at ? item.updated_at : item.created_at) > duration;

  const octokit = github.getOctokit(token);
  core.info(`repository:${repository}`);
  const [owner, repo] = repository.split('/');

  while (true) {
    const workflowRuns = await getWorkflowRuns(octokit, owner, repo);

    if (workflowRuns.length === 0) {
      core.info(`No workflow runs in repository ${repository}`);
      break; // Exit if no workflow runs are found
    }

    const toBeDeleted = workflowRuns.filter(
      item => eventFilter(item) && statusFilter(item) && branchFilter(item) && actorFilter(item) && spanFilter(item)
    );

    core.info(`${workflowRuns.length} workflow runs in total, ${toBeDeleted.length} runs meet the filter-criteria.`);

    if (toBeDeleted.length === 0) break; // Exit if no runs meet the deletion filter-criteria

    // Execute all deletion requests in parallel for efficiency
    await Promise.all(
      toBeDeleted.map(run => {
        core.info(`Deleting workflow run '${run.name}...'`);
        return deleteWorkflowRun(octokit, owner, repo, run.id);
      })
    );
  }
})();
