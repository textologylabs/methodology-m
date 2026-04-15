# wire-orchestration

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
| root-project-id| string | No       | SCM project ID or path for root repo (derived from project.yaml if omitted) |
| access-tokens  | map    | Yes      | Map of component name → access token value (from scaffold-repo output) |

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
- Project path (from `location:` field)

```
for each component:
  project_id = scm.resolve_project_id(<location>)
```

### Step 2 — Create pipeline trigger on root repo

```
trigger_token = scm.create_pipeline_trigger(
  repo: <root-repo>,
  description: "m-shadow-integration-trigger"
)
```

This token is what managed repo webhooks use to kick off shadow
integration pipelines on the root repo.

Store the trigger token value for webhook configuration.

### Step 3 — Install webhooks on managed repos

For each managed repo:

```
scm.create_webhook(
  repo: <managed-repo>,
  url: <trigger-url-with-token>,
  events: { merge_request: true, pipeline: true, push: false },
  ssl_verify: true
)
```

**Important:** Push events MUST be explicitly disabled to avoid
triggering the root repo pipeline on every push to managed repos.

Pipeline events (`pipeline: true`) are required so that when a managed
repo's own pipeline fails, the root repo is notified and can propagate
the failure to all story MRs. Without this, sibling MRs retain stale
green status until the next MR event.

### Step 4 — Store access tokens as CI secrets

For each managed repo:

```
scm.store_ci_secret(
  repo: <root-repo>,
  key: "M_TOKEN_<COMPONENT_NAME_UPPER>",   # e.g. M_TOKEN_API_READ
  value: <access-token-from-scaffold-repo>,
  protected: true,
  masked: true
)
```

These tokens are used by the merge transaction pipeline to merge MRs
on managed repos via the SCM API.

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
- `detect-trigger` — determines event type: `aot_integration`, `cascade_merge`, or `pipeline_failure`
- `shadow:invalidate-status` — immediately pushes `pending` to ALL story MRs (including root) to block merge during AOT window
- `shadow:integration` — clone siblings, Docker build, start, health check, run tests. Skips compose for `cascade_merge` and `pipeline_failure` (exits with failure for pipeline_failure to trigger report-failure)
- `shadow:report-status` — push `success` commit status to ALL story MRs (including root)
- `shadow:report-failure` — push `failed` commit status to ALL story MRs (including root)

**Validation jobs** (run on MR events and main pushes, skip triggers):
- `validate:integration` — compose, health check, run story-level tests. On MR pipelines, the `after_script` extracts the story ID from the branch name and fans out the result (success/failure) to all story MRs via `report-shadow-status.sh`. This ensures that a root MR pipeline failure makes all sibling MRs go red.

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

#### Integration test gate

Shadow integration runs story-level integration tests after health
checks pass. Three failure modes ensure no story can slip through:

- **Structural failure:** the integration test framework detects that
  a story is in-flight (open MRs with the story ID in branch names)
  but no story-level CAT exists at `pats/<story-id>.cy.js` (or other
  framework-appropriate file) on the root repo's story branch. This
  fails immediately with a clear message telling the team to add
  tests. There is no separate `scripts/integration-tests/<story-id>.sh`
  path — `scripts/integration-test.sh` is singular and topology-wide
  (owned by the compose provider via `render-topology-artefacts`).

- **Completeness failure:** the integrity check verifies that ALL
  repos in the topology have open MRs for the story — managed repos
  AND the root repo. The root repo delivers story-level integration
  tests; without its MR the gate is meaningless. The repo list MUST
  be derived from `project.yaml` components, not hardcoded. In the
  rendered `scripts/integration-test.sh` (from
  `compose.render_topology`), this appears as the `REPOS=` line, which
  is the canonical source for the gate's repo set.

- **Logical failure:** the integration test script exists but fails
  because not all components have implemented their part yet. The
  failure output shows exactly which checks failed, so devs know
  who to talk to.

- **Mergeability failure:** a constituent MR exists but is not
  mergeable (e.g. failing pipeline, blocked by discussions, needs
  approval). An unmergeable MR is functionally equivalent to a
  missing MR — the story cannot proceed. The integrity check must
  verify `detailed_merge_status` for each MR, not just its existence.
  Acceptable statuses are `mergeable`, `checking` (pipeline in
  progress), `approvable`, and `approved`. Anything else (e.g.
  `ci_must_pass`, `blocked_status`, `not_approved`) means the MR
  is not ready and the story is incomplete.

The root repo always has a story branch for every story — even when
the shell code doesn't change — because the integration tests are
the root repo's contribution. The `decompose-story` capability
enforces this by always generating a root repo sub-task.

The shadow pipeline bootstraps from the root repo's story branch
(resolved via `resolve-story-branches.sh`) to pick up story-specific
integration tests, compose config, and Cypress specs.

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

The shadow pipeline reports results to ALL repos with open story MRs —
managed repos AND the root repo. This is fan-out, not point-to-point.
When shadow integration passes or fails, every constituent MR gets the
same status simultaneously. This requires a group-level token with API
scope (`M_GROUP_TOKEN`) as a CI secret on the root repo.

Two jobs handle this:
- `shadow:report-status` (on success) — pushes `state=success` to all story MRs
- `shadow:report-failure` (on failure) — pushes `state=failed` to all story MRs

For each repo with an open story MR, both call:
```
scm.post_commit_status(
  repo: <story-repo>,
  sha: <commit-sha>,
  state: success | failed,
  name: "shadow-integration",
  description: <human-readable message>,
  target_url: <link to root pipeline>
)
```

### Step 6 — Protect root repo main branch

```
scm.protect_branch(
  repo: <root-repo>,
  branch: "main",
  push: none,
  merge: maintainer,
  force_push: false
)
```

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

## Critical — Repo Lists Must Include Root

Every script that iterates repos for a story — `integration-test.sh`,
`report-shadow-status.sh`, `invalidate-story-status.sh` — MUST include
the root repo alongside managed repos. The root repo is a constituent
of every story (it delivers integration tests). Excluding it from any
repo list creates a gap where the root MR can have stale status or
bypass the integrity gate. Use a single `REPOS` variable derived from
the topology, not a hardcoded list of managed repos.

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
