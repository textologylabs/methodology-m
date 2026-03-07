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

---

## Step 1: Create Project Workspace ✅

🦊 Create top-level group `methodology-m` manually (SaaS restriction).

💬 `Set up the todo-m-workshop subgroup under methodology-m using M Power.`

👻 Invokes `m-power setup-workspace`. Creates the GitLab subgroup via GitLab MCP.

👀 Group visible at `https://gitlab.com/groups/methodology-m/todo-m-workshop`

---

## Step 2: Bootstrap Root Repo ✅ (seeding) / ⏳ (PATs)

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

## Step 3: Decompose Story ⏳

💬 `Decompose TODOM-000 into sub-tasks using M Power.`

👻 Invokes `m-power decompose-story`:
1. Reads story and PATs from the root repo
2. Proposes PAT-to-component mapping

💬 Reviews mapping, confirms or adjusts.

👻 Generates and commits sub-task files (TODOM-000a through TODOM-000d) and the readiness tracker (`stories/TODOM-000.yaml`).

👀 Root repo now contains `jira/TODOM-000a.md` through `jira/TODOM-000d.md`, enriched story, and `stories/TODOM-000.yaml` (readiness tracker with all high-water marks null). Idea phase complete.

---

## Step 4: Scaffold Managed Repos ⏳

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

## Step 5: Wire Orchestration ⏳

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

**Still Story Zero.** Stage 0 scaffolded the infrastructure; Stage 1
implements the sub-tasks. Same story, different phase in the M lifecycle.
Stages are workshop presentation beats, not story boundaries — TODOM-000
spans Stage 0 through Stage 2.

**Goal:** Demonstrate one complete dev cycle — implement a component,
transform PAT stubs into real acceptance tests, tag a release. Proves the
PAT-driven workflow before tackling integration.

**Live demo:** TODOM-000c (todo-m-api-read) — the simplest component. One
endpoint, no UI, clean PAT-to-AT transformation. The presenter works in the
local clone, following a normal dev workflow:

1. 🖥️ `cd` into the local clone of `todo-m-api-read`
2. 🖥️ Create a feature branch: `git checkout -b feat/TODOM-000c-implement`
3. 💬 Ask Kiro to implement the endpoint (Beat 1)
4. 🖥️ `npm install` and verify with `curl` (smoke test)
5. 💬 Ask Kiro to transform PAT stubs into acceptance tests (Beat 2)
6. 🖥️ `npm test` — show tests passing
7. 🖥️ Commit, push, open MR on GitLab
8. 🦊 Show CI pipeline running and passing
9. 🦊 Merge the MR

**Fast-forward:** After the live demo, pre-baked commits land the remaining
components (TODOM-000d, TODOM-000b, TODOM-000a) so we can move to
integration without repeating the same cycle three more times.

---

## PAT-to-AT Technology Choices

The PAT format is universal. The acceptance test (AT) framework is repo-appropriate:

| Repo | PAT Stubs Say | AT Framework | Why |
|------|---------------|--------------|-----|
| todo-m-api-read | "GET /hello returns 200 with message field" | supertest + vitest | HTTP contract testing, no browser needed |
| todo-m-api-write | "POST /placeholder returns 200 OK" | supertest + vitest | Same — pure API contract |
| todo-m-mfe | "MFE renders Hello component" | vitest + Testing Library | Component-level, mocked API, fast |
| todo-m-root | "Shell loads, MFE visible, API message displays" | Cypress | Story-level, composed system, browser required |

Key insight for the audience: PATs are framework-agnostic. The same acceptance criterion expressed in PAT.yaml becomes a supertest spec in an API repo and a Cypress spec in the root repo. The methodology doesn't prescribe Cypress everywhere — it prescribes PATs everywhere.

---

## M Power Capabilities Needed

### Existing (Stage 0)
- `setup-workspace` — creates the GitLab group
- `bootstrap-root-repo` — creates root repo, seeds with project.yaml and Story Zero
- `generate-pats` — generates story-level PATs from acceptance criteria
- `decompose-story` — decomposes story into component sub-tasks
- `scaffold-repo` — creates managed repos with pluggable CI pipelines, branch protection, access tokens
- `wire-orchestration` — connects managed repos to root repo (webhooks, triggers, tokens, root CI pipeline)

### New for Stage 1
- `implement-component` — Reads a sub-task file, scaffolds the implementation (Express app, package.json, etc.), and generates the initial code. Works from the repo-level PATs in the sub-task.
- `generate-acceptance-tests` — Transforms PAT stubs into real test code using the repo-appropriate framework. Reads the sub-task to determine what framework to use (supertest for API, Testing Library for MFE, Cypress for root).
- `tag-release` — Tags a managed repo at a version (v0.1.0), following the auto-tag convention. Updates the root repo's project.yaml to pin the new version.

