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

## Step 16: Validate MFE with Chrome DevTools & Compile CATs ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

👻 Auto-advances — implementation complete, now validating PATs.

**PAT Validation (Chrome DevTools MCP):**

👻 Starts the MFE dev server, opens it in the browser via Chrome DevTools MCP.
Visually verifies the Hello component renders, the `data-testid` attributes are
present, and the API message displays (with the API stub returning mock data).

👀 The audience sees a real browser — not just test output. The PAT is validated
visually before any test code is written. This is the "human eye" check that
confirms the implementation matches intent.

**CAT Compilation (two layers):**

👻 Invokes `m-power generate-acceptance-tests`:
1. Reads `pats/TODOM-000b.stub.js` — the PAT (pseudocode contract)
2. Determines framework: React MFE needs two test layers:
   - **Unit CATs** (vitest + Testing Library + jsdom) — fast, CI-friendly, mocked API
   - **E2E CATs** (Cypress) — browser-based, runs against composed system in Stage 2
3. Adds devDependencies: `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, `jsdom`, `cypress`
4. Creates `pats/TODOM-000b.spec.jsx` — unit CAT (mocked fetch, component-level)
5. Creates `pats/TODOM-000b.cy.js` — e2e CAT (Cypress, visits `/`, asserts real DOM)
6. Creates `cypress.config.js` — points at `localhost:3001`, pattern `pats/**/*.cy.js`
7. Runs `npm test` (vitest only — Cypress e2e runs later in Stage 2 against the composed system)

💬 Reviews generated tests, confirms or tweaks.

👀 PAT (pseudo) → two CAT layers (unit + e2e). Unit tests green now. Cypress tests
are written but won't run until the shell composes the full system. This is by design —
the MFE can't be e2e tested in isolation because it's a Module Federation remote.

---

---

## Step 17: Raise MR for todo-m-mfe ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

👻 Auto-advances — unit CATs pass, now raising MR.

👻 Commits all changes on feature branch `feat/TODOM-000b-implement`, pushes, creates MR on GitLab.

🦊 Show the audience: the MR on GitLab, CI pipeline running repo-level tests (vitest unit CATs).

👀 Repo-level CI is green — the MFE's own tests pass. But the MR **cannot be merged**
because shadow integration pushed a `failed` commit status. The shell doesn't exist yet,
so the root repo can't compose the system.

This is the methodology working as designed — the MR parks here until the system can
integrate. The MFE isn't broken; the topology is incomplete.

---

## Step 18: Shadow Integration Failure (Teaching Moment) ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

This step isn't triggered by the presenter — it happened automatically. When the
MFE MR was raised in Step 17, the webhook fired and triggered shadow integration
on the root repo. It failed. This is the right time to show the audience why.

🦊 Navigate to the root repo's CI/CD pipelines. Find the triggered pipeline.

👀 The `shadow:compose` job failed with:
```
ERROR: Shell not implemented yet (packages/shell/package.json missing)
Shadow integration cannot compose the system without the shell.
Blocked component: TODOM-000a (shell)
```

This is **correct, expected behaviour**. The shadow integration pipeline checks
whether the system can be composed from pinned versions. The shell (TODOM-000a)
doesn't exist yet, so composition is impossible. The pipeline fails honestly
rather than silently skipping.

🦊 Show the audience the `shadow:report-failure` job — it pushed a `failed`
commit status back to the MFE's MR. That's why the MR can't merge.

**Key points for the audience:**

- Shadow integration is live from Step 5 — it doesn't wait for all components
- Failure is **blocking** — the MR stays open until the system can compose
- The root repo CI explicitly names the blocked component — no mystery failures
- This resolves itself when the shell is implemented — no manual intervention needed

---

## Step 19: Pause and Reflect ⏳

Stage 1 demonstrated:

- **PAT validation with Chrome DevTools** — visual verification in a real browser before writing test code
- **Two CAT layers** — unit (vitest, fast, CI) and e2e (Cypress, composed system) compiled from the same PAT stub
- **Framework choice is per-repo** — APIs got supertest, MFE got Testing Library + Cypress
- **Each component validated in isolation** — repo-level PATs pass independently
- **The four-step cycle**: implement → validate & compile CATs → MR → tag
- **Shadow integration blocks incomplete topologies** — the MFE MR is parked, waiting for the shell. This is a feature, not a bug.

---

# Stage 2: Integration — Shell & Story Completion

The shell lives in the root repo (`packages/shell/`). Unlike managed repos,
it doesn't get its own GitLab project — it's the Module Federation host that
composes everything. This stage implements the shell, unblocks the parked MFE
MR, and closes out TODOM-000.

The MFE MR from Step 17 is still open. Once the shell exists and shadow
integration passes, it can finally merge. The ordering is deliberate — you
can't merge what you can't integrate.

---

## Step 20: Implement the Shell ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

💬 `Implement the shell for TODOM-000a. Read the sub-task file for context.`

👻 Reads the sub-task (TODOM-000a) and the story-level PATs. Implements:
1. Creates `packages/shell/package.json` — webpack, webpack-dev-server, Module Federation plugin, HTML webpack plugin
2. Creates `packages/shell/webpack.config.js` — Module Federation host consuming `todo_mfe` remote
3. Creates `packages/shell/public/index.html` — root HTML with `<div id="root">` and `data-testid="app-shell"`
4. Creates `packages/shell/src/index.js` — bootstraps the shell, lazy-loads the MFE remote
5. Creates `packages/shell/src/App.jsx` — renders the MFE inside `data-testid="todo-mfe"` container
6. Updates root `package.json` — adds `compose` script (starts shell + APIs), `integration-test` script (runs Cypress)

👀 Shell implemented. Module Federation host configured to consume the MFE remote.

---

## Step 21: Compose and Validate Locally with Chrome DevTools ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

💬 `Compose the full system locally and validate the story-level PATs visually.`

👻 Starts all services locally:
- `todo-m-api-read` on port 3002
- `todo-m-api-write` on port 3003
- `todo-m-mfe` (webpack dev server, Module Federation remote) on port 3001
- `packages/shell` (webpack dev server, Module Federation host) on port 3000

👻 Opens `http://localhost:3000` via Chrome DevTools MCP. Validates:
- `[data-testid="app-shell"]` is visible (AC-001)
- `[data-testid="todo-mfe"]` loads the MFE remote (AC-002)
- `[data-testid="todo-mfe-hello"]` renders the Hello component (AC-002)
- `[data-testid="api-message"]` shows "Hello from todo-m-api-read" (AC-003)

