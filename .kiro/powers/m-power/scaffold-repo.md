# M Power: scaffold-repo

**Capability:** Create and configure a managed repo for an M-type project

## What it does

Creates a managed repo on GitLab from a sub-task file, seeds it with
project files, and installs a pluggable CI pipeline. After this step,
the repo is ready to receive implementation work — a dev can create a
branch, raise an MR, and the pipeline will build, test, publish a
snapshot artefact, and auto-tag on merge.

## Parameters

| Parameter      | Type   | Required | Description                                         |
|----------------|--------|----------|-----------------------------------------------------|
| sub-task-file  | path   | Yes      | Path to the sub-task markdown file                   |
| project-yaml   | path   | Yes      | Path to project.yaml (for group path, project name)  |
| repo-type      | string | No       | "node", "python", "rust", etc. (default: node)       |
| namespace-id   | string | No       | GitLab namespace ID (extracted from project if omitted) |

The sub-task file is the primary input. It contains the component name,
repo name, parent story reference, and repo-level PAT stubs. The
project.yaml provides the group path and project-level context.

## Execution

### Step 1 — Extract metadata

Read the sub-task file. Extract:
- Component name (from `Component:` field)
- Repo name (from `Repo:` field)
- Parent story ID (from `Parent:` field)
- Repo-level PAT stubs (from `## PAT Stubs` section)

Read project.yaml. Extract:
- Group path (from `group:` field)
- Project name (from `project:` field)

### Step 2 — Create the repo

Create the repo in the GitLab group using `gitlab-ops create_project`
with `namespace_id`. Do NOT initialise with README — the seed commit
includes a project-specific README.

### Step 3 — Seed project files

Push all seed files in a single commit using `gitlab push_files`:

- `README.md` — component name, parent story reference, repo-level PATs
- `.gitlab-ci.yml` — pluggable lifecycle pipeline (see Pipeline Template)
- `package.json` (or equivalent for repo-type) — with lifecycle scripts
- `jira/<sub-task-id>.md` — copy of the sub-task file
- `pats/<sub-task-id>.stub` — PAT stub file extracted from the sub-task

**Important:** Because the repo was created without `initialize_with_readme`
(Step 2), all files are new and `push_files` works cleanly. If any files
already exist (e.g. re-running scaffold on a partially seeded repo), use
`gitlab create_or_update_file` per file instead — `push_files` rejects
commits that touch existing files.

### Step 4 — Reconfigure branch protection

GitLab auto-protects `main` on repo creation with `push_access_level: 40`
(maintainers can push). The methodology requires `push_access_level: 0`
(no one pushes — all changes via MR).

The sequence is:
1. `gitlab-ops unprotect_branch` — remove the default protection
2. `gitlab-ops protect_branch` — re-protect with the correct settings:
   - `push_access_level: 0` — nobody pushes directly
   - `merge_access_level: 40` — maintainer-level merge (used by merge transaction)
   - `allow_force_push: false`

**Why unprotect first:** `protect_branch` returns 409 if protection already
exists. There is no `update_protected_branch` API. The unprotect/re-protect
sequence is the only way to change protection settings.

**Ordering matters:** Step 3 (seed files) must complete before Step 4
(protect branch). Once push_access_level=0 is set, even the MCP token
cannot push directly — only MR merges work.

### Step 5 — Create project access token (Premium+ only)

On GitLab Premium or Ultimate, create a project access token using
`gitlab-ops create_project_access_token`:
- Name: `m-merge-transaction`
- Scopes: `api`, `read_repository`, `write_repository`
- Access level: 40 (maintainer)
- Expires: 1 year from creation

This token is used by the root repo's merge transaction pipeline to
merge MRs on this managed repo. Store the token value — it will be
passed to `wire-orchestration` for installation as a root repo CI variable.

**Free tier fallback:** Project access tokens are not available on GitLab
free tier. Instead, use a personal access token (PAT) with `api` scope
that covers the entire group. The same PAT is stored once as a CI variable
on the root repo and used for all managed repos. Less granular (one token
for everything vs one per repo) but functionally equivalent.