### Deferred (Stage 2+)
- `create-readiness-tracker` — Creates the readiness manifest in the root repo

---

## Why Acceptance Tests First?

A natural question: "why jump straight to acceptance tests instead of unit
tests?" In M, PATs are the contract — they define what "done" means for a
sub-task. Unit tests are a developer concern that emerge naturally during
implementation. The methodology cares about PATs because they validate the
story. So the dev cycle is: implement the thing, then prove it meets the
contract by transforming PAT stubs into executable acceptance tests.

Unit tests may appear along the way (and should), but they're not what M
tracks. The readiness tracker advances when acceptance tests pass, not when
unit tests pass.

---

## Step 6: Implement todo-m-api-read (Beat 1 — Implementation) ⏳

📝 Presenter explains: "We're picking up sub-task TODOM-000c. The AI will
read the sub-task file, understand the contract, and scaffold the
implementation. No tests yet — that's the next beat."

💬 `Implement the endpoint for TODOM-000c in todo-m-api-read. Use the sub-task file for context.`

👻 Reads `jira/TODOM-000c.md` from the repo. Scaffolds:
1. Updates `package.json` — adds Express, real lifecycle scripts (replacing stubs)
2. Creates `src/app.js` — Express app with `GET /hello` → `{ "message": "Hello from todo-m-api-read" }`
3. Creates `src/server.js` — starts the server (separated from app for testability)

📝 Presenter pauses: "Notice what just happened. The AI read a sub-task
document — not a Jira ticket, not a Slack message — a structured artefact
with acceptance criteria. It knows exactly what to build because the
contract is explicit."

👀 Audience sees: AI reading the sub-task, understanding the contract,
generating minimal implementation. No tests yet — that comes next.

🖥️ Verify the endpoint works:
```
npm start &
curl http://localhost:3001/hello
kill %1
```

👀 Audience sees: `{"message":"Hello from todo-m-api-read"}` — the contract
is met. But this is a manual check. The next beat makes it automated and
CI-runnable.

---

## Step 7: Transform PAT Stubs into Acceptance Tests (Beat 2 — PAT-to-AT) ⏳

📝 Presenter explains: "Now the interesting part. The repo already has a PAT
stub — pseudocode that describes what the acceptance test should verify. We're
going to ask the AI to transform that stub into a real, executable test."

💬 `Generate acceptance tests for TODOM-000c from the PAT stubs.`

👻 Reads `pats/TODOM-000c.stub.js`, transforms into real supertest + vitest specs:
1. Replaces stub comments with actual supertest assertions
2. `GET /hello` → expect 200, expect body to have `message` field
3. Writes `pats/TODOM-000c.spec.js`

💬 Reviews generated tests, confirms or tweaks.

🖥️ `npm test` — shows tests passing against the implementation.

📝 Presenter highlights: "Same acceptance criterion, two representations.
The stub was pseudocode — human-readable intent. The spec is executable —
CI-runnable proof. The methodology doesn't prescribe a test framework; it
prescribes PATs. supertest here, Cypress in the root repo, Testing Library
in the MFE. The PAT is the constant."

👀 Audience sees: the PAT stub (pseudocode) becoming a real test (executable
code). Same acceptance criterion, now deterministic and CI-runnable.

---

## Step 8: Tag and Release ⏳

🖥️ Tests pass. Tag the release.

👻 Tags `todo-m-api-read` at `v0.1.0`. Updates `project.yaml` in the root repo:
- `api-read` tag changes from `~` (null) → `v0.1.0`

🦊 Show the audience: the tag on GitLab, the updated project.yaml.

👀 First component released. One piece of the topology is real.

---

## Step 9: Fast-Forward Remaining Components ⏳

💬 `Fast-forward the remaining components to v0.1.0.`

👻 Pushes pre-baked implementations for:
- **TODOM-000d** (todo-m-api-write): Express + `POST /placeholder` → 200 OK + supertest specs
- **TODOM-000b** (todo-m-mfe): React component + Testing Library specs (mocked API)

Each gets tagged at `v0.1.0`. Root repo `project.yaml` updated to pin all referenced components.

📝 Presenter narrates: "Same cycle we just saw — implement, transform PATs, test, tag. We're fast-forwarding to keep the demo moving."

👀 All managed repos at v0.1.0. Topology fully implemented but not yet integration-tested.

---

## Step 10: Pause and Reflect ⏳

📝 Presenter summarises what Stage 1 demonstrated:

- PAT stubs → real acceptance tests (the transformation)
- Framework choice is per-repo, not per-project
- Each component validated in isolation (repo-level PATs)
- No integration yet — that's Stage 2

👀 Audience understands: we've built the pieces. Next we prove they work together.

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
