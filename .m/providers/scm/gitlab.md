# SCM Provider: GitLab

Implementation of the `scm.*` functions for GitLab. This is the reference
provider — the one used by the reference implementation (todo-m-workshop).

When executing M capabilities against GitLab, read this file to understand
how each `scm.*` function maps to GitLab API calls and MCP tools.

## MCP tools

This provider uses two GitLab MCP servers:
- `gitlab_ops` — project/group management, branch protection, webhooks, tokens
- `gitlab` — file operations, commits, MR management

---

## scm.create_group

Create a GitLab group or subgroup.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_group

Parameters:
  name: <name>
  path: <path>
  visibility: <visibility>
  description: <description>
  parent_id: <parent_id>          # omit for top-level group
```

**Gotchas:**
- **GitLab.com SaaS:** Top-level group creation via API is disabled.
  Create parent group manually via UI, then use `parent_id` for subgroup.
- **GitLab Self-Managed:** Both top-level and subgroup creation work via API.

---

## scm.resolve_group_id

Resolve a group path (e.g. `methodology-m`) to a numeric group ID.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_get_group

Parameters:
  group_path: <path>

Returns: group.id
```

---

## scm.resolve_project_id

Resolve a project path (e.g. `methodology-m/todo-m-workshop/todo-m-api-read`)
to a numeric project ID.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_get_project

Parameters:
  project_path: <path>

Returns: project.id
```

---

## scm.create_repo

Create a new GitLab project (repo) in a namespace.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_project

Parameters:
  name: <name>
  namespace_id: <namespace_id>
  initialize_with_readme: false    # CRITICAL — see note
```

**Gotchas:**
- Do NOT set `initialize_with_readme: true`. The seed commit in the
  capability includes a project-specific README. Initialising with
  GitLab's default README causes a conflict when pushing seed files.

---

## scm.push_files

Push multiple files in a single commit to a repo.

```
MCP: gitlab
Tool: mcp_gitlab_push_files

Parameters:
  project_id: <project_id>
  branch: <branch>
  commit_message: <message>
  files: [
    { file_path: <path>, content: <content> },
    ...
  ]
```

**Gotchas:**
- `push_files` rejects commits that touch files already existing on
  the branch. For re-runs on partially seeded repos, use
  `scm.create_or_update_file()` per file instead.

---

## scm.create_or_update_file

Create or update a single file in a repo.

```
MCP: gitlab
Tool: mcp_gitlab_create_or_update_file

Parameters:
  project_id: <project_id>
  file_path: <path>
  content: <content>
  commit_message: <message>
  branch: <branch>
```

---

## scm.protect_branch

Set branch protection to merge-only (no direct push).

GitLab auto-protects `main` on repo creation with `push_access_level: 40`
(maintainers can push). There is **no update API** for existing protection.
The sequence is: unprotect first, then re-protect with correct settings.

```
# Step 1: Remove existing protection
MCP: gitlab_ops
Tool: mcp_gitlab_ops_unprotect_branch

Parameters:
  project_id: <project_id>
  branch: "main"

# Step 2: Re-protect with M settings
MCP: gitlab_ops
Tool: mcp_gitlab_ops_protect_branch

Parameters:
  project_id: <project_id>
  branch: "main"
  push_access_level: 0              # no one pushes directly
  merge_access_level: 40            # maintainer-level merge
  allow_force_push: false
```

**Gotchas:**
- `protect_branch` returns **409 Conflict** if protection already exists.
  Always unprotect first.
- Seed files (push_files) must complete BEFORE protect_branch. Once
  `push_access_level: 0` is set, even the MCP token cannot push
  directly — only MR merges work.

---

## scm.create_access_token

Create a project access token for the merge transaction pipeline.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_project_access_token

Parameters:
  project_id: <project_id>
  name: "m-merge-transaction"
  scopes: ["api", "read_repository", "write_repository"]
  access_level: 40                  # maintainer
  expires_at: <1-year-from-now>

Returns: token value (store securely — shown only once)
```

**Gotchas:**
- **Premium+ only.** Project access tokens are not available on GitLab
  free tier.
- **Free tier fallback:** Use a personal access token (PAT) with `api`
  scope that covers the entire group. The same PAT is stored once as a
  CI variable on the root repo and used for all managed repos. Less
  granular (one token for everything vs one per repo) but functionally
  equivalent.

---

## scm.create_pipeline_trigger

Create a pipeline trigger token on a repo. Used by managed repo webhooks
to kick off shadow integration.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_pipeline_trigger

Parameters:
  project_id: <root-project-id>
  description: "m-shadow-integration-trigger"

Returns: trigger token value
```

---

## scm.create_webhook

Install a webhook on a repo that fires on specific events.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_webhook

Parameters:
  project_id: <project_id>
  url: "https://gitlab.com/api/v4/projects/<root-project-id>/trigger/pipeline?token=<trigger-token>&ref=main"
  merge_requests_events: true
  push_events: false                # CRITICAL — see note
  enable_ssl_verification: true
```

**Gotchas:**
- GitLab **defaults `push_events` to `true`** when creating a webhook,
  even if not specified in the API call. You MUST explicitly set
  `push_events: false`. Without this, every push to a managed repo
  triggers a root repo pipeline — causing noise and wasted CI minutes.

---

## scm.store_ci_secret

Store a secret as a CI variable on a repo.

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_ci_variable

Parameters:
  project_id: <project_id>
  key: <key>                        # e.g. M_TOKEN_API_READ
  value: <value>
  protected: true                   # only on protected branches
  masked: true                      # hidden in job logs
```

---

## scm.post_commit_status

Report a build status (pass/fail) on a specific commit. Used by shadow
integration to push results back to managed repo MRs.

```
GitLab API (direct HTTP call — no MCP tool available):

POST /projects/<project_id>/statuses/<commit_sha>
Headers:
  PRIVATE-TOKEN: <M_GROUP_TOKEN>
Body:
  state: success | failed
  name: "shadow-integration"
  description: <human-readable message>
  target_url: <link to root pipeline>
```

**Gotchas:**
- Requires a token with `api` scope on the target repo. The
  `M_GROUP_TOKEN` (group-level token) covers all managed repos.
- This is typically called from CI scripts, not from MCP tools.
  The root repo's `.gitlab-ci.yml` shadow:report-status job uses
  `curl` to call this API.

---

## CI-Specific Notes

### Pipeline configuration file

GitLab CI uses `.gitlab-ci.yml` at the repo root.

### Workflow rules (prevent duplicate pipelines)

```yaml
workflow:
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == "main"
```

Without workflow rules, GitLab creates two pipelines for the same commit
when an MR exists: one for the branch push, one for the MR event.

### Resource groups (merge transaction serialisation)

```yaml
merge-transaction:
  resource_group: distributed_merge
```

Ensures only one merge transaction runs at a time across the entire project.

### Docker-in-Docker for compose

```yaml
image: docker:latest
services:
  - docker:dind
variables:
  DOCKER_TLS_CERTDIR: "/certs"
```

**DinD networking:** Published ports bind on the `docker` service
container's network interface. Health checks must use hostname `docker`,
not `localhost`:
```
DOCKER_GATEWAY="${DOCKER_GATEWAY:-docker}"
curl http://${DOCKER_GATEWAY}:3000/health
```

### Project settings

After scaffolding, set `only_allow_merge_if_pipeline_succeeds: true`
on every repo. Without this, MRs can be merged while the pipeline is
still running or failing.
