# CI Provider: gitlab

Reference implementation of the `ci.*` namespace for GitLab CI. Emits
`.gitlab-ci.yml` (the pipeline configuration) and
`scripts/report-shadow-status.sh` (the CI helper script that pushes
commit statuses to sibling repos).

Select by setting `providers.ci: gitlab` in `project.yaml`. If the field
is absent, this provider is the default when `providers.scm` is also
`gitlab` — CI and SCM are tightly coupled because the pipeline
configuration format is platform-specific and the status helper script
shells out to the SCM platform's CLI.

## Function: `ci.render_pipeline(project, scm)`

Returns a list of `{path, content}` entries:

1. `.gitlab-ci.yml` — workflow rules, stages, jobs. All topology-derived
   values (clone URLs, repo lists, group path, health endpoints) are
   substituted from `project.yaml` at render time.
2. `scripts/report-shadow-status.sh` — CI helper invoked by
   `shadow:report-status` and `shadow:report-failure` jobs. Pushes the
   shadow integration status to each story MR on each referenced repo.
   Uses the `glab` CLI (resolved from `scm = "gitlab"`). A GitHub CI
   provider would emit an equivalent script using `gh`.

Both files are pure functions of the inputs. No filesystem reads.

The `scm` parameter names the active SCM provider (e.g. `"gitlab"`,
`"github"`). This provider only accepts `scm = "gitlab"` — any other
value is an error, because `.gitlab-ci.yml` is not portable across SCM
platforms.

### `.gitlab-ci.yml` rendering rules

The file has five top-level sections (order pinned for byte-stability):

1. Header comment block
2. `image:` + `workflow:` rules
3. `stages:` list
4. Shell lifecycle jobs (`install`, `build`, `test`)
5. Orchestration jobs (`shadow:*`, `merge-transaction`, `validate:*`)

#### 1. Header

```yaml
# <project.project>-root — M-type root repo pipeline
# Two concerns:
# 1. Shell lifecycle (install/build/test) — same pattern as managed repos
# 2. Orchestration (shadow integration, merge transaction, post-merge validation)

image: node:20
```

#### 2. Workflow rules

Pinned:

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == "main"
```

#### 3. Stages

Pinned (project-independent):

```yaml
stages:
  - install
  - build
  - test
  - compose
  - integration-test
  - report-status
  - merge-transaction
```

#### 4. Shell lifecycle jobs

**Only emitted if `project.components[]` contains a component with
`type: embedded` AND `role: frontend-host`.** This is the M convention
for the shell: it lives inside the root repo at its declared
`location`. If the project has no embedded shell, omit the install,
build, and test jobs entirely and also omit the `install`, `build`, and
`test` stages from `stages:` above.

Let `<shell-location>` = the embedded frontend-host component's
`location` field (e.g. `./packages/shell`).

```yaml
cache: &default_cache
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - <shell-location-without-leading-dotslash>/node_modules/
  policy: pull

install:
  stage: install
  script:
    - npm ci
    - cd <shell-location> && npm ci
  cache:
    <<: *default_cache
    policy: pull-push
  rules:
    - if: $CI_PIPELINE_SOURCE != "trigger"

build:
  stage: build
  script:
    - cd <shell-location> && npm run build
  needs: [install]
  rules:
    - if: $CI_PIPELINE_SOURCE != "trigger"

test:
  stage: test
  script:
    - echo "Shell unit tests — placeholder (story-level Cypress runs in integration-test)"
  needs: [build]
  rules:
    - if: $CI_PIPELINE_SOURCE != "trigger"
