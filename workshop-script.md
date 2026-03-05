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

👻 Generates and commits sub-task files (TODOM-000a through TODOM-000d).

👀 Root repo now contains `jira/TODOM-000a.md` through `jira/TODOM-000d.md` plus enriched story.

---

## Step 4: Scaffold Managed Repos ⏳

💬 `Scaffold the managed repos for TODOM-000.`

👻 Invokes `m-power scaffold-repo` for each sub-task:
1. Creates `todo-m-mfe`, `todo-m-api-read`, `todo-m-api-write` on GitLab
2. Seeds each with README, CI stub, repo-level PAT stubs
3. Updates `project.yaml` with repo locations

🦊 Show the audience the GitLab group — all repos visible. Walk through one managed repo.

👀 All repos exist. Topology complete. Scaffolding only — no implementation yet.

---

# Stage 1: First Development Cycle

**Goal:** Demonstrate one complete dev cycle — implement a component, transform PAT stubs into real acceptance tests, tag a release. Proves the PAT-driven workflow before tackling integration.

**Live demo:** TODOM-000c (todo-m-api-read) — the simplest component. One endpoint, no UI, clean PAT-to-AT transformation.

**Fast-forward:** After the live demo, pre-baked commits land the remaining components (TODOM-000d, TODOM-000b, TODOM-000a) so we can move to integration without repeating the same cycle three more times.

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

### Existing
- `generate-pats` — already built (Stage 0)
- `decompose-story` — already built (Stage 0)

### New for Stage 1
- `implement-component` — Reads a sub-task file, scaffolds the implementation (Express app, package.json, etc.), and generates the initial code. Works from the repo-level PATs in the sub-task.
- `generate-acceptance-tests` — Transforms PAT stubs into real test code using the repo-appropriate framework. Reads the sub-task to determine what framework to use (supertest for API, Testing Library for MFE, Cypress for root).
- `tag-release` — Tags a managed repo at a version (v0.1.0), following the auto-tag convention. Updates the root repo's project.yaml to pin the new version.

### Deferred (Stage 2+)
- `create-readiness-tracker` — Creates the readiness manifest in the root repo
- `shadow-integration` — The topology MR workflow (CI-driven, not a Kiro capability)

---

## Step 5: Implement todo-m-api-read (Live Demo) ⏳

💬 `Implement TODOM-000c in todo-m-api-read. Use the sub-task file for context.`

👻 Reads `jira/TODOM-000c.md` from the root repo. Scaffolds:
1. `package.json` with Express, supertest, vitest as dependencies
2. `src/index.js` — Express app with `GET /hello` → `{ "message": "Hello from todo-m-api-read" }`
3. `src/index.test.js` — placeholder (tests come from PAT transformation next)

👀 Audience sees: AI reading the sub-task, understanding the contract, generating minimal implementation.

---

## Step 6: Transform PAT Stubs into Acceptance Tests ⏳

💬 `Generate acceptance tests for TODOM-000c from the PAT stubs.`

👻 Reads `pats/TODOM-000c.stub.js`, transforms into real supertest specs:
1. Replaces stub comments with actual supertest assertions
2. `GET /hello` → expect 200, expect body to have `message` field
3. Writes `pats/TODOM-000c.spec.js` (or `__tests__/acceptance.test.js`)

💬 Reviews generated tests, confirms or tweaks.

🖥️ `npm test` — shows tests passing against the implementation.

👀 Audience sees: the PAT stub (pseudocode) becoming a real test (executable code). Same acceptance criterion, now deterministic and CI-runnable.

---

## Step 7: Tag and Release ⏳

🖥️ Tests pass. Tag the release.

👻 Tags `todo-m-api-read` at `v0.1.0`. Updates `project.yaml` in the root repo:
- `api-read` tag changes from `~` (null) → `v0.1.0`

🦊 Show the audience: the tag on GitLab, the updated project.yaml.

👀 First component released. One piece of the topology is real.

---

## Step 8: Fast-Forward Remaining Components ⏳

💬 `Fast-forward the remaining components to v0.1.0.`

👻 Pushes pre-baked implementations for:
- **TODOM-000d** (todo-m-api-write): Express + `POST /placeholder` → 200 OK + supertest specs
- **TODOM-000b** (todo-m-mfe): React component + Testing Library specs (mocked API)

Each gets tagged at `v0.1.0`. Root repo `project.yaml` updated to pin all referenced components.

📝 Presenter narrates: "Same cycle we just saw — implement, transform PATs, test, tag. We're fast-forwarding to keep the demo moving."

👀 All managed repos at v0.1.0. Topology fully implemented but not yet integration-tested.

---

## Step 9: Pause and Reflect ⏳

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
4. `decompose-story` — decomposes into sub-tasks, creates managed repos

The root repo becomes the source of truth the moment it's created. Each capability stays atomic with user decision points between steps.
