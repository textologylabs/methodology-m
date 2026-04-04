# Workshop Script — Methodology M Reference Implementation

**Purpose:** A replayable demo playbook for building the reference implementation.

**Status:** In Progress

---

## Legend

| Icon | Meaning |
|------|---------|
| 💬 | Kiro Chat — presenter types a message to Kiro |
| 👻 | Kiro — AI agent acts autonomously |
| 🖥️ | Terminal — presenter runs a shell command |
| 🦊 | GitLab UI — presenter clicks/navigates in GitLab |
| 📝 | IDE Editor — presenter edits a file manually |
| 🌐 | Browser — presenter shows something in a browser |
| 👀 | Audience — what the audience should observe |

Steps marked ✅ have been executed. Steps marked ⏳ are next.

---

## Workspace Convention

The `workshop/workspace/` folder holds generated artefacts produced during the workshop. These are outputs of M Power actions — not source material.

```
workshop/
  jira/               ← source story files (hand-authored)
  workspace/
    jira/             ← generated: enriched stories, sub-tasks, PATs (staging)
```

In the real M Power flow, there is no staging area — everything goes directly into the root repo.

## Active Folder Convention

Every step that involves local work must state the active folder. Steps in
Stage 0 (Steps 1–5) operate via GitLab API from the planning repo — no
local clone needed. From Stage 1 onward, the presenter works in local
clones under `ref-projects/`.

```
.                              ← methodology-m (planning repo)
ref-projects/
  todo-m-workshop/
    pass1/
      todo-m-root/             ← shell, orchestration, story-level tests
      todo-m-mfe/              ← microfrontend
      todo-m-api-read/         ← read API
      todo-m-api-write/        ← write API
```

---

# Stage 0: Project Bootstrap

All steps in this stage operate via GitLab API (M Power + GitLab MCP).
The presenter is in the `methodology-m` planning repo root.

---

## Step 1: Create Project Workspace ✅

📂 `methodology-m` (planning repo root)

🦊 Create top-level group `methodology-m` manually (SaaS restriction).

💬 `Set up the todo-m-workshop subgroup under methodology-m using M Power.`

👻 Invokes `m-power setup-workspace`. Creates the GitLab subgroup via GitLab MCP.

👀 Group visible at `https://gitlab.com/groups/methodology-m/todo-m-workshop`

---

## Step 2: Bootstrap Root Repo ✅

📂 `methodology-m` (planning repo root)

💬 `Bootstrap the root repo using M Power. Use the story file at workshop/jira/TODOM-000.md.`

👻 Invokes `m-power bootstrap-root-repo`:
1. Extracts project metadata from Story Zero's `## Project` section
2. Creates `todo-m-root` repo in `methodology-m/todo-m-workshop` via `gitlab-ops create_project` (requires `namespace_id` — the standard GitLab MCP `create_repository` cannot target groups)
3. Pushes seed commit: `project.yaml` (all tags null — nothing released yet), `jira/TODOM-000.md`, folder structure (`pats/`, `stories/`, `packages/shell/`, `.kiro/`), and `README.md`
4. Asks: "Root repo seeded. Want me to generate PATs now?"

💬 `Yes`

👻 Delegates to `m-power generate-pats`:
5. Generates story-level PATs from acceptance criteria
6. Presents PAT draft for review

💬 Reviews PAT draft, confirms or requests changes.

👻 Commits `pats/TODOM-000.pat.yaml` to the root repo.

🦊 Show the audience the root repo — file structure, project.yaml, story, PATs.

👀 `todo-m-root` exists on GitLab with `project.yaml`, `jira/TODOM-000.md`, `pats/TODOM-000.pat.yaml`, folder structure.

---

## Step 3: Decompose Story ✅

📂 `methodology-m` (planning repo root)

💬 `Decompose TODOM-000 into sub-tasks using M Power.`

👻 Invokes `m-power decompose-story`:
1. Reads story and PATs from the root repo
2. Proposes PAT-to-component mapping

💬 Reviews mapping, confirms or adjusts.

👻 Generates and commits sub-task files (TODOM-000a through TODOM-000d) and the readiness tracker (`stories/TODOM-000.yaml`).

