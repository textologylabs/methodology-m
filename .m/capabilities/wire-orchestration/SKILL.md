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

### Step 3 — Install MR webhook on each managed repo with per-repo context variables

For each managed repo, construct a webhook URL that encodes the repo's
identity as **static pipeline trigger variables**, then install the
webhook pointing at that URL.

GitLab pipeline trigger endpoints natively accept `variables[KEY]=value`
in the query string, and GitLab webhooks preserve URL query strings
verbatim when they POST. The managed repo's identity therefore arrives
at the root pipeline as pre-populated CI variables — no middleman
service, no Premium features.

**One webhook per managed repo (MR events only).** The
pipeline-failure fan-out path (I-032) used to live in a second
`pipeline_events` webhook. As of v0.10.0 (I-056) it lives in a
`report-failure-to-root` CI job on the managed repo itself —
GitLab.com's trigger endpoint rejects requests carrying
`X-Gitlab-Event: Pipeline Hook` (loop-prevention guard, returns
`403 Forbidden`), so a pipeline-events webhook pointing at the
trigger endpoint is unreachable on SaaS. Running the trigger call
under CI job context strips the offending header and the request
goes through. See `scaffold-repo` SKILL for the job's shape and
the I-056 entry in `improvements-and-ideas.md` for the full
rationale.

For each managed repo:

1. Resolve the managed repo's SCM project ID and project path:

   ```
   managed_id   = scm.resolve_project_id(<managed-repo-location>)
   managed_path = <group>/<project>-<component-name>
   ```

2. Construct the webhook URL. URL-encode the project path
   (`/` → `%2F`) so the query string parses cleanly:

   ```
   webhook_url_mr = https://<scm-host>/api/v4/projects/<root-id>/ref/main/trigger/pipeline
                    ?token=<trigger-token>
                    &variables[SOURCE_PROJECT_ID]=<managed_id>
                    &variables[SOURCE_PROJECT_PATH]=<url-encoded managed_path>
                    &variables[EVENT_KIND]=mr
   ```

   These static values identify **which** managed repo's webhook fired
   the trigger and tag the event as an MR event for
   `shadow:detect-trigger`'s classification path. `EVENT_KIND` is
   required because GitLab pipeline triggers (`/trigger/pipeline`)
   do not forward webhook payloads into the triggered pipeline —
   only URL-encoded `variables[KEY]=value` pairs become CI variables.

   The dynamic story-vs-standalone classification happens at runtime
   inside `shadow:detect-trigger` (see Pipeline structure below), which
   cross-checks open MRs against the root repo's readiness trackers —
   no branch-name convention is imposed.

3. Install the webhook:

   ```
   scm.create_webhook(
     repo: <managed-repo>,
     url: <webhook_url_mr from step 2>,
     events: { merge_request: true, pipeline: false, push: false },
     ssl_verify: true
   )
   ```

**Important:** Push and pipeline events MUST be explicitly disabled
on the webhook. Push events would trigger the root pipeline on every
managed-repo push (noise). Pipeline events were used pre-v0.10.0 for
the I-032 fan-out path; that delivery is now owned by the
`report-failure-to-root` CI job and an installed pipeline-events
webhook would either duplicate or 403-loop.

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

Also ensure `M_GROUP_TOKEN` (a GitLab PAT or group token with `api`
scope) is set as a CI variable on the root repo. This token is the
single secret that the shadow pipeline uses to query MRs, pipelines,
and readiness trackers — `shadow:detect-trigger`, `shadow:invalidate-status`,
`shadow:report-status`, `shadow:report-failure`, and `shadow:fanout-failure`
all require it. Store it with the same flags:

```
scm.store_ci_secret(
  repo: <root-repo>,
  key: "M_GROUP_TOKEN",
  value: <group-level pat with api scope>,
  protected: true,
  masked: true
)
```

#### Variables for the pipeline-failure fan-out CI job (I-056)

The `report-failure-to-root` job that `scaffold-repo` writes onto
every managed repo (see scaffold-repo SKILL, I-056) needs two CI
variables on the **managed** repo so it can call the root repo's
trigger endpoint when its own pipeline fails:

