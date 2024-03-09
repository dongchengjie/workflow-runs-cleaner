# workflow-runs-cleaner
 A github action designed for bulk deletion of workflow runs.

## Example

> This will delete workflow runs with the following criteria: event is `workflow_dispatch`, status is either `success` or `failure`, branch is `master`, and the actor's name is `somebody`.
>
> Note：'maintain-span'  is used to retain workflow runs, which conflicts with applied filters.

```yaml
jobs:
  delete-workflow-runs:
    runs-on: ubuntu-latest
    steps:
      - name: Delete workflow runs
        uses: dongchengjie/workflow-runs-cleaner@v1
        with:
          repository: ${{ github.repository }}
          token: ${{ secrets.MyToken }}
          event-filter: 'workflow_dispatch'
          status-filter: 'success,failure'
          branch-filter: 'master'
          actor-filter: 'somebody'
          maintain-span: ''
```

## Inputs

| Name          | Required | Description                                                  |
| ------------- | -------- | ------------------------------------------------------------ |
| repository    | true     | Github repository(should contain both owner and repo)        |
| token         | true     | Github token(**requires access to workflows**)               |
| event-filter  | false    | Filter workflow runs based on their event type.<br />Refer to https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows for available values. |
| status-filter | false    | Filter workflow runs according to their status(format: success, failure).<br />Refer to Refer to https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository for available values. |
| branch-filter | false    | Filter workflow runs based on their branch.                  |
| actor-filter  | false    | Filter workflow runs based on their actor.                   |
| maintain-span | false    | Retain the most recent span workflow runs (d for days, w for weeks, m for months, y for years).<br />It conflicts with filters above. |

## Usage

1. Use it in a scheduled workflow to regularly delete workflow runs that are too old.

   ```yaml
   name: Delete workflow runs on schedule
   
   on:
     schedule:
       - cron: '0 0 * * *'
     workflow_dispatch:
   
   jobs:
     delete-workflow-runs:
       runs-on: ubuntu-latest
   
       steps:
         - name: Delete workflow runs
           uses: dongchengjie/workflow-runs-cleaner@v1
           with:
             repository: ${{ github.repository }}
             token: ${{ secrets.SuperSecret }}
             maintain-span: '1w'
   ```

2. Delete those workflow runs whose status is success

   ```yaml
   name: Delete workflow runs whose status are success
   
   on:
     workflow_dispatch:
   
   jobs:
     delete-workflow-runs:
       runs-on: ubuntu-latest
   
       steps:
         - name: Delete workflow runs
           uses: dongchengjie/workflow-runs-cleaner@v1
           with:
             repository: ${{ github.repository }}
             token: ${{ secrets.SuperSecret }}
             status-filter: 'success'
   ```