### Step 6 — Report

Output:
- Repo URL
- Branch protection status (push: no one, merge: maintainers)
- Access token status (project token created / free tier — use group PAT)
- Summary of seeded files

Note that `wire-orchestration` should be run after all managed repos
are scaffolded to connect them to the root repo.

## Pipeline Template

The `.gitlab-ci.yml` uses a pluggable lifecycle model. The pipeline
defines WHEN things run. The project's build scripts define WHAT runs.

```
# .gitlab-ci.yml — M-type managed repo pipeline
# Lifecycle phases are delegated to project scripts.
# The pipeline orchestrates; the scripts implement.

stages:
  - install
  - build
  - test
  - snapshot
  - tag

# --- Always run ---

install:
  stage: install
  script:
    - npm ci
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

build:
  stage: build
  script:
    - npm run build --if-present
  needs: [install]

test:
  stage: test
  script:
    - npm test
  needs: [build]

# --- MR pipelines only: publish snapshot artefact ---

snapshot:
  stage: snapshot
  script:
    - npm run snapshot --if-present
  rules:
    - if: $CI_MERGE_REQUEST_IID
  needs: [test]

# --- Merge to main only: auto-tag ---

tag:
  stage: tag
  script:
    - npm run tag --if-present
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  needs: [test]
```

### Lifecycle scripts (package.json)

The scaffold creates placeholder scripts. The implementation step
replaces them with real commands.

```
{
  "scripts": {
    "build": "echo 'no build step configured'",
    "test": "echo 'no tests configured' && exit 0",
    "snapshot": "echo 'snapshot: not yet implemented'",
    "tag": "echo 'auto-tag: not yet implemented'"
  }
}
```

### Lifecycle phase contract

| Phase      | Trigger                  | Purpose                              | Failure behaviour        |
|------------|--------------------------|--------------------------------------|--------------------------|
| `install`  | Every pipeline           | Install dependencies                 | Pipeline fails           |
| `build`    | Every pipeline           | Compile, bundle, transpile           | Pipeline fails           |
| `test`     | Every pipeline           | Run repo-level PATs and unit tests   | Pipeline fails, MR blocked |
| `snapshot` | MR pipelines only        | Publish pre-release artefact         | MR can't shadow-integrate |
| `tag`      | Merge to main only       | Create semver tag on the new commit  | Manual tag required       |

The `--if-present` flag on npm run means phases without a script
silently succeed. This lets the scaffold work out of the box before
implementation fills in the real scripts.

### Snapshot artefact convention

On MR pipelines, the `snapshot` phase publishes a pre-release artefact
that the root repo's shadow integration can reference. The convention:

- Git tag: `v0.0.0-mr.<MR_IID>` on the MR branch head commit
- The root repo's topology MR pins to this tag
- The tag is lightweight (not annotated) — it's ephemeral

This works on GitLab free tier without a package registry. The root
repo clones the managed repo at the snapshot tag to compose the system.

### Auto-tag convention

On merge to main, the `tag` phase creates an annotated semver tag.
Version bumping strategy is determined by the project — the scaffold
provides the hook, the implementation decides the logic.

## Notes

- The pipeline template shown is for `repo-type: node`. Other repo
  types follow the same lifecycle phases but use different package
  managers (pip, cargo, etc.)
- The pipeline is intentionally minimal — no Docker, no registry, no
  deployment. Those are concerns for later stages.
- Branch protection requires an unprotect/re-protect sequence because
  GitLab auto-protects `main` on repo creation and there is no API to
  update existing protection settings.
- On free tier, project access tokens are unavailable. Use a group-level
  personal access token as fallback. Document this in the report step.
- When re-running scaffold on a partially seeded repo, use
  `create_or_update_file` instead of `push_files` for any files that
  may already exist. `push_files` rejects commits with existing files.
- `scaffold-repo` does NOT set up webhooks or root repo CI — that's
  `wire-orchestration`.
