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
- `.gitignore` — standard ignores for the repo type (e.g. `node_modules/`)
- `package.json` (or equivalent for repo-type) — with lifecycle scripts
- `package-lock.json` — minimal lockfile so `npm ci` works from day zero
- `jira/<sub-task-id>.md` — copy of the sub-task file
- `pats/<sub-task-id>.stub` — PAT stub file extracted from the sub-task
- `.kiro/steering/m-managed-repo.md` — M development guide (see Steering Template)

**For frontend repos with API dependencies (role: frontend, frontend-host):**

- `pats/stubs/<api-name>.js` — API stub servers for PAT validation (see API Stubs below)

The webpack config and Dockerfile must declare one env var per API
dependency, derived from the topology in project.yaml:

| Dependency role | Env var | Default |
|----------------|---------|---------|
| api-read | `API_READ_URL` | `http://localhost:3002` |
| api-write | `API_WRITE_URL` | `http://localhost:3003` |
| (general pattern) | `<ROLE_UPPER>_URL` | `http://localhost:<port>` |

Ports follow the convention: shell=3000, MFE=3001, then backends in
project.yaml order starting at 3002.

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

image: node:20

# Workflow rules prevent duplicate pipelines (one for branch push,
# one for MR) and ensure all jobs — including those with per-job
# rules — participate correctly in MR pipelines.
workflow:
  rules:
    - if: $CI_MERGE_REQUEST_IID      # MR pipelines
    - if: $CI_COMMIT_BRANCH == "main" # post-merge on main

stages:
  - install
  - build
  - test
  - snapshot
  - tag

# Default cache: every job pulls node_modules from cache.
# Only the install job pushes (pull-push policy).
cache: &default_cache
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
  policy: pull

# --- Always run ---

install:
  stage: install
  script:
    - npm ci
  cache:
    <<: *default_cache
    policy: pull-push

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

**Backend repos (role: backend):**
```
{
  "scripts": {
    "start": "node src/server.js",
    "build": "echo 'no build step configured'",
    "test": "echo 'no tests configured' && exit 0",
    "snapshot": "echo 'snapshot: not yet implemented'",
    "tag": "echo 'auto-tag: not yet implemented'"
  }
}
```

**Frontend repos (role: frontend, frontend-host):**
```
{
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "test": "echo 'no tests configured' && exit 0",
    "snapshot": "echo 'snapshot: not yet implemented'",
    "tag": "echo 'auto-tag: not yet implemented'"
  }
}
```

The `start` script is required for local compose — the root repo's
`start-all.sh` calls each component's start script. Backend repos
get a Node server start; frontend repos get webpack dev server.
Implementation may refine these but the scaffold must provide
working defaults.

### Lifecycle phase contract

| Phase      | Trigger                  | Purpose                              | Failure behaviour        |
|------------|--------------------------|--------------------------------------|--------------------------|
| `install`  | Every pipeline           | Install dependencies                 | Pipeline fails           |
| `build`    | Every pipeline           | Compile, bundle, transpile           | Pipeline fails           |
| `test`     | Every pipeline           | Run repo-level PATs and unit tests   | Pipeline fails, MR blocked |
| `snapshot` | MR pipelines only        | Publish pre-release artefact         | MR can't shadow-integrate |
| `tag`      | Merge to main only       | Create semver tag on the new commit  | Manual tag required       |

**CI image:** The pipeline must specify `image: node:20` (or the
appropriate runtime for the repo-type). Without an explicit image,
GitLab falls back to the runner's default (typically `ruby:3.1`),
which won't have npm/node available.

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

## API Stubs for Frontend Repos

When scaffolding a frontend component (role: frontend or frontend-host)
that depends on API components, generate stub servers in `pats/stubs/`.
These stubs enable PAT validation without running real API services.

### Generation rules

1. Read the API sub-task files to extract the endpoint contracts
   (routes, methods, request/response shapes)
2. Generate one stub file per API dependency in `pats/stubs/`
3. Stubs use Express with CORS enabled
4. Read stubs return mock data matching the contract
5. Write stubs accept and store data in memory
6. Read and write stubs sharing the same story must share state
   (same in-memory array, via require/import)

### Shared state pattern

When a story involves both a read and write API, the stubs must share
an in-memory data store so that writes are visible to subsequent reads.
Pattern:

- `pats/stubs/api-read.js` — exports the shared data array, starts
  the read server as a side effect
