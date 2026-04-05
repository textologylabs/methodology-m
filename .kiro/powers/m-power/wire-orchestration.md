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
- Each managed repo has a `Dockerfile` at its root
- Each API repo exposes a `GET /health` endpoint (convention for compose health checks)
- Root repo has a `docker-compose.yml` defining all services with build contexts pointing to sibling directories

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

Push `.gitlab-ci.yml` to the root repo. The pipeline has three concerns:

1. **Shell lifecycle** — install/build/test for the embedded shell component
2. **Shadow integration** — triggered by managed repo webhooks
3. **Post-merge validation** — compose + integration-test on MR events and main

#### Pipeline structure

The root repo CI uses Docker-in-Docker (DinD) for the compose stages.
This is the **reference implementation** using GitLab CI + Docker Compose.
Other compose strategies (k8s, serverless, etc.) would replace this
section while preserving the same lifecycle contract.

**Stages:** install → build → test → compose → integration-test → report-status → merge-transaction

**Shell lifecycle jobs** (run on MR events and main pushes, skip triggers):
- `install` — `npm ci` for root and shell package
- `build` — build the shell
- `test` — shell unit tests

**Shadow integration jobs** (run only on trigger events from managed repo webhooks):
- `shadow:compose` — clone siblings, Docker build, start, health check
- `shadow:integration-test` — run story-level tests against composed system
- `shadow:report-status` — push pass/fail commit status back to source MR
- `shadow:report-failure` — push failure status (runs `when: on_failure`)

**Validation jobs** (run on MR events and main pushes, skip triggers):
- `validate:compose` — same compose logic as shadow, gates root repo MRs
- `validate:integration-test` — story-level tests on the validated compose

**Merge transaction** (manual trigger):
- `merge-transaction` — merge managed MRs atomically, update topology

#### Compose job contract (methodology)

The compose stage must:
1. Clone all sibling repos at the appropriate ref
2. Build the full system (all components)
3. Start all services
4. Verify each service is healthy (health check with timeout)
5. Tear down on failure or after completion

This contract is methodology — it applies regardless of compose strategy.

#### Reference implementation: Docker Compose on GitLab DinD

The reference implementation uses Docker-in-Docker on GitLab CI shared
runners. Key configuration:

```
image: docker:latest
services:
  - docker:dind
variables:
  DOCKER_TLS_CERTDIR: "/certs"
  GROUP: <gitlab-group-path>
before_script:
  - apk add --no-cache git curl
```

**Clone sibling repos** using `CI_JOB_TOKEN` for authentication:
```
git clone --depth 1 --branch main \
  "https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/${GROUP}/<repo>.git" \
  ../<repo>
```

**Build and start** via Docker Compose:
```
docker compose build
docker compose up -d
```

**Health check loop** with configurable timeout:
```
DOCKER_GATEWAY="${DOCKER_GATEWAY:-docker}"
TIMEOUT=60
ENDPOINTS="http://${DOCKER_GATEWAY}:<port>/health ..."
```

**Teardown** in `after_script` (runs even on failure):
```
docker compose down 2>/dev/null || true
```

#### DinD networking gotcha

In GitLab's DinD setup with `DOCKER_TLS_CERTDIR`, the Docker daemon
runs in the `docker:dind` service container. Published ports bind on
that daemon's network interface, reachable from the CI script via the
hostname `docker` — NOT `localhost`.

Health check URLs must use `docker:<port>`, not `localhost:<port>`.
The `DOCKER_GATEWAY` variable defaults to `docker` but can be
overridden for local testing (set to `localhost`).

#### Health endpoint convention

All API components must expose `GET /health` returning a 2xx response.
This is the standard health check endpoint used by compose jobs.

Frontend components (nginx-based) are checked via their served content:
- Shell: `http://<host>:3000` (serves index.html)
- MFE: `http://<host>:3001/remoteEntry.js` (Module Federation entry)

#### MR pipeline rules

The `validate:compose` and `validate:integration-test` jobs must include
`merge_request_event` in their rules, not just `main` branch. Without
this, root repo MRs have no pipeline and are blocked by the
`only_allow_merge_if_pipeline_succeeds` setting:

```
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"
```

#### Shadow status reporting

The shadow pipeline reports results back to the managed repo MR as
commit statuses via the GitLab API. This requires `M_GROUP_TOKEN`
(a group-level token with API scope) as a CI variable on the root repo.

Two jobs handle this:
- `shadow:report-status` (on success) — pushes `state=success`
- `shadow:report-failure` (on failure) — pushes `state=failed`

Both use the commit status API:
```
POST /projects/<source-project-id>/statuses/<commit-sha>
  state=success|failed
  name=shadow-integration
  description=<human-readable message>
  target_url=<link to root pipeline>
```

### Step 6 — Protect root repo main branch

Protect the `main` branch on the root repo using
`gitlab-ops protect_branch`:
- `push_access_level: 0` — no direct pushes
- `merge_access_level: 40` — maintainer-level merge
- `allow_force_push: false`

### Step 7 — Report

Output:
- Pipeline trigger token (masked, for reference)
- Webhook status per managed repo (created / already exists)
- CI variables installed on root repo
- Root repo pipeline status
- Branch protection status

## Webhook Design Notes

### GitLab free tier constraints

GitLab free tier supports project webhooks and pipeline triggers. The
webhook-to-trigger pattern works without any premium features.

### Trigger URL format

```
https://gitlab.com/api/v4/projects/<root-project-id>/trigger/pipeline
  ?token=<trigger-token>
  &ref=main
```

### Alternative: GitLab CI `trigger` keyword

For projects on GitLab Premium+, managed repo pipelines can use the
`trigger` keyword to directly trigger downstream root repo pipelines.
The webhook approach works on all tiers.

## Notes

- This capability is idempotent — running it again updates existing
  webhooks and variables rather than creating duplicates
- The root repo pipeline uses `resource_group: distributed_merge`
  to serialise merge transactions
- CI variables are protected and masked
- `wire-orchestration` does NOT create managed repos — that's `scaffold-repo`
- `wire-orchestration` does NOT create the root repo — that's `bootstrap-root-repo`
- The compose strategy (Docker Compose + DinD) is the reference
  implementation. The methodology defines the contract (clone, build,
  start, health-check, teardown); the strategy implements it. See I-018
  for the plugin boundary design.
- The shadow:compose and validate:compose jobs currently duplicate the
  compose logic. See I-017 for the DRY refactor plan (extract to shared
  script or YAML anchors).
- Workflow rules prevent duplicate pipelines — trigger, MR, and main
  branch events are handled distinctly
- The embedded shell follows the same lifecycle as managed repos
  (install/build/test) plus inline compose validation. See I-012.
