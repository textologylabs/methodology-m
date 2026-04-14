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
| `scm.create_or_update_file` | `repo`, `path`, `content`, `commit_message`, `branch` | commit SHA | scaffold-repo (re-run) |
| `scm.protect_branch` | `repo`, `branch`, `push`, `merge`, `force_push` | — | scaffold-repo, wire-orchestration |
| `scm.create_access_token` | `repo`, `name`, `scopes[]`, `access_level`, `expiry` | token value | scaffold-repo |
| `scm.create_pipeline_trigger` | `repo`, `description` | trigger token | wire-orchestration |
| `scm.create_webhook` | `repo`, `url`, `events{}`, `ssl_verify` | webhook ID | wire-orchestration |
| `scm.store_ci_secret` | `repo`, `key`, `value`, `protected`, `masked` | — | wire-orchestration |
| `scm.post_commit_status` | `repo`, `sha`, `state`, `name`, `description`, `target_url` | — | wire-orchestration (CI scripts) |
| `scm.create_branch` | `repo`, `branch`, `ref` | — | decompose-story |
| `scm.create_merge_request` | `repo`, `source_branch`, `target_branch`, `title`, `description?` | MR URL | decompose-story |

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
Used by `decompose-story` to create the root repo's story branch
for the integration gate.

---

**`scm.create_merge_request(repo, source_branch, target_branch, title, description?)`**

Create a merge request / pull request. Returns the MR URL. Used by
`decompose-story` to raise the root repo MR that establishes the
integration gate from the moment the story is decomposed.

---

## Adding a New Namespace

When a new provider category is needed (e.g. `test.cat.*`):

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