👀 Root repo now contains `jira/TODOM-000a.md` through `jira/TODOM-000d.md`, enriched story, and `stories/TODOM-000.yaml` (readiness tracker with all high-water marks null). Idea phase complete.

---

## Step 4: Scaffold Managed Repos ✅

📂 `methodology-m` (planning repo root)

💬 `Scaffold the managed repos for TODOM-000.`

👻 Invokes `m-power scaffold-repo` for each sub-task (TODOM-000b, 000c, 000d):

1. Creates `todo-m-mfe`, `todo-m-api-read`, `todo-m-api-write` on GitLab (no README init — avoids conflict with seed commit)
2. Pushes seed commit via `push_files`: README, sub-task file, repo-level PAT stubs, pluggable `.gitlab-ci.yml`, `.kiro/steering/m-managed-repo.md` (M development guide), `package.json` with placeholder lifecycle scripts
3. Reconfigures branch protection — GitLab auto-protects `main` with push=maintainer; scaffold unprotects then re-protects with push=no one, merge=maintainer (unprotect/re-protect required — no update API exists)
4. Creates project access token per repo (Premium+) or notes free-tier fallback (group PAT)

The CI pipeline has lifecycle phases:
- `install` → `build` → `test` (every pipeline)
- `snapshot` (MR pipelines only — publishes `v0.0.0-mr.<MR_IID>` tag)
- `tag` (merge to main only — auto-tags semver)

🦊 Show the audience one managed repo:
- The `.gitlab-ci.yml` — lifecycle phases, not hardcoded commands
- Branch protection — push rejected, merge only
- The `package.json` — placeholder scripts that implementation will fill in

👀 All repos exist with operational CI pipelines. Branch protection enforced (push=no one). Ready for orchestration wiring.

---

## Step 5: Wire Orchestration ✅

📂 `methodology-m` (planning repo root)

💬 `Wire up the orchestration layer using M Power.`

👻 Invokes `m-power wire-orchestration`:

1. Creates a pipeline trigger token on `todo-m-root` (for shadow integration)
2. Installs webhooks on each managed repo — MR events fire at root repo trigger
3. Stores access token as a protected, masked CI variable on root repo (`M_GROUP_TOKEN` — single group PAT on free tier; per-repo project tokens on Premium+)
4. Pushes root repo `.gitlab-ci.yml` with orchestration pipelines:
   - Shadow integration: `compose` → `integration-test` (triggered by managed repo webhooks)
   - Merge transaction: atomic merge of managed MRs (manual trigger, serialised via `resource_group`)
   - Post-merge validation: story-level tests on main
5. Creates root repo `package.json` with placeholder lifecycle scripts (`compose`, `integration-test`, `merge-transaction`)
6. Protects root repo `main` branch — merge-only

🦊 Show the audience:
- The webhook on a managed repo — "when an MR is created here, the root repo knows"
- The root repo CI pipeline — shadow integration, merge transaction stages
- The CI variables — masked tokens, one per managed repo

👀 Full Methodology M orchestration is wired. Raising an MR on any managed repo will trigger shadow integration on the root repo. The merge transaction pipeline is ready to coordinate atomic merges. The process exists from Story Zero — no special cases.

---

# Stage 1: TODOM-000 Development Phase

Implement the sub-tasks, transform PAT stubs into acceptance tests, raise
MRs, tag releases. Each component follows a four-step cycle:
implement → compile CATs → raise MR → tag release.

Steps 8–10 (CATs, MR, tag) auto-advance from the previous step — no
separate user prompt needed. The agent progresses automatically once the
PAT is satisfied: compile CATs → raise MR → merge → tag. The entire
cycle is a single continuous flow from the initial implement prompt.

From this point, the presenter works in local clones.

---

## Step 6: Clone Repos Locally ✅

📂 `methodology-m` (planning repo root)

🖥️ Clone all repos into the pass1 workspace:
```
mkdir -p ref-projects/todo-m-workshop/pass1
cd ref-projects/todo-m-workshop/pass1
git clone git@gitlab.com:methodology-m/todo-m-workshop/todo-m-root.git
git clone git@gitlab.com:methodology-m/todo-m-workshop/todo-m-mfe.git
git clone git@gitlab.com:methodology-m/todo-m-workshop/todo-m-api-read.git
git clone git@gitlab.com:methodology-m/todo-m-workshop/todo-m-api-write.git
```

