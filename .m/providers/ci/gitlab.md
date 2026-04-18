# CI Provider: gitlab

Reference implementation of the `ci.*` namespace for GitLab CI. Emits
`.gitlab-ci.yml` (pipeline configuration) and
`scripts/report-shadow-status.sh` (helper that pushes commit statuses
to sibling repos).

Select by setting `providers.ci: gitlab` in `project.yaml`. If
`providers.ci` is omitted and `providers.scm` is `gitlab`, this
provider is the default — CI and SCM are tightly coupled because the
pipeline config format is platform-specific and the status helper
shells out to the SCM platform's REST API.

## Function: `ci.render_pipeline(project, scm)`

**Parameters:** parsed `project` object and the name of the active
`scm` provider (must be `'gitlab'`; any other value is an error
because `.gitlab-ci.yml` is not portable).

**Returns:** list of `{path, content, mode}` entries:

- `.gitlab-ci.yml` (mode 0o644) — workflow rules, stages, job
  definitions. All topology-derived values (clone URLs, repo lists,
  group path, shell location) are substituted from `project.yaml` at
  render time.
- `scripts/report-shadow-status.sh` (mode 0o755) — POSIX sh helper
  invoked by `shadow:report-status` and `shadow:report-failure`. Takes
  a single argument (`success`/`failed`/`pending`) and pushes a commit
  status to each referenced repo's most-recent open MR via the
  GitLab REST API.

Both files are pure functions of the inputs. No filesystem reads.

**Implementation:** see [`./gitlab.mjs`](./gitlab.mjs). The code is
the source of truth for rendering behaviour; this document describes
the contract only.

## Invariants

- **Pure function of inputs.** Same `(project, scm)` → byte-identical
  output across invocations.
- **Topology-derived values are substituted, not hardcoded.** Clone
  URLs, GROUP, referenced-repo list, shell location — all read from
  `project.yaml`.
- **Health check logic is NOT inlined in the CI YAML.** It lives in
  `scripts/integration-test.sh` (emitted by `compose/docker-compose`)
  and is invoked via `sh scripts/integration-test.sh`. This CI provider
  only knows the script exists.
- **Status reporting logic is NOT inlined.** Extracted to
  `scripts/report-shadow-status.sh`, parameterised by state.
- **Shell-lifecycle jobs are conditional on an embedded frontend-host.**
  When a project has no `type: embedded, role: frontend-host` component,
  the `install`, `build`, and `test` jobs are omitted and the matching
  stages are dropped from the `stages:` list. In that case,
  `validate:compose`'s `needs:` becomes `[]` instead of `[test]`.
- **`REPOS=` in the status script lists root first**, then each
  referenced component as `<project>-<component.name>` in declaration
  order. Embedded components are excluded — they live inside the root
  repo and do not have their own story MRs.
- **`resource_group: distributed_merge`** on `merge-transaction`
  prevents concurrent merges from racing.

## Runtime environment contracts (owned by wire-orchestration)

The emitted scripts expect the following CI variables. They are set
by GitLab or by `wire-orchestration`'s webhook configuration; this
provider does not define them:

- `CI_JOB_TOKEN` — used in clone URLs.
- `SOURCE_PROJECT_ID`, `SOURCE_PROJECT_PATH` — set when a pipeline is
  triggered by a sibling-repo webhook.
- `M_GROUP_TOKEN` — a GitLab PAT/Group token with `api` scope. Required
  by `report-shadow-status.sh` to push commit statuses.

## Dependencies inside the CI image

`curl` and `node` are required by `report-shadow-status.sh`. Both are
present in the `shadow:compose` image (alpine base + `apk add
--no-cache git curl` in `before_script` + `node:20` base image). No
additional install steps required. Switching to the `glab` CLI is
tracked under **I-048**.

## Regression coverage

Every branch above is exercised by [`./gitlab.test.mjs`](./gitlab.test.mjs)
against the four shared fixtures in `.m/test-fixtures/`. Extending
the provider requires adding tests to that suite first.