```
scm.store_ci_secret(
  repo: <managed-repo>,
  key: "M_TRIGGER_TOKEN",
  value: <trigger-token from Step 2>,
  protected: false,    # see notes below
  masked: true
)

scm.store_ci_secret(
  repo: <managed-repo>,
  key: "ROOT_PROJECT_ID",
  value: <root-repo numeric SCM project ID>,
  protected: false,
  masked: false        # not a secret; numeric ID is public information
)
```

Set these on **every managed repo**, not the root. They are read by
the managed repo's CI job, not by the root pipeline.

#### Variables for the auto-tag CI job (I-004)

The `tag` job in scaffold-repo's managed-repo template (see
scaffold-repo SKILL, I-004) runs on merges to main and needs a
project access token with `write_repository` scope to push
annotated tags back. The same token also signs the
`report-tag-to-root` notification implicitly via job context. Set
on **every managed repo**:

```
scm.store_ci_secret(
  repo: <managed-repo>,
  key: "M_PROJECT_TAG_TOKEN",
  value: <project access token with write_repository scope>,
  protected: true,        # main is protected on production projects
  masked: true
)
```

Re-uses the per-repo project access token created by `scaffold-repo`
during repo creation (`scm.create_access_token` with `write_repository`
already in scope alongside `api` and `read_repository`). On
**free-tier GitLab** where project access tokens are unavailable,
fall back to the same group-scoped PAT used for `M_GROUP_TOKEN` —
provided it has `write_repository` scope on the managed repo.

**Why `protected: true`.** The `tag` job only runs on merges to
main (which is a protected ref). Restricting the token to protected
refs prevents accidental tag pushes from MR pipelines.

