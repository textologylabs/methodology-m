# Provider Interface

This document defines the function namespaces that M capabilities call,
and the protocol for resolving those calls to concrete implementations.

## Resolution Protocol

1. Capability calls a namespaced function, e.g. `scm.create_repo(...)`
2. The namespace prefix (`scm`) identifies the provider category
3. `project.yaml` declares which provider is active per category:
   ```yaml
   providers:
     scm: gitlab
   ```
4. The agent reads `.m/providers/<category>/<provider>.md` to find the
   function's concrete implementation (API calls, MCP tools, CLI commands)
5. The agent executes the concrete implementation

Config resolution for the provider choice itself follows the standard
M hierarchy:

```
Repo-level override → Project-level (project.yaml) → Org Config → M Core Config
```

## Namespaces

### `scm` — Source Code Management

Repo and project lifecycle, branch protection, webhooks, CI secrets,
and commit status reporting.

**Active providers:** `gitlab` (reference implementation), `log-only` (dry-run testing — logs all calls, returns mock responses, no side effects)

#### Functions

| Function | Parameters | Returns | Used by |
|---|---|---|---|
| `scm.create_group` | `name`, `path`, `visibility`, `description`, `parent_id?` | group ID | setup-workspace |
| `scm.resolve_group_id` | `group_path` | group ID | setup-workspace |
| `scm.resolve_project_id` | `project_path` | project ID | wire-orchestration |
| `scm.create_repo` | `name`, `namespace_id`, `initialize_readme` | repo URL, project ID | bootstrap-root-repo, scaffold-repo |
| `scm.push_files` | `repo`, `branch`, `files[]`, `commit_message` | commit SHA | bootstrap-root-repo, scaffold-repo |
| `scm.push_or_update_files` | `repo`, `branch`, `files[]`, `commit_message` | commit SHA | compile-story-pats |
| `scm.create_or_update_file` | `repo`, `path`, `content`, `commit_message`, `branch` | commit SHA | scaffold-repo (re-run) |
| `scm.protect_branch` | `repo`, `branch`, `push`, `merge`, `force_push` | — | scaffold-repo, wire-orchestration |
| `scm.create_access_token` | `repo`, `name`, `scopes[]`, `access_level`, `expiry` | token value | scaffold-repo |
| `scm.create_pipeline_trigger` | `repo`, `description` | trigger token | wire-orchestration |
| `scm.create_webhook` | `repo`, `url`, `events{}`, `ssl_verify` | webhook ID | wire-orchestration |
| `scm.store_ci_secret` | `repo`, `key`, `value`, `protected`, `masked` | — | wire-orchestration |
| `scm.post_commit_status` | `repo`, `sha`, `state`, `name`, `description`, `target_url` | — | wire-orchestration (CI scripts) |
| `scm.create_branch` | `repo`, `branch`, `ref` | — | compile-story-pats |
| `scm.create_merge_request` | `repo`, `source_branch`, `target_branch`, `title`, `description?` | MR URL | compile-story-pats |

#### Function Contracts

**`scm.create_group(name, path, visibility, description, parent_id?)`**

Create a group/org on the SCM platform. If `parent_id` is provided,
creates a subgroup. Returns the group ID.

---

**`scm.resolve_group_id(group_path)`**

Resolve a human-readable group path (e.g. `methodology-m`) to the
platform's internal group ID. Needed when other functions require
numeric IDs.

---

**`scm.resolve_project_id(project_path)`**

Resolve a project path (e.g. `methodology-m/todo-m-workshop/todo-m-api-read`)
to the platform's internal project ID.

---

**`scm.create_repo(name, namespace_id, initialize_readme)`**

Create a new repository. `initialize_readme` MUST default to `false` —
M capabilities seed repos with their own initial commit. A platform
default README causes merge conflicts with the seed.

---

**`scm.push_or_update_files(repo, branch, files[], commit_message)`**

Push a batch of file actions in a single commit. Each entry is one
of three kinds, distinguished by an optional `action` field:

- `{ path, content }` — create-or-update. Provider decides per file
  whether the concrete call is a create or an update; caller does
  not need to know or precheck.
- `{ path, content, action: 'create-or-update' }` — explicit form
  of the above (equivalent to omitting `action`).
- `{ path, action: 'delete' }` — delete the file from the branch.
  `content` is ignored if present.

Used by `compile-story-pats` (gate MR push — mixes new story
artefacts, regenerated topology files, and — for structural REMOVE —
deletions of historical compiled CATs) and `decompose-story` Phase B
(topology artefact regeneration — pure create-or-update mix).

`scm.push_files` is NOT suitable for these uses because it rejects
any file that already exists and has no delete shape. Providers MAY
implement this atomically (preferred — single commit via a bulk-
commit API supporting mixed actions) or as a sequence of per-action
calls (acceptable fallback — N commits in declaration order). The
function contract does not require atomicity; callers should not
assume a single commit SHA can roll back the whole batch.