👀 Local workspace ready. All four repos cloned under `ref-projects/todo-m-workshop/pass1/`.

---

## Step 7: Implement todo-m-api-read ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-read`

💬 `Implement the endpoint for TODOM-000c. Read the sub-task file for context.`

👻 Reads the sub-task (TODOM-000c) and the managed repo steering. Implements:
1. Updates `package.json` — adds Express, real lifecycle scripts (replacing stubs)
2. Creates `src/app.js` — Express app with `GET /hello` → `{ "message": "Hello from todo-m-api-read" }`
3. Creates `src/server.js` — starts the server (separated from app for testability)

👀 PAT satisfied — `GET /hello` returns 200 with message field.

---

## Step 8: Compile PATs into CATs for todo-m-api-read ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-read`

👻 Auto-advances — PAT satisfied, now compiling CATs.

👻 Invokes `m-power generate-acceptance-tests`:
1. Reads `pats/TODOM-000c.stub.js` — the PAT (pseudocode contract)
2. Determines framework: backend API → supertest + vitest
3. Adds test devDependencies (supertest, vitest)
4. Creates `pats/TODOM-000c.spec.js` — the CAT (compiled, CI-runnable)
5. Creates `vitest.config.js` with globals enabled
6. Runs `npm test` to verify

💬 Reviews generated tests, confirms or tweaks.

👀 PAT (pseudo) → CAT (compiled). Tests green.

---

## Step 9: Raise MR for todo-m-api-read ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-read`

👻 Auto-advances — CATs pass, now raising MR.

👻 Commits all changes on feature branch `feat/TODOM-000c-implement`, pushes, creates MR on GitLab.

🦊 Show the audience: the MR on GitLab, CI pipeline running repo-level tests.

👀 MR raised, CI green, merged to main.

---

## Step 10: Tag and Release todo-m-api-read ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-read`

� Auto-advances — MR merged, now tagging.P

👻 Invokes `m-power tag-release` (sub-task-id: TODOM-000c, version: v0.1.0):
1. Verifies clean working tree, on `main`, `npm test` passes
2. Creates annotated tag `v0.1.0` on HEAD
3. Pushes tag to origin
4. Updates `project.yaml` in todo-m-root: api-read tag `~` → `v0.1.0`

🦊 Show the audience: the tag on GitLab, the updated `project.yaml`.

👀 `todo-m-api-read` tagged at `v0.1.0`. First component released.

---

## Step 11: Implement todo-m-api-write ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-write`

💬 `Implement the endpoint for TODOM-000d. Read the sub-task file for context.`

👻 Reads the sub-task (TODOM-000d) and the managed repo steering. Implements:
1. Updates `package.json` — adds Express, real lifecycle scripts (replacing stubs)
2. Creates `src/app.js` — Express app with `POST /placeholder` → 200 OK
3. Creates `src/server.js` — starts the server (separated from app for testability)

👀 PAT satisfied — `POST /placeholder` returns 200 OK.

---

## Step 12: Compile PATs into CATs for todo-m-api-write ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-write`

👻 Auto-advances — PAT satisfied, now compiling CATs.

👻 Invokes `m-power generate-acceptance-tests`:
1. Reads `pats/TODOM-000d.stub.js` — the PAT (pseudocode contract)
2. Determines framework: backend API → supertest + vitest
3. Adds test devDependencies (supertest, vitest)
4. Creates `pats/TODOM-000d.spec.js` — the CAT (compiled, CI-runnable)
5. Creates `vitest.config.js` with globals enabled
6. Runs `npm test` to verify

💬 Reviews generated tests, confirms or tweaks.

👀 PAT (pseudo) → CAT (compiled). Tests green.

---

## Step 13: Raise MR for todo-m-api-write ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-write`

👻 Auto-advances — CATs pass, now raising MR.

👻 Commits all changes on feature branch `feat/TODOM-000d-implement`, pushes, creates MR on GitLab.

🦊 Show the audience: the MR on GitLab, CI pipeline running repo-level tests.

👀 MR raised, CI green, merged to main.

---

## Step 14: Tag and Release todo-m-api-write ✅

📂 `ref-projects/todo-m-workshop/pass1/todo-m-api-write`

� Auto-advances — MR merged, now tagging. 