**Why `protected: false`.** The fan-out job runs on MR pipelines
and main pushes — both unprotected ref kinds (MR refs are never
protected; main is protected on production projects but the failure
notification needs to fire from MR pipelines too, otherwise we lose
mid-flight failure delivery). The `M_TRIGGER_TOKEN` is a pipeline
trigger token specifically scoped to firing root pipelines on a
single ref (root's `main`); it grants no other API capability.
`ROOT_PROJECT_ID` is non-secret. Storing both unprotected matches
the use case.

#### Prerequisite — protected ref + protected variable

GitLab exposes `protected: true` CI variables **only** to pipelines
running on protected refs (typically `main`). The defaults above
(`protected: true`, `masked: true`) assume the root repo's main
branch is protected — standard practice for production M projects.

If the root repo has intentionally-unprotected main (e.g. a testbed
or demo project where `main` is freely force-pushable), the protected
variables are inaccessible to trigger pipelines and
`shadow:detect-trigger` will abort with `M_GROUP_TOKEN not set —
cannot query MRs`. In that case, store both `M_GROUP_TOKEN` and each
`M_TOKEN_*` with `protected: false, masked: true` — token values are
still redacted from logs, just no longer gated on a protected ref.

**Do not mix**: every CI variable used by the shadow pipeline must
agree on the protected flag, or partial misfires become the norm.

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

**Stages:** install → build → test → detect → compose → integration-test → report-status → merge-transaction

**Shell lifecycle jobs** (run on MR events and main pushes, skip triggers):
- `install` — `npm ci` for root and shell package
- `build` — build the shell
- `test` — shell unit tests

**Detect stage — trigger classification** (v0.7.0 / I-030 + v0.8.0 / I-031 / I-032 + v0.9.0 / I-055 + v0.10.0 / I-056):
- `shadow:detect-trigger` — runs on every trigger. Branches on
  `$EVENT_KIND` (set by the webhook URL query string from Step 3 for
  MR events, or by the managed repo's `report-failure-to-root` CI
  job query string for pipeline-failure events — see Step 4 / I-056):
  - **`mr`** — queries the GitLab API for open MRs across root + all
    managed repos and extracts any `[A-Z]+-\d+` story ID from each
    source branch. The first candidate that isn't a follow-up to a
    completed story is emitted as `STORY_ID` with
    `TRIGGER_MODE=story`. If no candidate qualifies,
    `TRIGGER_MODE=standalone`.
  - **`pipeline`** (I-032) — queries the source managed repo's recent
    pipelines, filters for `status=failed`, and if the failing
    pipeline's ref encodes a story ID that isn't a follow-up to a
    completed story, emits `TRIGGER_MODE=pipeline-failure` plus the
    matching `STORY_ID`. Success/running pipelines and failures on
    non-story branches yield `TRIGGER_MODE=standalone`. Delivery
    of pipeline events is via the managed repo's CI-job trigger
    (I-056), not a webhook — see scaffold-repo SKILL.
  - Either way, `STORY_ID` and `TRIGGER_MODE` are written to
    `detect.env` as a dotenv artifact consumed by downstream jobs.

  **Classification semantics (I-055 — Option Y, v0.9.0).** The
  active-story signal is the **live existence of an open MR** whose
  source branch references the story ID. The readiness tracker
  (`stories/<id>.yaml`) is orchestration metadata for
  `merge-transaction`, not a classification input — it lives on the
  gate MR branch during development and only lands on main at story
  completion. The tracker on main is consulted ONLY to filter out
  follow-up MRs targeting already-completed stories (e.g.
  `hotfix/TODOM-001-typo` on a story whose tracker shows
  `status: complete`). A tracker absent from main does NOT
  disqualify a story from activeness — that's the normal state
  during the story's lifetime.

  Pre-I-055, an empty tracker on main classified the trigger as
  standalone, which created a bootstrap paradox: story MRs could
  never be classified as active until the gate MR's tracker was
  already on main, but the gate MR was supposed to stay open
  throughout the story. I-055 breaks that deadlock by treating
  live open MRs as authoritative.
- `shadow:invalidate-status` (I-031) — runs in the detect stage as a
  sibling of `shadow:detect-trigger`, gated on
  `TRIGGER_MODE=story`. Pushes `pending` to every open story MR
  (root + all managed repos) via `report-shadow-status.sh pending`
  **before** `shadow:compose` begins, so stale-green can't race the
  gate. `shadow:compose` declares `needs: [shadow:invalidate-status]`
  to enforce the ordering.

**Shadow integration jobs** (run only on trigger events; each gates
on `TRIGGER_MODE` via `shadow:detect-trigger`'s dotenv artifact and
early-exits when the mode doesn't match):
- `shadow:compose` — (mode `story`) clone siblings, Docker build, start, health check
- `shadow:integration-test` — (mode `story`) run story-level Cypress spec
- `shadow:report-status` (on_success) — (mode `story`) push `success` commit status to all story MRs via `report-shadow-status.sh`
- `shadow:report-failure` (on_failure) — (mode `story`) push `failed` commit status to all story MRs
- `shadow:fanout-failure` (I-032) — (mode `pipeline-failure`) runs in the report-status stage when a managed-repo pipeline failure triggered the root; pushes `failed` via `report-shadow-status.sh failed` to every sibling story MR without waiting for the next MR event. Skips compose + integration-test entirely.
- `merge-transaction` (manual) — (mode `story`) merge managed MRs atomically, update topology

**Validation jobs** (run on MR events and main pushes, skip triggers):
- `validate:compose` — compose, health check
- `validate:integration-test` — run story-level tests. On MR pipelines, the `after_script` extracts the story ID from the branch name and fans out the result (success/failure) to all story MRs via `report-shadow-status.sh`. This ensures that a root MR pipeline failure makes all sibling MRs go red.

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
  be derived from `project.yaml` components, not hardcoded. The
  canonical `REPOS=` derivation appears in
  `scripts/report-shadow-status.sh` (rendered by `ci.render_pipeline`),
  where it drives commit-status fan-out. Any integrity-check job in
  this capability MUST build its repo list by the same rule
  (root + all `type: referenced` components in declaration order).

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

Every script that iterates repos for a story — `report-shadow-status.sh`,
`invalidate-story-status.sh`, and any future integrity-gate job — MUST
include the root repo alongside managed repos. The root repo is a
constituent of every story (it delivers integration tests). Excluding
it from any repo list creates a gap where the root MR can have stale
status or bypass the integrity gate. Every such script MUST derive
its `REPOS` variable from the current `project.yaml` topology, not
from a hardcoded list. The canonical derivation rule (root first,
then `type: referenced` components in declaration order) is
implemented in the CI provider's render function — see
`.m/providers/ci/gitlab.md` for the gitlab reference. Note that
`scripts/integration-test.sh` (the compose-provider-owned aliveness
probe script) does NOT contain a `REPOS=` list — it verifies the
*running system*, not the SCM integrity surface.

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