Returns the SHA of the last commit produced. Fails if the branch
does not exist or any individual action fails.

---

**`scm.push_files(repo, branch, files[], commit_message)`**

Push multiple files in a single atomic commit. Each file entry contains
`path` and `content`. Fails if any file already exists on the branch —
use `scm.create_or_update_file()` for idempotent writes.

---

**`scm.create_or_update_file(repo, path, content, commit_message, branch)`**

Create or overwrite a single file. Idempotent — safe for re-runs on
partially seeded repos.

---

**`scm.protect_branch(repo, branch, push, merge, force_push)`**

Set branch protection rules. M requires:
- `push: none` — no direct pushes, all changes via MR/PR
- `merge: maintainer` — only maintainer-level can merge
- `force_push: false`

The provider implementation must handle platform quirks (e.g. removing
existing protection before applying new rules).

---

**`scm.create_access_token(repo, name, scopes[], access_level, expiry)`**

Create a scoped token for automated operations on this repo. Used by
the merge transaction pipeline. Token value is returned once and must
be stored immediately via `scm.store_ci_secret()`.

Provider must document fallback options for platforms/tiers where
per-repo tokens are unavailable.

---

**`scm.create_pipeline_trigger(repo, description)`**

Create a trigger mechanism that external webhooks can use to start
CI pipelines on this repo. Returns a token or URL.

---

**`scm.create_webhook(repo, url, events{}, ssl_verify)`**

Install a webhook on a repo. `events` specifies which events fire
the webhook. For M, only MR/PR events should trigger — push events
MUST be explicitly disabled.

---

**`scm.store_ci_secret(repo, key, value, protected, masked)`**

Store a secret as a CI environment variable on a repo. `protected`
means only available on protected branches. `masked` means hidden
in job logs.

---

**`scm.post_commit_status(repo, sha, state, name, description, target_url)`**

Report a build/test status on a specific commit. Used by shadow
integration to push results back to managed repo MRs. `state` is
one of: `success`, `failed`, `pending`.

---

**`scm.create_branch(repo, branch, ref)`**

Create a new branch from an existing ref (branch, tag, or SHA).
Used by `compile-story-pats` to create the root repo's story branch
for the integration gate.

---

**`scm.create_merge_request(repo, source_branch, target_branch, title, description?)`**

Create a merge request / pull request. Returns the MR URL. Used by
`compile-story-pats` to raise the root repo MR that establishes the
integration gate from the moment the story is decomposed.

---

### `compose` — Compose orchestration and aliveness

Declarative service composition, topology aliveness probes, and the scripts
that bring the running system up and verify it. A compose provider owns the
strategy-specific file formats (docker-compose vs. kubernetes vs. podman) and
the probe script that reaches running services through that strategy's network.

**Active providers:** `docker-compose` (reference implementation).

#### Functions

| Function | Parameters | Returns | Used by |
|---|---|---|---|
| `compose.render_topology` | `project` | `[{path, content}, ...]` | render-topology-artefacts |

#### Function Contracts

**`compose.render_topology(project)`**

Render the full set of compose-strategy-specific files from a parsed
`project.yaml`. Returns a list of `{path, content}` entries. Paths are
relative to the root repo directory.

The function MUST be a pure function of `project`: same input → byte-identical
output. No timestamps, no randomness, no reads of any other file. Determinism
is enforced so that the render step is a safe refactor-target and its output
can be diffed against a pre-refactor baseline.

The reference provider `compose/docker-compose` returns:
- `docker-compose.yml` — services block derived from `project.components[]`,
  ports, build contexts, persistence volumes, depends_on chain.
- `scripts/integration-test.sh` — topology aliveness probes (one `check` call
  per component) against the running system. Does NOT contain a story
  integrity gate — that concern belongs to `wire-orchestration` and
  operates against the SCM API, not the filesystem. Embeds
  `DOCKER_GATEWAY="${DOCKER_GATEWAY:-docker}"` as a pinned default so
  the script works both inside CI (where `DOCKER_GATEWAY` is set by
  the job) and locally.

A kubernetes or podman provider returns a different file set appropriate to
its strategy.

The caller (render-topology-artefacts) is responsible for writing the files
to disk. The provider never touches the filesystem.

---

### `ci` — CI pipeline and status reporting

CI pipeline configuration and the helper scripts it invokes (status
reporting, fan-out). A CI provider is typically — but not necessarily —
paired with an `scm` provider, because the pipeline config format is tied
to the SCM platform (`.gitlab-ci.yml` vs `.github/workflows/*.yml` vs
`Jenkinsfile`) and helper scripts call the SCM platform's CLI (`glab`, `gh`).

**Active providers:** `gitlab` (reference implementation).

#### Functions

| Function | Parameters | Returns | Used by |
|---|---|---|---|
| `ci.render_pipeline` | `project`, `scm` | `[{path, content}, ...]` | render-topology-artefacts |
| `ci.render_managed_pipeline` | `repoType` | `[{path, content}, ...]` | scaffold-repo |