```

#### 5. Orchestration jobs

These are always emitted regardless of shell presence.

Let:
- `<group>` = `project.group` (e.g. `methodology-m/todo-m-workshop`)
- `<referenced-repos>` = list of `<project.project>-<component.name>`
  for each `type: referenced` component in declaration order
- `<gitlab-host>` = `gitlab.com` for gitlab.com-hosted projects; for
  self-hosted GitLab, derive from `project.scm.host` (new optional field,
  default `gitlab.com`)

**`shadow:compose` job:**

```yaml
shadow:compose:
  stage: compose
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
    GROUP: <group>
  before_script:
    - apk add --no-cache git curl
  script:
    - echo "Shadow compose for $SOURCE_PROJECT_PATH"
    - echo "Cloning sibling repos..."
    <one git clone line per referenced repo, in declaration order>
    - echo "Building Docker images..."
    - docker compose build
    - echo "Starting containers..."
    - docker compose up -d
    - echo "Waiting for health endpoints..."
    - sh scripts/integration-test.sh
  after_script:
    - docker compose down 2>/dev/null || true
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
```

The per-referenced-repo git clone line template:

    - git clone --depth 1 --branch main "https://gitlab-ci-token:${CI_JOB_TOKEN}@<gitlab-host>/${GROUP}/<repo-name>.git" ../<repo-name>

**Note:** unlike pass1, the compose job delegates the health checks to
`scripts/integration-test.sh` (emitted by `compose.render_topology`
via the compose provider). The inline `DOCKER_GATEWAY`/`ENDPOINTS`/curl
loop is gone. This is the I-036 extraction point: health check logic
lives in one place, generated from the topology, not duplicated
across CI jobs.

**`shadow:integration-test` job:**

```yaml
shadow:integration-test:
  stage: integration-test
  script:
    - npm run integration-test --if-present
  needs: [shadow:compose]
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
```

**`shadow:report-status` job:**

```yaml
shadow:report-status:
  stage: report-status
  script:
    - sh scripts/report-shadow-status.sh success
  needs: [shadow:integration-test]
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
  when: on_success
```

**`shadow:report-failure` job:**

```yaml
shadow:report-failure:
  stage: report-status
  script:
    - sh scripts/report-shadow-status.sh failed
  needs: [shadow:compose]
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
  when: on_failure
```

**Note:** the pass1 versions had inline shell logic embedded in the
`script:` block for status reporting. This provider extracts that
logic into `scripts/report-shadow-status.sh` (see below), which takes
a single argument — `success` or `failed` — and handles the rest.

**`merge-transaction` job:**

```yaml
merge-transaction:
  stage: merge-transaction
  script:
    - npm run merge-transaction --if-present
  rules:
    - if: $CI_PIPELINE_SOURCE == "trigger"
      when: manual
  resource_group: distributed_merge
```

**`validate:compose` job:**

Same structure as `shadow:compose` but with different rules
(runs on MR events and main instead of trigger events) and different
`needs`:

```yaml
validate:compose:
  stage: compose
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
    GROUP: <group>
  before_script:
    - apk add --no-cache git curl
  script:
    - echo "Cloning sibling repos for Docker compose..."
    <git clone lines identical to shadow:compose>
    - echo "Building Docker images..."
    - docker compose build
    - echo "Starting containers..."
    - docker compose up -d
    - echo "Waiting for health endpoints..."
    - sh scripts/integration-test.sh
  after_script:
    - docker compose down 2>/dev/null || true
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"
  needs: [test]
```

If the shell lifecycle is omitted (no embedded frontend-host), change
`needs: [test]` to `needs: []`.

**`validate:integration-test` job:**

```yaml
validate:integration-test:
  stage: integration-test
  script:
    - npm run integration-test --if-present
  needs: [validate:compose]
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"
```

### `scripts/report-shadow-status.sh` rendering rules

A POSIX shell script invoked by the `shadow:report-status` and
`shadow:report-failure` CI jobs. Takes a single argument (`success`
or `failed`) and pushes a commit status to each story MR on each
referenced repo.

The script uses raw `curl` against the GitLab REST API rather than
the `glab` CLI. This matches pass1's proven pattern and avoids the
alpine-image dependency friction — `glab` is not in alpine's default
apk repo and would require a tarball install step in `before_script`.
A follow-up to switch to `glab` is tracked as **I-048** (low priority
— purely a quality-of-life improvement, not a functional change).

```sh
#!/bin/sh
# Shadow integration status reporter.
# Generated by ci/gitlab provider — do not edit by hand.
# Source of truth: project.yaml.
#
# Usage: sh scripts/report-shadow-status.sh <state>
#   <state> is one of: success, failed, pending

set -eu

STATE="${1:?state required: success|failed|pending}"

case "$STATE" in
  success) DESC="Shadow integration passed on root repo" ;;
  failed)  DESC="Shadow integration failed — check root repo pipeline" ;;
  pending) DESC="Shadow integration running" ;;
  *)
    echo "Unknown state: $STATE"
    exit 1
    ;;
esac

if [ -z "${SOURCE_PROJECT_ID:-}" ]; then
  echo "No SOURCE_PROJECT_ID — skipping status report"
  exit 0
fi

if [ -z "${M_GROUP_TOKEN:-}" ]; then
  echo "M_GROUP_TOKEN not set — cannot push commit statuses"
  exit 1
fi

echo "Reporting shadow integration status ($STATE) to $SOURCE_PROJECT_PATH"