- `pats/stubs/api-write.js` — requires api-read to get the shared
  array reference, starts the write server

Running `node pats/stubs/api-write.js` starts both servers (api-read
is loaded via require, which triggers its listen call).

### Stub template (read API)

```
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())

const <collection> = []

app.get('/<resource>', (req, res) => {
  res.json(<collection>)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.STUB_PORT || <read-port>
const server = app.listen(PORT, () => {
  console.log('<api-name> stub on port ' + PORT)
})

module.exports = { app, <collection>, server }
```

### Stub template (write API)

```
const express = require('express')
const cors = require('cors')
const { <collection> } = require('./api-read')

const app = express()
app.use(cors())
app.use(express.json())

let nextId = 1

app.post('/<resource>', (req, res) => {
  const { <field> } = req.body || {}
  if (!<field> || !<field>.trim()) {
    return res.status(400).json({ error: '<Field> is required' })
  }
  const item = { id: nextId++, <field>: <field>.trim() }
  <collection>.push(item)
  res.status(201).json(item)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.STUB_WRITE_PORT || <write-port>
app.listen(PORT, () => {
  console.log('<api-name> stub on port ' + PORT)
})
```

### Dependencies

Add `express` and `cors` as devDependencies in the frontend repo's
`package.json` if not already present (they're needed for stubs only,
not for the frontend build).

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
- Always include a `package-lock.json` in the seed commit (even with no
  dependencies). Without it, `npm ci` fails immediately. The lockfile
  is trivial for an empty project — just name, version, lockfileVersion.
- **CI cache with DAG (`needs:`):** GitLab `needs:` creates a DAG but
  does NOT propagate cache between jobs. Each job that requires
  `node_modules/` must declare its own cache block. The template uses a
  YAML anchor (`&default_cache`) with `policy: pull` as the default, and
  the install job overrides to `policy: pull-push`. Without this, jobs
  downstream of install (build, test, etc.) won't find `node_modules/`
  and commands like `vitest` will fail with "not found".
- **CORS for backend repos:** When `role: backend`, the seed `app.js`
  must include `cors` middleware (`app.use(cors())`) and `cors` must be
  listed as a dependency in `package.json`. Without this, any frontend
  on a different port will fail to fetch from the API — the default
  development scenario for distributed topologies. CORS is permissive
  by default for development; production lockdown is a deployment concern.
- **Port convention:** Backend APIs must use port defaults that don't
  collide with frontend dev servers. The convention is deterministic
  based on component order in `project.yaml`:
  - shell (frontend-host): 3000
  - first frontend: 3001
  - first backend: 3002
  - second backend: 3003
  - ...and so on
  The port is set via `PORT` env var with the conventional default in
  `server.js`. Frontend components referencing APIs must use the correct
  port in their `API_URL` default.

## Steering Template

The `.kiro/steering/m-managed-repo.md` file is an auto-inclusion steering
file that gives any AI session the context needed to work in an M-managed
repo. It is generated from the sub-task metadata and project configuration.

The steering file must use `inclusion: auto` front matter so it is picked
up automatically when the repo is opened.

### Template

The following is parameterised. Replace `<placeholders>` with values
extracted from the sub-task file and project.yaml.