#### Function Contracts

**`ci.render_pipeline(project, scm)`**

Render the full set of CI-platform-specific files from a parsed `project.yaml`
and the name of the active `scm` provider (so helper scripts can emit the
right CLI syntax). Returns a list of `{path, content}` entries.

Pure function — same determinism requirements as `compose.render_topology`.

The reference provider `ci/gitlab` returns:
- `.gitlab-ci.yml` — stages (install → build → test → compose → integration-test
  → report-status → merge-transaction), job definitions, rules for MR and main
  branch events, fan-out jobs invoking `scripts/report-shadow-status.sh`,
  per-component health checks derived from `project.components[]`.
- `scripts/report-shadow-status.sh` — iterates the integrity-gate repo list
  (referenced components + root) and calls `scm.post_commit_status` via the
  CLI syntax corresponding to the `scm` provider parameter (`glab` for GitLab,
  `gh` for GitHub, etc.).

A `ci/github` provider would return `.github/workflows/ci.yml` and a
gh-flavored status script. Jenkins, CircleCI, etc. analogous.

The caller (render-topology-artefacts) resolves the active scm provider from
`project.yaml`'s `providers.scm` field and passes it to this function.

---

**`ci.render_managed_pipeline(repoType)`**

Render a **managed** repo's CI pipeline file(s). Unlike the root pipeline,
the managed-repo lifecycle pipeline (install → build → test → snapshot →
tag → report-*) has no `project.yaml` dependence — it is static per
`repoType`. Returns the same `[{path, content, mode}]` shape as
`ci.render_pipeline`.

Determinism still holds: same `repoType` → byte-identical output. The
reference provider `ci/gitlab` serves the file verbatim from a
version-controlled template (`gitlab/templates/managed-pipeline.yml`)
rather than string-building it — a static asset, not a hidden input.

The reference provider supports `repoType: node` and throws for others
(other repo types share the lifecycle phases but need a template with
the right package manager).

Used by `scaffold-repo` Step 3 to seed a managed repo's `.gitlab-ci.yml`.
Keeping it in the `ci` provider means all CI-platform knowledge lives in
one place — a `ci/github` provider would emit `.github/workflows/` for
both root and managed repos, and `scaffold-repo` stays provider-agnostic.

---

### `test.cat` — Compiled Acceptance Test generation

Compilation of PAT yaml contracts into executable test specs (CATs).
A `test.cat` provider owns the mapping from PAT step grammar to a
specific test framework. Story-level PATs compile to integration-gate
specs (via `compile-story-pats`). Sub-task PATs compile to repo-level
specs (via `generate-acceptance-tests`). Both consumers dispatch
through the same namespace.

**Active providers:** `cypress` (reference implementation for browser
step types), `log-only` (trace stub). Additional providers (`curl`,
`supertest`) land in v0.8.0 alongside I-045's HTTP step types.

**Selected via `project.yaml`:**

```yaml
providers:
  test:
    cat: cypress
```

#### Functions

| Function | Parameters | Returns | Used by |
|---|---|---|---|
| `test.cat.compile_story_pat` | `pat` (parsed story-level PAT) | `{path, content, mode}` | compile-story-pats |

Each provider module also exports a `spec_extension` string constant
(e.g. `.cy.js`, `.trace.txt`) used by the orchestrator for filename
resolution.

#### Function Contracts

**`test.cat.compile_story_pat(pat)`**

Compile a story-level PAT into an executable spec file. Returns one
`{path, content, mode}` entry. The orchestrator writes the file to
disk; the provider never touches the filesystem.

Pure function of `pat`. Same input produces byte-identical output.
No filesystem reads, no timestamps, no randomness. Determinism is
enforced so the compile step is a safe refactor-target and its
output can be diffed against a pre-refactor baseline.

**Input validation:** providers MUST raise a clear error if the
input is not a story-level PAT (e.g. lacks `story:` or has a
sub-task shape). Sub-task PATs compile via
`generate-acceptance-tests` using the same namespace but a
different (future) entry point; the two paths must not silently
accept each other's inputs.

**Rejected step types:** the `cypress` provider rejects `render:`
steps (sub-task component-test mocks). Future providers may reject
or compile step types based on their framework capabilities.

---

## Adding a New Namespace

When a new provider category is needed (e.g. `deploy.*`):

1. Add the namespace to this document with its function signatures
2. Create a provider implementation at `.m/providers/<category>/<provider>.md`
3. Add the category to `project.yaml` under `providers:`
4. Update capabilities to use the new namespaced functions

## Adding a New Provider

To implement an existing namespace for a new platform (e.g. `scm/github`):

1. Create `.m/providers/<category>/<provider>.md`
2. Implement every function listed in the namespace's contract above
3. Document all platform-specific gotchas in the provider file
4. The provider is selectable via `project.yaml`:
   ```yaml
   providers:
     scm: github
   ```
