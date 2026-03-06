# M Power: wire-orchestration

**Capability:** Connect managed repos to the root repo's orchestration layer

## What it does

After all managed repos are scaffolded, this capability wires them to
the root repo. It installs webhooks, pipeline triggers, CI variables,
and the root repo's CI pipeline. After this step, the full Methodology M
orchestration is operational — raising an MR on a managed repo triggers
shadow integration on the root repo automatically.

## Parameters

| Parameter      | Type   | Required | Description                                          |
|----------------|--------|----------|------------------------------------------------------|
| project-yaml   | path   | Yes      | Path to project.yaml (source of truth for topology)   |
| root-project-id| string | No       | GitLab project ID or path for root repo (derived from project.yaml if omitted) |
| access-tokens  | map    | Yes      | Map of component name → project access token value (from scaffold-repo output) |

## Prerequisites

- Root repo exists (created by `bootstrap-root-repo`)
- All managed repos exist and are scaffolded (created by `scaffold-repo`)
- Project access tokens for each managed repo are available

## Execution

### Step 1 — Read topology

Read project.yaml. For each `type: referenced` component, extract:
- Component name
- GitLab project path (from `location:` field)

Resolve each project path to a GitLab project ID using the GitLab API.

### Step 2 — Create pipeline trigger on root repo

Create a pipeline trigger token on the root repo using
`gitlab-ops create_pipeline_trigger`:
- Description: `m-shadow-integration-trigger`

This token is what managed repo webhooks use to kick off shadow
integration pipelines on the root repo.

Store the trigger token value for webhook configuration.

### Step 3 — Install webhooks on managed repos

For each managed repo, create a webhook using
`gitlab-ops create_webhook`:
- URL: `https://gitlab.com/api/v4/projects/<root-project-id>/trigger/pipeline`
  with the trigger token as a query parameter
- Events: `merge_requests_events: true`, `push_events: false`
- SSL verification: enabled

**Important:** GitLab defaults `push_events` to `true` when creating a
webhook, even if not specified. Explicitly set `push_events: false` to
avoid triggering the root repo pipeline on every push to managed repos.
Only MR events should trigger shadow integration.

The webhook fires when an MR is created, updated, or merged on the
managed repo. The root repo's pipeline trigger receives the event and
starts the shadow integration pipeline.

**Note:** GitLab pipeline triggers via webhook require the trigger token
in the URL. The webhook payload provides the MR context. The root repo
pipeline reads `CI_MERGE_REQUEST_*` variables or parses the webhook
payload to identify which story and component are involved.

### Step 4 — Store access tokens as CI variables

For each managed repo, create a CI variable on the root repo using
`gitlab-ops create_ci_variable`:
- Key: `M_TOKEN_<COMPONENT_NAME_UPPER>` (e.g. `M_TOKEN_API_READ`)
- Value: the project access token from scaffold-repo
- Protected: true (only available on protected branches)
- Masked: true (hidden in job logs)

These tokens are used by the merge transaction pipeline to merge MRs
on managed repos via the GitLab API.

### Step 5 — Push root repo CI pipeline

Push `.gitlab-ci.yml` to the root repo. The root repo pipeline has
three distinct workflows:

```
# .gitlab-ci.yml — M-type root repo pipeline
# Orchestrates shadow integration, merge transactions,
# and story-level acceptance testing.

image: node:20

stages:
  - compose
  - integration-test
  - merge-transaction

# --- Shadow integration (triggered by managed repo webhooks) ---

shadow:compose:
  stage: compose
  script:
    - npm run compose --if-present
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"

shadow:integration-test:
  stage: integration-test
  script:
    - npm run integration-test --if-present
  needs: [shadow:compose]
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"

# --- Merge transaction (manual trigger when gates pass) ---

merge-transaction:
  stage: merge-transaction
  script:
    - npm run merge-transaction --if-present
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
      when: manual
  resource_group: distributed_merge

# --- Story-level tests on main (post-merge validation) ---

validate:compose:
  stage: compose
  script:
    - npm run compose --if-present
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

validate:integration-test:
  stage: integration-test
  script:
    - npm run integration-test --if-present
  needs: [validate:compose]
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Root repo lifecycle scripts

Like managed repos, the root repo uses pluggable lifecycle phases.
The scaffold creates placeholder scripts:

```
{
  "scripts": {
    "compose": "echo 'compose: not yet implemented'",
    "integration-test": "echo 'integration-test: not yet implemented'",
    "merge-transaction": "echo 'merge-transaction: not yet implemented'"
  }
}
```

| Phase               | Trigger                    | Purpose                                        |
|---------------------|----------------------------|-------------------------------------------------|
| `compose`           | Shadow integration trigger | Stand up the full system from topology manifest  |
| `integration-test`  | After compose              | Run story-level PATs against composed system     |
| `merge-transaction` | Manual, after gates pass   | Merge managed MRs atomically, update topology    |

### Step 6 — Protect root repo main branch

Protect the `main` branch on the root repo using
`gitlab-ops protect_branch`:
- `push_access_level: 0` — no direct pushes
- `merge_access_level: 40` — maintainer-level merge
- `allow_force_push: false`

Same rationale as managed repos: all changes arrive via MR (topology MRs).

### Step 7 — Report

Output:
- Pipeline trigger token (masked, for reference)
- Webhook status per managed repo (created / already exists)
- CI variables installed on root repo
- Root repo pipeline status
- Branch protection status

Confirm that the orchestration is wired and ready. The next step is
implementation — raising MRs on managed repos will now trigger shadow
integration automatically.

## Webhook Design Notes

### GitLab free tier constraints

GitLab free tier supports project webhooks and pipeline triggers. The
webhook-to-trigger pattern works without any premium features:

1. Managed repo webhook fires on MR event
2. Webhook POSTs to root repo's pipeline trigger URL
3. Root repo pipeline starts with trigger variables
4. Pipeline reads the webhook payload to identify the story/component

### Trigger URL format

```
https://gitlab.com/api/v4/projects/<root-project-id>/trigger/pipeline
  ?token=<trigger-token>
  &ref=main
```

The webhook sends the MR event payload as the POST body. The pipeline
can access trigger variables to determine context.

### Alternative: GitLab CI `trigger` keyword

For projects on GitLab Premium+, managed repo pipelines can use the
`trigger` keyword to directly trigger downstream root repo pipelines.
This is cleaner but requires cross-project pipeline permissions. The
webhook approach works on all tiers.

## Notes

- This capability is idempotent — running it again updates existing
  webhooks and variables rather than creating duplicates
- The root repo pipeline template uses `resource_group: distributed_merge`
  to serialise merge transactions (prevents concurrent story merges)
- CI variables are protected and masked — they're only available on
  protected branches and hidden in logs
- The `compose` phase is where Docker Compose (or equivalent) stands up
  the full system. For Story Zero this might be as simple as starting
  Express servers and pointing the MFE at them.
- `wire-orchestration` does NOT create managed repos — that's `scaffold-repo`
- `wire-orchestration` does NOT create the root repo — that's `bootstrap-root-repo`