REPOS="<project>-root <project>-<component-1> <project>-<component-2> ..."
GROUP="<project.group>"
API="https://gitlab.com/api/v4"

for repo in $REPOS; do
  PROJECT_PATH="$GROUP/$repo"
  ENCODED_PATH=$(printf '%s' "$PROJECT_PATH" | sed 's|/|%2F|g')

  # Find the most recent open MR on this repo
  MR_DATA=$(curl -s \
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \
    "$API/projects/$ENCODED_PATH/merge_requests?state=opened&per_page=1")

  MR_SHA=$(printf '%s' "$MR_DATA" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (Array.isArray(data) && data.length > 0) console.log(data[0].sha);
  ")

  if [ -z "$MR_SHA" ]; then
    echo "  $repo: no open MR, skipping"
    continue
  fi

  echo "  $repo: pushing $STATE to commit $MR_SHA"
  curl -s --request POST \
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \
    "$API/projects/$ENCODED_PATH/statuses/$MR_SHA" \
    --form "state=$STATE" \
    --form "name=shadow-integration" \
    --form "description=$DESC" \
    --form "target_url=$CI_PIPELINE_URL" > /dev/null
done

echo "Shadow status fan-out complete."
```

The `REPOS=` line follows the canonical M rule: `<project>-root`
first, then `<project>-<component.name>` for each `type: referenced`
component in declaration order. Embedded components are excluded —
they live inside the root repo and do not have their own story MRs.
This script is the canonical derivation point for the `REPOS` list
in M (see `wire-orchestration` SKILL's "Repo Lists Must Include
Root" section). `scripts/integration-test.sh` (owned by the compose
provider) does NOT contain a `REPOS=` list — it verifies the
running system, not the SCM integrity surface.

The `GROUP=` and `API=` lines are substituted from project.yaml (and
the gitlab host, currently pinned to `gitlab.com`) at render time, so
the script never has to parse project.yaml at runtime.

Authentication: the script expects `M_GROUP_TOKEN` (a
GitLab Personal Access Token or Group Access Token with `api` scope)
to be set as a CI variable on the root repo. `wire-orchestration` is
responsible for provisioning this token — this script assumes it is
already in place.

Dependencies: `curl` and `node` — both present in the shadow:compose
image (alpine + `apk add --no-cache git curl` + `node:20` base image).
No additional install steps required.

### Determinism notes

- Clone commands emitted in declaration order of `project.components[]`.
- `REPOS=` list in the same order.
- No timestamps, no job IDs, no environment-dependent substitutions
  at render time — all runtime state (MR SHA, pipeline URL, source
  project ID) is read at script execution time.

## Invariants enforced by this provider

- **Pure function of inputs.** Same `project` + same `scm` → byte-identical
  output.
- **Topology-derived values are substituted, not hardcoded.** Clone
  URLs, GROUP, referenced-repo list, shell location — all read from
  `project.yaml`.
- **Health check logic is NOT inlined in the CI YAML.** It lives in
  `scripts/integration-test.sh` (emitted by `compose/docker-compose`)
  and is invoked via `sh scripts/integration-test.sh`. The CI provider
  only knows the script exists; it does not know how the checks work.
- **Status reporting logic is NOT inlined.** Extracted to
  `scripts/report-shadow-status.sh`, parameterised by state.
- **Shell lifecycle jobs are conditional on having an embedded
  frontend-host.** Projects without a shell do not get install/build/test
  jobs or the corresponding stages.

## Gotchas

- **`SOURCE_PROJECT_ID`, `SOURCE_PROJECT_PATH`, `M_GROUP_TOKEN`, and
  `CI_JOB_TOKEN`** are runtime CI variables set by GitLab or by
  `wire-orchestration`'s webhook configuration. The provider emits
  scripts that expect them but does not define them — the wiring
  capability owns that contract.
- **`curl` and `node` are the only external deps in the status
  script.** Both are present in the shadow:compose job's image
  (alpine base + apk add git curl + node:20 base). Do not switch to
  `glab` without first solving the alpine install story (I-048).
- **`merge_request_event` + `main` dual rules** — both are required for
  validate:compose and validate:integration-test. Removing either breaks
  the corresponding pipeline trigger.
- **`resource_group: distributed_merge`** on merge-transaction prevents
  concurrent merges from racing. Do not remove.
- **`DOCKER_TLS_CERTDIR` is required for DinD.** Removing it will cause
  the job to fail with obscure TLS handshake errors.