👀 The audience sees the full composed system in a real browser — shell hosting
the MFE, MFE fetching from the API, everything wired together via Module Federation.
This is the first time the topology is running as a whole.

---

## Step 22: Compile Story-Level CATs (Cypress) ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

👻 Auto-advances — visual validation passed, now compiling story-level CATs.

👻 Invokes `m-power generate-acceptance-tests` at the story level:
1. Reads `pats/TODOM-000.pat.yaml` — the story-level PATs (AC-001 through AC-006)
2. Determines framework: story-level integration → Cypress
3. Adds Cypress devDependencies to root `package.json`
4. Creates `pats/TODOM-000.cy.js` — story-level Cypress tests covering all ACs
5. Creates `cypress.config.js` — points at `localhost:3000` (shell), pattern `pats/**/*.cy.js`
6. Runs Cypress against the composed system (all services still running from Step 21)

💬 Reviews generated Cypress tests, confirms or tweaks.

👀 Story-level PATs compiled to Cypress and passing against the composed system.
All six acceptance criteria validated end-to-end.

---

## Step 23: Raise MR on Root Repo ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

👻 Auto-advances — story-level CATs pass, now raising MR.

👻 Commits all changes on feature branch `feat/TODOM-000a-shell`, pushes, creates MR on GitLab.

🦊 Show the audience: the MR on the root repo. This contains the shell implementation,
the compose scripts, and the story-level Cypress tests.

👀 MR raised. Root repo CI pipeline runs compose + integration-test stages.

---

## Step 24: Shadow Integration Passes — MFE Unblocked ⏳

📂 GitLab UI

This is the payoff from Step 18. The shell now exists, so shadow integration
can compose the system.

🦊 Show the audience two things:

1. **Root repo pipeline** — the `shadow:compose` job passes. Compare to Step 18
   where it failed with "Shell not implemented yet". Same pipeline, same check —
   the shell just showed up.

2. **MFE MR !3** — the shadow integration commit status flips from `failed` to
   `success`. The MR is now mergeable.

👀 The parked MFE MR is unblocked. No manual intervention — the system told us
when it was ready. This is the shadow integration loop completing.

---

## Step 25: Merge MFE MR and Tag ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🦊 Merge MFE MR !3 on GitLab.

🖥️ Pull main locally:
```
git checkout main
git pull origin main
```

👻 Invokes `m-power tag-release` (sub-task-id: TODOM-000b, version: v0.1.0):
1. Verifies clean working tree, on `main`, `npm test` passes
2. Creates annotated tag `v0.1.0` on HEAD
3. Pushes tag to origin
4. Updates `project.yaml` in todo-m-root: mfe tag `~` → `v0.1.0`

👀 `todo-m-mfe` tagged at `v0.1.0`. All three managed repos now released.

---

## Step 26: Merge Root Repo MR and Tag ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

🦊 Merge root repo MR on GitLab.

🖥️ Pull main locally:
```
git checkout main
git pull origin main
```

👻 Invokes `m-power tag-release` (sub-task-id: TODOM-000a, version: v0.1.0):
1. Verifies clean working tree, on `main`
2. Runs story-level Cypress tests one final time (post-merge validation)
3. Creates annotated tag `v0.1.0` on HEAD
4. Pushes tag to origin
5. Updates `project.yaml`: shell tag `~` → `v0.1.0`

🦊 Show the audience `project.yaml` — all four components now pinned at `v0.1.0`:
```
components:
  shell: v0.1.0
  mfe: v0.1.0
  api-read: v0.1.0
  api-write: v0.1.0
```

👀 Root repo tagged at `v0.1.0`. Every component versioned. Topology fully reproducible.

---

## Step 27: Story Complete — TODOM-000 Done ⏳

📂 `ref-projects/todo-m-workshop/pass1/todo-m-root`

👻 Updates the readiness tracker (`stories/TODOM-000.yaml`) — all high-water marks
set to `v0.1.0`. Story status: complete.

👀 TODOM-000 is done. From Story Zero to a fully composed, tested, versioned system:
- 4 repos (1 root + 3 managed)
- 4 components all at v0.1.0
- Story-level Cypress PATs passing end-to-end
- Shadow integration operational and proven (failed → passed)
- Every step traceable from story → sub-task → PAT → CAT → MR → tag

---

## Wrap-Up

This concludes the first workshop script. TODOM-000 (Story Zero) is fully
implemented, tested, and released.

The key insight from the ordering: the MFE MR was parked for the entire
duration of Stage 2 — blocked by shadow integration because the shell
didn't exist. Once the shell was implemented, everything unblocked
automatically. No manual gate-keeping, no "are we ready?" meetings.
The system tells you when it's ready.

Future stories (TODOM-001, etc.) will be covered in a separate script file —
the methodology is established, and subsequent stories follow the same cycle
without the bootstrap overhead.

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