```
---
inclusion: auto
---

# M-Managed Repo — AI Development Guide

This repo is managed by Methodology M. This steering file gives you the
context needed to work effectively in this codebase.

## Repo Identity

- **Component:** <component-name>
- **Role:** <component-role> (e.g. backend, frontend, frontend-host)
- **Type:** referenced (tracked by version in the root repo)
- **Root repo:** <root-repo-name> (under the same GitLab group)
- **Story management:** Sub-task files in `jira/`, linked to parent stories in the root repo

## Methodology M Essentials

This is an M-type managed repo. Key concepts:

- **PATs (Pseudo Acceptance Tests)** are structured, machine-readable
  validation criteria. They describe what to verify without prescribing
  a test framework. PAT stubs in `pats/` are pseudocode — human-readable
  intent that must be transformed into executable acceptance tests.

- **Repo-level PATs** answer: "does this component fulfil its contract?"
  They run in this repo's CI pipeline and test the component in isolation.

- **Story-level PATs** live in the root repo and test the composed system.
  This repo doesn't run those — it only owns its own contract.

- **Acceptance tests (ATs)** are the executable form of PATs. The PAT stub
  is the specification; the AT is the compiled, CI-runnable proof. By the
  time an MR is raised, every PAT must have a corresponding passing AT.

## Artefact Layout

  jira/              Sub-task files (acceptance criteria, parent story link)
  pats/              PAT stubs (.stub.js) and acceptance tests (.spec.js)
  src/               Application source code
  .gitlab-ci.yml     CI pipeline (lifecycle phases, not hardcoded commands)
  package.json       Lifecycle scripts (build, test, start, snapshot, tag)

## Sub-Task Files

Files in `jira/` describe what this repo must deliver for a given story.
Each sub-task has:

- A parent story reference
- Acceptance criteria (repo-level PATs in prose)
- A summary of the contract this component owns

When asked to implement something, read the sub-task file first. It is the
contract. Build exactly what it specifies.

## PAT Stubs and Acceptance Tests

Files in `pats/` come in two forms:

- `*.stub.js` — PAT stubs. Pseudocode describing what to test. These are
  generated during story decomposition and represent the contract in
  human-readable form. Do not delete them after transformation.

- `*.spec.js` — Acceptance tests. Real, executable test code that proves
  the implementation meets the contract. Generated by transforming stubs.

### Transforming PAT Stubs into Acceptance Tests

When asked to "generate acceptance tests" or "transform PAT stubs":

1. Read the stub file to understand the contract
2. Read the sub-task file for additional context
3. Choose the appropriate test framework based on the component role:
   - Backend API → supertest + vitest (HTTP contract testing)
   - Frontend MFE → vitest + Testing Library (component testing, mocked API)
   - Root repo / shell → Cypress (story-level, composed system)
4. Write the spec file alongside the stub (same directory, .spec.js extension)
5. Ensure tests import the app directly (not via a running server) for speed
   and reliability — separate app.js from server.js for this reason

## CI Pipeline

The .gitlab-ci.yml uses lifecycle phases delegated to package.json scripts:

| Phase | Script | When |
|-------|--------|------|
| start | npm start | Local development (compose) |
| install | npm ci | Every pipeline |
| build | npm run build | Every pipeline |
| test | npm test | Every pipeline |
| snapshot | npm run snapshot | MR pipelines only |
| tag | npm run tag | Merge to main only |

The pipeline orchestrates; the scripts implement. When updating functionality,
update the package.json scripts — not the CI file.

## Branch and MR Conventions

- Feature branches: feat/<subtask-id>-<description>
- MR titles must include the sub-task ID
- Branch protection: push to main is blocked; all changes go through MRs
- Managed repo MRs stay open until the root repo's merge transaction lands
  the full story — do not merge individually

## Development Workflow

The typical cycle for implementing a sub-task:

1. Read the sub-task file in jira/ — understand the contract
2. Create a feature branch from main
3. Implement towards the PATs — this is a continuous validation loop:
   - Write code that addresses the acceptance criteria
   - Validate against PATs as you go using appropriate tools:
     - **Frontend:** open in browser, verify visually, check data-testid
       attributes, test interactions (use Chrome DevTools MCP if available)
     - **API:** curl the endpoints, verify responses match the contract
   - Use API stubs in `pats/stubs/` to test against dependency contracts
     without needing real services running
   - A passing build is NOT PAT validation — you must demonstrate that
     the implementation satisfies the acceptance criteria
   - Never declare implementation complete without this demonstration
4. Transform PAT stubs into acceptance tests (CATs)
5. Run npm test — all acceptance tests must pass
6. Commit, push, open MR with sub-task ID in the title
7. CI runs: install → build → test → snapshot
8. Wait for story-level integration (managed by root repo)

## Code Conventions

- Separate app logic from server binding (app.js / server.js pattern)
  so tests can import the app without starting a server
- Keep implementations minimal — deliver exactly what the sub-task specifies
- No framework-specific magic — keep it readable and testable
- Backend APIs must include CORS middleware (`app.use(cors())`) — required
  for cross-origin requests from frontends in development
- Use `PORT` env var for server binding with a conventional default that
  avoids collisions (shell=3000, MFE=3001, api-read=3002, api-write=3003)
```

### Parameterisation

The scaffold capability fills in these placeholders from the inputs:

| Placeholder | Source |
|-------------|--------|
| `<component-name>` | Sub-task file `Component:` field |
| `<component-role>` | Inferred from component type (API → backend, MFE → frontend, shell → frontend-host) |
| `<root-repo-name>` | project.yaml `project:` field + `-root` suffix |

Everything else in the template is generic M methodology content that
applies to all managed repos regardless of project.