👻 Invokes `m-power tag-release` (sub-task-id: TODOM-000d, version: v0.1.0):
1. Verifies clean working tree, on `main`, `npm test` passes
2. Creates annotated tag `v0.1.0` on HEAD
3. Pushes tag to origin
4. Updates `project.yaml` in todo-m-root: api-write tag `~` → `v0.1.0`

🦊 Show the audience: the tag on GitLab, the updated `project.yaml`.

👀 `todo-m-api-write` tagged at `v0.1.0`. Second component released.

---

## Step 15: Implement todo-m-mfe ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

💬 `Implement the MFE for TODOM-000b. Read the sub-task file for context.`

👻 Reads the sub-task (TODOM-000b) and the managed repo steering. Implements:
1. Updates `package.json` — adds React, Module Federation, real lifecycle scripts (replacing stubs)
2. Creates Hello component that fetches from the API and displays the message
3. Configures Module Federation as a remote

👀 PAT satisfied — MFE renders Hello component, displays API message.

---

## Step 16: Compile PATs into CATs for todo-m-mfe ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

👻 Auto-advances — PAT satisfied, now compiling CATs.

👻 Invokes `m-power generate-acceptance-tests`:
1. Reads `pats/TODOM-000b.stub.js` — the PAT (pseudocode contract)
2. Determines framework: React MFE → Testing Library + vitest
3. Adds test devDependencies (testing-library, vitest, jsdom)
4. Creates `pats/TODOM-000b.spec.js` — the CAT (compiled, CI-runnable, mocked API)
5. Runs `npm test` to verify

💬 Reviews generated tests, confirms or tweaks.

👀 PAT (pseudo) → CAT (compiled). MFE tested with mocked API.

---

## Step 17: Raise MR for todo-m-mfe ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

👻 Auto-advances — CATs pass, now raising MR.

👻 Commits all changes on feature branch `feat/TODOM-000b-implement`, pushes, creates MR on GitLab.

🦊 Show the audience: the MR on GitLab, CI pipeline running repo-level tests.

👀 MR raised, CI green, merged to main.

---

## Step 18: Tag and Release todo-m-mfe ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

� Auto-advances — MR merged, now tagging..

👻 Invokes `m-power tag-release` (sub-task-id: TODOM-000b, version: v0.1.0):
1. Verifies clean working tree, on `main`, `npm test` passes
2. Creates annotated tag `v0.1.0` on HEAD
3. Pushes tag to origin
4. Updates `project.yaml` in todo-m-root: mfe tag `~` → `v0.1.0`

🦊 Show the audience: the tag on GitLab, the updated `project.yaml`.

👀 `todo-m-mfe` tagged at `v0.1.0`. All managed repos at v0.1.0. Topology fully implemented but not yet integration-tested.

---

## Step 19: Pause and Reflect ⏳

Stage 1 demonstrated:

- PATs (pseudo) → CATs (compiled) — the transformation
- Framework choice is per-repo, not per-project
- Each component validated in isolation (repo-level PATs)
- The four-step cycle: implement → CATs → MR → tag
- No integration yet — that's Stage 2

---

## What's Next: Stage 2 (Integration)

Stage 2 will demonstrate:
- Implementing the shell in the root repo (TODOM-000a)
- Composing the full system locally (Module Federation + Docker Compose)
- Running story-level PATs (Cypress) against the composed system
- The topology MR as integration dashboard
- Story Zero validated end-to-end

---

## Design Decisions

### Bootstrap Sequencing

**Context:** PATs need to live in the root repo (`pats/`), but the root repo doesn't exist until bootstrap creates it.

**Resolution:** Bootstrap is a sequence of atomic capabilities:

1. `setup-workspace` — creates the GitLab group
2. `bootstrap-root-repo` — creates root repo, seeds with `project.yaml` and Story Zero
3. `generate-pats` — generates PATs, commits to root repo (delegated, not reimplemented)
4. `decompose-story` — decomposes into sub-tasks
5. `scaffold-repo` — creates managed repos with CI pipelines, branch protection, access tokens
6. `wire-orchestration` — connects managed repos to root repo (webhooks, triggers, root CI pipeline)

The root repo becomes the source of truth the moment it's created. Each capability stays atomic with user decision points between steps.
