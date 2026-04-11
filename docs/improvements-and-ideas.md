# Improvements and Ideas

Captured during development of the reference implementation. Each item has
enough context to pick up without archaeology.

## Prioritisation

Items are tiered by impact and dependency ordering. Resolved items are
listed for completeness — their write-ups remain below as reference.

### Tier 1 — Structural integrity (do next)

| Item | Title | Rationale |
|------|-------|-----------|
| I-036 | project.yaml as live config | Root cause of recurring "forgot to update REPOS" bugs. Unblocks I-040. Highest leverage single item. |
| I-022 | Rename shadow → AOT | Terminology split causes confusion. Wide blast radius — best done in one focused pass before more docs accumulate. |

### Tier 2 — Completeness of the delivery loop

| Item | Title | Rationale |
|------|-------|-----------|
| I-004 | Merge transaction, auto-tag, auto-bump (remaining) | Shadow status works. Post-merge lifecycle is entirely manual. Other half of the M promise. |
| I-030 | Standalone and follow-up MRs | Any real project has non-story MRs. Currently these trigger full AOT and fail. Quick fix, big usability impact. |
| I-040 | Topology changes | Adding/removing components mid-project is undefined. Depends on I-036 for clean implementation. |
| I-041 | Pessimistic invalidation on pipeline start | Push `pending` to all story MRs when any constituent pipeline starts. Tightens the gate. |

### Tier 3 — Architecture and extensibility

| Item | Title | Rationale |
|------|-------|-----------|
| I-009 | Plugin architecture (umbrella) | Unifies I-003, I-008, I-014, I-015, I-018, I-019, I-024, I-025 under a coherent pattern. The `scm.*` provider interface solved one dimension; same pattern needed for CI, test, compose, deploy. |
| I-003 | Configurable PAT→CAT framework | Sub-item of I-009. Test stack as project config, not hardcoded. |
| I-008 | Role-specific CI templates | Sub-item of I-009. Frontend vs backend scaffold CI. |
| I-014 | Compose strategy as plugin | Sub-item of I-009. Reference impl is Docker Compose + DinD. |
| I-015 | Project templates | Sub-item of I-009. Pluggable scaffolding blueprints per role. |
| I-018 | Compose strategy boundary in wire-orchestration | Sub-item of I-009. Separate methodology contract from reference impl. |
| I-019 | Persistence layer as plugin | Sub-item of I-009. Shared state between components. |
| I-024 | Project template catalogue | Sub-item of I-015. Org-level template registry. |
| I-025 | Two-tier config: M Core + Org Config | Distribution model. Batteries-included defaults + org overlay. |
| I-026 | Onboarding flows | Greenfield vs existing org adoption paths. |
| I-027 | Installation mechanics | Concrete distribution: npm, CLI, power bundle. |
| I-028 | Repo reorganisation | Separate distributable M from workshop artefacts. Prerequisite for I-029. |
| I-029 | Version M as npm package with CLI | CLI built. Remaining: npm publish, AI changelog, repo reorg (I-028). |

### Tier 4 — Polish and nice-to-haves

| Item | Title | Rationale |
|------|-------|-----------|
| I-001 | Story Zero wizard | Cold-start UX. Nice but Story Zero is a one-time event per project. |
| I-002 | Remove jira/ from GitLab repos | Conceptual cleanliness. Harmless but messy. |
| I-006 | API stubs for frontend repos | Scaffold convenience. Currently manual. |
| I-016 | Methodology paper overhaul | Post-demo. Accumulate learnings first. |
| I-017 | DRY compose jobs | Tech debt. No functional change. |
| I-034 | MR reopen events | Webhook edge case. Rare in practice. |
| I-035 | Duplicate pipelines on MR close | CI noise. Not blocking. |
| I-037 | AC-to-PAT 1:many mapping | PAT expressiveness. Current model works for simple stories. |
| I-038 | Sub-task PATs in YAML | Inner validation loop. Complementary to I-039. |

### Resolved

| Item | Title | Resolution |
|------|-------|------------|
| I-004 | End-to-end loop (partial) | Shadow status reporting working. Merge transaction, auto-tag, auto-bump still TODO. |
| I-005 | API scaffold CORS + port | Fixed in pass1. scaffold-repo updated. |
| I-007 | Pipelines must succeed | Applied to all repos. scaffold-repo updated. |
| I-010 | Shadow integration visible on MRs | shadow:report-status/failure push commit statuses. |
| I-011 | Root repo MR pipeline rules | MR rules added to validate jobs. |
| I-012 | Embedded shell lifecycle | Root repo CI has full lifecycle. |
| I-013 | Compose from story branches | Eager model via resolve-story-branches.sh. |
| I-020 | Root repo sub-task mandatory | decompose-story enforces root sub-task. |
| I-021 | PAT validation loop in steering | Steering template updated. |
| I-031 | Stale green race condition | Instant invalidation pushes pending before AOT. |
| I-032 | Pipeline failure webhook | pipeline_events on webhooks, detect-trigger handles pipeline_failure. |
| I-033 | 90s invalidation window | Accepted limitation. Documented. |
| I-039 | Decomposition auto-establishes AOT gate | decompose-story Step 4: auto-compile PAT → Cypress, raise root MR. |

---

## I-001: Story Zero wizard (`init-story-zero`)

**Category:** M Power capability
**Priority:** Nice to have
**Discovered:** 2026-04-02, during workshop script review

### Problem

The `bootstrap-root-repo` capability expects a Story Zero markdown file with
a `## Project` section containing structured metadata (project name, GitLab
group, topology mode, component catalogue, etc.). This file is currently
hand-authored with no tooling support. The format is documented informally
in the `bootstrap-root-repo` capability doc but there's no schema, no
template, and no interactive help.

This is the cold-start problem: the very first artefact in an M-type project
is written freehand, with no guardrails.

### Proposal

Create an `init-story-zero` M Power capability that:

1. Asks the user a series of questions:
   - Project name
   - GitLab group path
   - Topology mode (distributed / monolith-first)
   - Component catalogue (name, role, type for each)
   - CI platform, PAT framework, deployment model
2. Generates a complete Story Zero markdown file with:
   - `## Project` section pre-filled from answers
   - `## Summary` with a standard bootstrapping description
   - `## Acceptance Criteria` with sensible defaults for infrastructure validation
     (shell loads, MFE composes, API responds, components versioned, story-level tests pass)
3. Writes the file to `workshop/jira/<story-id>.md` (or wherever the user specifies)
4. Presents the draft for review before finalising

The generated file then feeds directly into `bootstrap-root-repo` as the
`story-file` parameter — closing the loop.

### Alternative

Just formalise the `## Project` section as a documented template/schema in
the methodology docs and let users write it by hand. Story Zero is a
one-time event per project, so the ROI on a full capability is debatable.
A middle ground: ship a markdown template file in the power that users
copy and fill in.

### Dependencies

- Needs the `## Project` section format to be stable (it currently is,
  defined in `bootstrap-root-repo.md`)
- Should align with the instantiation parameters listed in methodology-m.md
  Section 6 (topology mode, component catalogue, CI platform, etc.)

---

## I-002: Remove `jira/` folders from GitLab repos — Jira is external

**Category:** Conceptual fix / M Power capability docs
**Priority:** Important (affects demo integrity)
**Discovered:** 2026-04-02, during workshop script review

### Problem

The current implementation commits story files and sub-task files into
`jira/` folders on the GitLab repos (root repo and managed repos). This
is conceptually wrong. Jira is an external system — stories and sub-tasks
don't live in the code repos. We emulate Jira with markdown files in
`workshop/jira/` in the methodology repo, but that emulation shouldn't
leak into the GitLab repos.

What belongs where:

| Artefact | Where it lives | Why |
|----------|---------------|-----|
| Stories (TODOM-000.md) | Jira (emulated: `workshop/jira/`) | External system, not code |
| Sub-tasks (TODOM-000a.md etc.) | Jira (emulated: `workshop/jira/`) | External system, not code |
| Story-level PATs (.pat.yaml) | Root repo `pats/` | Validation artefact, travels with code |
| Readiness trackers (.yaml) | Root repo `stories/` | Orchestration artefact |
| Repo-level PAT stubs (.stub.js) | Managed repo `pats/` | Component contract |
| project.yaml | Root repo root | Topology manifest |

### What needs to change

1. **`bootstrap-root-repo` capability doc** — stop committing the story
   file to `jira/` in the root repo. The story file stays in Jira
   (or our local emulation). The capability reads it as input but
   doesn't copy it into the repo.

2. **`decompose-story` capability doc** — write sub-task files to the
   Jira emulation folder (`workshop/jira/` or equivalent), not to the
   root repo's `jira/` folder. In a real project with Jira MCP, this
   would create Jira sub-tasks instead.

3. **`scaffold-repo` capability doc** — read sub-task files from Jira
   (emulated or real), not from the root repo. Only push PAT stubs
   to the managed repo, not the sub-task markdown.

4. **Existing GitLab repos** — the `jira/` folders on `todo-m-root`,
   `todo-m-api-read`, `todo-m-api-write`, and `todo-m-mfe` contain
   files that shouldn't be there. Either remove them or accept them
   as pass1 artefacts and fix for pass2.

5. **Workshop steering** — clarify that `workshop/jira/` is the Jira
   emulation and that nothing from there gets committed to GitLab repos.

### Impact on the demo

If we demo TODOM-001 with the corrected model, the audience sees the
clean separation: stories live in Jira, PATs live in repos. That's a
stronger message than having story files scattered across GitLab repos.

### Decision needed

Fix now (before TODOM-000 completion) or fix for pass2? The existing
`jira/` folders on GitLab are harmless but conceptually messy. Fixing
the capability docs is quick; cleaning up the GitLab repos requires
commits to remove the folders.

---

## I-003: Configurable PAT→CAT transformation framework

**Category:** M Power capability design
**Priority:** Important (affects extensibility)
**Discovered:** 2026-04-04, during TODOM-000d implementation

### Problem

The `generate-acceptance-tests` capability has a **hardcoded mapping** from
component role to test framework (backend → supertest+vitest, MFE →
Testing Library+vitest, shell → Cypress). This works for the reference
implementation but isn't extensible. A real project might use Playwright
instead of Cypress, happy-dom instead of jsdom, or a completely novel
framework that the capability has never seen.

The framework choice is a **Lead Dev decision**, not something the
methodology should dictate. The BA owns the story and PATs; the Lead Dev
owns the technical meta — including how PATs get compiled into CATs.

### Proposal

**Test stack declaration in Story Zero / project meta:**

Story Zero already captures project-level decisions (topology, CI platform,
deployment model). The Lead Dev should also declare the test stack per
component role during project bootstrap:

```
# In project.yaml or a dedicated test-config section
test-stacks:
  backend: supertest + vitest
  frontend: testing-library + vitest
  frontend-host: playwright
```

This is project meta provided by the Lead Dev, not the BA.

**Three-tier resolution in `generate-acceptance-tests`:**

1. **Repo-level override** — repo's `package.json` or `.kiro/` config
   declares its specific test stack. Highest priority.
2. **Project-level default** — from Story Zero / `project.yaml` test
   stack declaration. Used when repo doesn't override.
3. **Built-in fallback** — the current hardcoded mapping. Used when
   neither repo nor project declares anything.

**Transformation examples for novel frameworks:**

For frameworks the capability doesn't have built-in knowledge of, the
repo (or project) provides a **transformation example** — a sample
stub→spec pair in `.kiro/` that teaches the AI the pattern. Essentially
few-shot prompting baked into the project config.

```
.kiro/
  test-examples/
    stub-example.js    ← sample PAT stub
    spec-example.js    ← corresponding compiled spec
```

The capability reads these as context before generating, learning the
target framework's patterns from the example rather than from hardcoded
templates.

### Dependencies

- Needs Story Zero / `project.yaml` schema to support test stack declarations
- Aligns with I-001 (Story Zero wizard) — the wizard should ask the Lead Dev
  about test stacks during bootstrap
- The `generate-acceptance-tests` capability doc needs updating to describe
  the three-tier resolution

### Impact

Makes M genuinely framework-agnostic for testing. The methodology prescribes
PAT→CAT as the mechanism; the project chooses the tools.

---

## I-004: End-to-end orchestration loop — shadow status, merge transaction, auto-tag, topology bump

**Category:** Orchestration / CI pipeline design
**Priority:** Critical (core M workflow gap)
**Status:** ✅ Partially resolved (2026-04-05) — shadow status reporting working; merge transaction, auto-tag, auto-bump still TODO
**Discovered:** 2026-04-04, during pass1 step 13–14 execution

### Problem

The current orchestration wiring (step 5) sets up webhooks and a root repo
pipeline, but the **feedback loop is incomplete**. Several steps that should
be automated require manual intervention or are missing entirely:

1. **Shadow integration result not reported back to managed repo MRs.**
   The root repo runs shadow:compose and shadow:integration-test, but the
   result stays on the root repo. The managed repo MR has no idea whether
   shadow integration passed or failed. The dev is blind.

2. **Merge transaction is manual but has no gate.** The merge-transaction
   job sits at `when: manual` but there's no mechanism to signal "all
   shadow integrations passed, you may now merge." It's just a button
   that's always there.

3. **No auto-tag after merge.** The `tag` CI job exists in managed repos
   with a placeholder script, but there's no automation to tag a component
   after its MR is merged via the merge transaction.

4. **No auto-bump of project.yaml.** After a component is tagged, the
   topology manifest (`project.yaml`) in the root repo needs updating.
   Currently this is a manual edit — pure bookkeeping that nobody should
   have to do.

### Target flow

From the dev's perspective:

1. Implement → CATs pass → raise MR → **done, wait**
2. Shadow integration runs automatically (webhook-triggered)
3. Shadow result appears as a **commit status on the managed repo MR**
   - Pass → MR goes green, dev knows they're good
   - Fail → MR goes red, dev knows the composed system is broken,
     reaches out to fellow devs
4. Dev's job is finished. Everything after this is automation.

From the automation's perspective:

5. All managed repo MRs for a story are green (shadow passed)
6. **Merge transaction becomes available** — manual trigger on root repo.
   A tech lead or presenting dev clicks it. One click, all MRs merge
   atomically.
7. After merge → **auto-tag** each component (semver bump)
8. After tag → **auto-bump project.yaml** (topology manifest update)

### Design decision: no auto-merge

Shadow integration passing means "these components work together." It does
not mean "we're ready to ship." Reasons to keep merge as a deliberate act:

- **Code review might not be done** — shadow validates the system, not
  code quality
- **Timing** — the team may want to land the story at a specific point
- **Partial story** — 2 of 3 components pass shadow, but the third is
  still in progress. Auto-merging the first two changes the baseline
  for the third dev
- **Merge transaction exists for coordination** — auto-merge turns it
  into a race condition where whoever's pipeline finishes first gets
  merged first

The merge transaction button should light up when all pieces are ready.
The human makes the "go" decision. Everything before and after is automated.

### What needs building

| Piece | Description |
|-------|-------------|
| Commit status reporting | Shadow integration pushes pass/fail status back to managed repo MR via GitLab commit status API |
| Merge transaction gating | Root repo CI shows merge-transaction as available only when all managed MRs have green shadow status |
| Auto-tag on merge | Managed repo `tag` CI job runs real version bumping after merge to main |
| Auto-bump project.yaml | Root repo reacts to tag events (webhook or CI trigger) and updates the topology manifest |

### Dependencies

- Needs the managed repo webhooks to include `tag_push_events` (currently
  only `merge_requests_events`)
- Commit status API requires a token with `api` scope on the managed repos
- The `wire-orchestration` capability doc needs updating to reflect the
  full loop
- The `scaffold-repo` CI template needs the `tag` job to have real logic

### Impact

This closes the gap between "orchestration is wired" and "orchestration
actually works end-to-end." Without this, the M workflow requires manual
bookkeeping at multiple points, which undermines the methodology's promise
of automated coordination.

---

## I-005: API scaffold should include CORS and configurable port out of the box

**Category:** Scaffold template / M Power capability
**Priority:** Important (affects every API repo)
**Status:** ✅ Resolved (2026-04-05)
**Discovered:** 2026-04-04, during MFE visual verification against api-read

### Resolution

Fixed in pass1 during housekeeping session:
- api-read port default: 3001 → 3002
- api-write port default: 3002 → 3003
- api-write: added `cors` dependency and `app.use(cors())` middleware
- MFE: fixed `API_URL` default from localhost:3000 → localhost:3002
- MFE webpack config: same fix for DefinePlugin

Port convention standardised:
- shell=3000, MFE=3001, api-read=3002, api-write=3003

**Still needed:** The `scaffold-repo` capability doc should generate
backend repos with CORS middleware and correct port defaults out of the
box, so future projects don't hit this. Updated in scaffold-repo.md.

### Problem

The `scaffold-repo` capability creates API repos with a bare Express app
that has no CORS middleware and a hardcoded fallback port. When the MFE
tried to fetch from the API cross-origin, it failed silently until CORS
was manually added. The port defaulted to 3001 which conflicted with the
MFE dev server.

These are not edge cases — they're the default development scenario for
any distributed system with a frontend and backend on different ports.

### What should come out of the box

For `repo-type: node` with `role: backend`:

1. **CORS middleware** — `cors` package installed, `app.use(cors())`
   in the app. Configurable via environment variable for production
   lockdown, but permissive by default for development.

2. **Configurable port** — `PORT` env var with a sensible default that
   doesn't collide with common dev server ports. Convention:
   - API read: 3000
   - API write: 3002
   - MFE dev server: 3001
   - Shell dev server: 3003

   Or better: derive from `project.yaml` component order so ports
   are assigned deterministically.

### What needs to change

1. **`scaffold-repo` capability doc** — the `app.js` template for
   backend repos should include `cors` middleware
2. **`scaffold-repo` capability doc** — `package.json` template should
   include `cors` as a dependency for backend repos
3. **`scaffold-repo` capability doc** — `server.js` template should
   use a port that doesn't collide (or document the convention)
4. **Existing repos** — `todo-m-api-read` needs the CORS fix committed

### Impact

Without this, every API repo requires a manual CORS fix the moment a
frontend tries to talk to it. That's a guaranteed stumble in every
demo and every new project.

---

## I-006: Scaffold should generate API stubs for frontend repos

**Category:** Scaffold template / M Power capability
**Priority:** Important (affects every frontend repo)
**Discovered:** 2026-04-04, during MFE CAT compilation

### Problem

Frontend repos (MFE, shell) depend on API contracts for testing. When
compiling PATs into CATs, the Cypress tests need a running API to fetch
from. In CI there's no real API available — the repo is tested in
isolation.

Currently the developer has to manually create API stubs. This is
boilerplate that can be derived from the sub-task file — the API
contract is already defined there.

### Proposal

During `scaffold-repo` (or `decompose-story`), when a frontend sub-task
references an API dependency:

1. Generate a stub server in `pats/stubs/<api-name>.js` that implements
   the contract endpoints with hardcoded responses
2. Include `express` and `cors` as devDependencies
3. Include `serve` and `wait-on` as devDependencies (for serving the
   built MFE and waiting for readiness in CI)
4. Wire the CI test job to start stubs before running Cypress

The stub is derived from the API sub-task's acceptance criteria — the
same source that defines the real API's contract. This keeps stubs
and real implementations aligned by construction.

### CI pattern for frontend repos

```
test:
  image: cypress/included:latest
  script:
    - node pats/stubs/api-read.js &
    - npm run build
    - npx serve dist -l 3001 &
    - npx wait-on http://localhost:3000/hello http://localhost:3001
    - npm test
```

### Impact

Frontend repos become self-contained for testing. No external
dependencies needed in CI. Stubs are traceable to the same PATs
that define the real API contract.

---

## I-007: Scaffold must enforce "pipelines must succeed" and shadow integration as MR gate

**Category:** Scaffold template / M Power capability
**Priority:** Critical (merge integrity)
**Status:** ✅ Resolved (2026-04-05) — setting applied to all four repos via API
**Discovered:** 2026-04-04, during MFE MR — GitLab showed "ready to merge" while pipeline was still running

### Problem

GitLab defaults to allowing merges regardless of pipeline status. The
`scaffold-repo` capability sets up branch protection (push=no one,
merge=maintainers) but does not configure the project-level merge
setting `only_allow_merge_if_pipeline_succeeds`.

This means an MR can be merged while the pipeline is still running or
even failing. In a demo, this looks broken. In production, it's
dangerous.

### What needs to change

1. **`scaffold-repo` capability** — after creating the repo and setting
   branch protection, call `update_project_settings` with
   `only_allow_merge_if_pipeline_succeeds: true` on every managed repo
   and the root repo.

2. **Shadow integration as MR gate** — the shadow integration result
   (from I-004) should also block the MR. This requires the commit
   status from the root repo's shadow pipeline to be reported back to
   the managed repo MR. Until that external status is green, the MR
   stays blocked.

   This is the combination of I-004 (commit status reporting) and this
   improvement (pipeline-must-succeed enforcement). Together they mean:
   - Repo-level pipeline must pass (own tests)
   - Shadow integration must pass (composed system tests)
   - Only then can the MR be merged (via merge transaction)

### Impact

Without this, the merge button is available before validation completes.
The whole point of M's orchestration is that merges are gated by both
repo-level and story-level validation. This setting is the foundation
of that gate.

---

## I-008: Scaffold should generate role-specific CI templates (frontend vs backend)

**Category:** Scaffold template / M Power capability
**Priority:** Important (affects every frontend repo)
**Discovered:** 2026-04-04, Cypress failing in GitLab CI due to entrypoint conflict

### Problem

The current scaffold generates the same `.gitlab-ci.yml` for all repo
types. Frontend repos that use Cypress for acceptance testing need:

1. A different Docker image for the test stage (`cypress/included`)
2. An entrypoint override (`entrypoint: [""]`) because the Cypress
   image's default entrypoint intercepts GitLab Runner's shell script
3. A pre-test setup that starts stub servers and serves the built app
4. `wait-on` to ensure services are ready before tests run

None of this is obvious. A dev hitting the `cypress/included` entrypoint
issue for the first time will waste significant time debugging it.

### Proposal

The `scaffold-repo` capability should generate role-specific CI templates:

**Backend (role: backend):**
- Image: `node:20`
- Test stage: `npm test` (supertest/vitest, no browser needed)

**Frontend (role: frontend, frontend-host):**
- Test stage uses `cypress/included` with `entrypoint: [""]`
- Script starts stub servers, builds, serves, waits, then runs Cypress
- Pattern:
  ```
  test:
    image:
      name: cypress/included:latest
      entrypoint: [""]
    script:
      - node pats/stubs/<api-stub>.js &
      - npm run build
      - npx serve dist -l <port> &
      - npx wait-on <urls>
      - npx cypress run
  ```

### Dependencies

- Ties into I-006 (auto-generated API stubs)
- Ties into I-003 (configurable test framework — if Playwright instead
  of Cypress, the image and commands change)
- The `scaffold-repo` capability doc needs a `role` parameter to
  determine which template to use

---

## I-009: Audit and abstract hardcoded plugin choices in ref impl and M Power

**Category:** Architecture / M Power capabilities
**Priority:** Important (foundational)
**Discovered:** 2026-04-04, during MFE implementation — realised multiple
technology choices are hardcoded rather than pluggable

### Problem

The reference implementation and M Power capability docs hardcode
specific technology choices that should be plugins. Methodology M
defines the strategy (PATs, shadow integration, merge transactions);
the implementation tooling should be configurable per project.

See methodology-m.md Section 6a for the full strategy/plugin
architecture.

### Hardcoded choices that need abstracting

| Capability | Currently hardcoded | Should be plugin |
|---|---|---|
| `scaffold-repo` CI template | GitLab CI YAML | VCS/CI plugin |
| `scaffold-repo` test job | `npm test` / `cypress run` | CAT execution plugin |
| `scaffold-repo` API template | Express + no CORS | Backend framework plugin |
| `generate-acceptance-tests` | supertest (backend), Cypress (frontend) | CAT compilation plugin |
| `wire-orchestration` | GitLab webhooks + trigger tokens | VCS/CI plugin |
| PAT verification (agent) | Chrome DevTools (UI), curl (API) | PAT verification plugin |
| Stub generation | Express mock server | Stub generation plugin |

### What needs to happen

1. Define the plugin interface for each category — what does a
   "CI plugin" need to provide? What does a "CAT plugin" expose?
2. Update M Power capability docs to reference plugins by category,
   not by name
3. Move current hardcoded choices into a "reference plugin set" that
   ships as the default
4. Update Story Zero wizard (I-001) to ask plugin questions during
   bootstrap
5. Store plugin choices in `project.yaml` or a dedicated config section

**Critical: M Power capabilities must not contain platform-specific
logic.** The power defines the intent ("report shadow integration
result back to the source MR"). A provider implements the mechanism
(GitLab: commit status API + webhook variables; GitHub: check runs +
repository dispatch). The power calls the provider, never the platform
API directly. This applies to:

- `wire-orchestration` — webhook setup, trigger tokens, variable passing
- `scaffold-repo` — CI template generation, branch protection, project settings
- Shadow status reporting — commit status / check run API
- Merge transaction — MR merge API, tag creation

Each of these is currently hardcoded to GitLab. The provider interface
must be defined so that swapping to GitHub (or any other VCS/CI) is a
configuration change, not a rewrite of the power capabilities.

### Dependencies

- Ties into I-001 (Story Zero wizard — asks plugin questions)
- Ties into I-003 (configurable PAT→CAT framework)
- Ties into I-005 (CORS/port config — backend framework plugin)
- Ties into I-006 (stub generation plugin)
- Ties into I-008 (role-specific CI templates — CI plugin)
- This is effectively the umbrella item that unifies I-003, I-005,
  I-006, and I-008 under a coherent architecture

---

## I-010: Shadow integration must be visible on managed repo MRs and gate mergeability

**Category:** Orchestration / CI pipeline design
**Priority:** Critical (demo centrepiece)
**Status:** ✅ Resolved (2026-04-05) — shadow:report-status and shadow:report-failure jobs push commit statuses back to managed repo MRs
**Discovered:** 2026-04-04, during MFE MR — shadow integration ran on
root repo but was completely invisible on the managed repo MR

### Problem

Shadow integration runs on the root repo when a managed repo MR is
raised (via webhook). But the result stays on the root repo. The
managed repo MR has no idea whether shadow integration passed or
failed. The dev is blind, and the MR is mergeable regardless.

This makes the orchestration invisible to the audience in a demo.
The whole point of shadow integration is that a dev sees "integration:
green" or "integration: red" on their own MR.

### Required behaviour

1. Shadow integration result must be pushed back to the managed repo
   MR as a **commit status** (via GitLab commit status API). Green
   shadow → green status on MR. Red shadow → red status on MR.

2. The managed repo's "pipelines must succeed" setting (I-007) then
   gates the MR — if the external shadow status is red, the MR is
   blocked.

3. The dev sees two pipeline indicators on their MR:
   - Their own repo-level pipeline (install/build/test)
   - The shadow integration status from the root repo

4. Both must be green for the MR to be mergeable. But mergeable does
   NOT mean auto-merged — the merge transaction handles that (I-004).

### Story Zero sequencing

Shadow integration requires a composed system to test against. During
Story Zero, the shell (TODOM-000a) is the last component implemented.
Until the shell exists, there's nothing to compose and no story-level
tests to run.

The flow handles this naturally:

1. API MRs raised → shadow integration triggered → compose fails
   (no shell) → shadow reports failure with context: "compose failed —
   shell (TODOM-000a) not yet implemented" → MRs stay open, blocked
2. MFE MR raised → same: shadow blocked, MR shows why
3. Shell implemented in root repo → compose now works → shadow
   integration re-runs for all open MRs → all pass → all MRs
   become mergeable (green shadow status)
4. Merge transaction fires → lands everything atomically

The rule is absolute: **no green shadow, no merge.** Whether shadow
hasn't run, is pending, or has failed — the MR stays blocked. The
dev sees enough context on their MR to understand why and who to
talk to. This is by design — it forces the team to coordinate, which
is the whole point of the methodology.

### Implementation notes

- The root repo CI shadow jobs need to push commit statuses back to
  managed repos using the GitLab commit status API
- Requires a token with `api` scope on each managed repo (already
  planned in scaffold-repo for merge transaction)
- The shadow:compose script needs to handle "shell not ready" as a
  non-failure state
- When the shell lands, a re-trigger mechanism is needed to re-run
  shadow integration for all open managed repo MRs

### Dependencies

- I-004 (end-to-end orchestration loop — commit status reporting)
- I-007 (pipelines must succeed — gates the MR)
- Shell implementation (TODOM-000a) must exist before shadow
  integration can produce meaningful results

---

## I-011: Root repo scaffold must include MR pipeline rules in CI template

**Category:** Scaffold template / M Power capability
**Priority:** Important (blocks root repo MR mergeability)
**Status:** ✅ Resolved (2026-04-05) — MR rules added to validate jobs, wire-orchestration capability doc updated
**Discovered:** 2026-04-04, during Step 23 — root repo MR !4 couldn't merge because no pipeline ran

### Problem

The `wire-orchestration` capability generates a `.gitlab-ci.yml` for the
root repo with two pipeline contexts:

1. **Trigger pipelines** — shadow integration, fired by managed repo webhooks
2. **Main branch pipelines** — post-merge validation (`validate:compose`, `validate:integration-test`)

**Missing: MR pipelines.** The `validate:*` jobs only have rules for
`$CI_COMMIT_BRANCH == "main"`, so when an MR is raised on the root repo
itself (e.g. implementing the shell), no pipeline runs. GitLab's
`only_allow_merge_if_pipeline_succeeds` setting then blocks the merge
because there's no pipeline to succeed.

### Fix

Add `$CI_PIPELINE_SOURCE == "merge_request_event"` as an additional rule
to the `validate:compose` and `validate:integration-test` jobs:

```
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"
```

This was applied manually during pass1 (commit `81e46ea` on `todo-m-root`).

### What needs to change

The `wire-orchestration` capability doc must include MR pipeline rules
in the root repo CI template. This is a one-line addition per validate
job but it's easy to miss — and when it's missing, the root repo MR is
completely blocked with no obvious reason.

### Dependencies

- I-007 (pipelines must succeed) — this improvement assumes that setting
  is enabled, which makes the missing MR rule a hard blocker rather than
  just a cosmetic gap

---

## I-012: Embedded shell must follow managed repo lifecycle including shadow integration equivalent

**Category:** Architecture / CI pipeline design
**Priority:** Critical (conceptual integrity)
**Status:** ✅ Resolved (2026-04-05) — root repo CI has full lifecycle (install/build/test/compose/integration-test)
**Discovered:** 2026-04-04, during Step 23 — root repo MR had no compose/integration-test in its pipeline

### Problem

The shell lives in `packages/shell/` inside the root repo but it is
**conceptually a managed component** — it follows the same lifecycle
(install → build → test) and must pass the same integration gate
(shadow integration) before its MR can merge.

The initial root repo CI only had orchestration jobs (shadow integration
for managed repos, post-merge validation). It treated the root repo as
pure infrastructure, not as a project that also ships a component.

### Resolution

The root repo MR pipeline now runs the **full managed repo lifecycle
plus inline shadow integration**:

```
install → build → test → compose → integration-test
```

The compose and integration-test stages are the **inline equivalent of
shadow integration**. For managed repos, shadow integration is triggered
externally via webhook and reports back as a commit status. For the
embedded shell, the same validation runs as inline pipeline stages.

**The outcome is identical:** the MR cannot merge unless the composed
system works. The mechanism differs (inline vs webhook) because the
shell can't webhook itself, but the gate is the same.

### Design principle

**Every component — whether in its own repo or embedded in the root
repo — must pass the same gates before merge.** The root repo is not
special. It's an orchestrator AND a component host. Its CI must reflect
both roles:

1. **Component lifecycle** (install/build/test) — same as managed repos
2. **Integration gate** (compose/integration-test) — inline equivalent
   of shadow integration
3. **Orchestration** (shadow integration for others, merge transaction,
   post-merge validation) — root-repo-only concern, trigger-only

### What needs to change in M Power

The `wire-orchestration` capability must generate the root repo CI with
all three concerns from the start. Currently it only generates concern 3.
Concerns 1 and 2 should be generated based on the root repo's component
catalogue (if it hosts an embedded component like the shell).

### Dependencies

- I-011 (MR pipeline rules — prerequisite for this)
- I-008 (role-specific CI templates — the shell's lifecycle jobs should
  follow the same template pattern as managed repos)

---

## I-013: Shadow integration — compose from `main` vs `main` + open MR branches

**Category:** Architecture / orchestration design
**Priority:** Think further (not blocking, but affects Story Zero ordering)
**Status:** ✅ Resolved (2026-04-05) — eager model implemented via resolve-story-branches.sh, clones story MR branches instead of main
**Discovered:** 2026-04-04, during Step 24 — MFE MR blocked because shell
isn't on `main` yet, even though the shell MR is open and passing

### Problem

Shadow integration currently composes the system from `main` of all repos.
If a component isn't on `main` yet (its MR is still open), shadow
integration fails — even if that component's MR is green and ready.

This creates an **ordering constraint**: components must merge in
dependency order. For Story Zero, the shell (host) must merge before
the MFE (remote) can pass shadow integration. This is arguably correct
for Story Zero — the host should land first — but it's a constraint
the methodology doesn't explicitly acknowledge.

### The eager alternative

Shadow integration could compose from `main` + all open MR branches
for the same story. This would answer the question: "if we merge
everything that's in flight, does the system work?"

**Advantages:**
- No ordering constraint — all MRs can be validated in parallel
- Closer to what the merge transaction will actually produce
- Unblocks the "all components developed simultaneously" workflow

**Challenges:**
- Which MR branches to include? All open? Only same-story? Only those
  with green repo-level CI?
- Speculative merge conflicts — two MR branches might conflict
- Compose step becomes significantly more complex (multi-repo checkout
  at specific refs)
- False positives — testing a state that may never exist if one MR
  gets amended before merge

### Current model is fine for now

The `main`-only model works because:
- Story Zero has a natural ordering (shell before MFE)
- Future stories build on a working baseline — `main` already has all
  previous components, so each new MR is incremental
- The merge transaction handles atomicity — all MRs merge together,
  so the "what if one changes" problem is managed

### When the eager model becomes necessary

- Large stories with many independent components developed in parallel
- No natural dependency ordering between components
- Teams that can't tolerate sequential merge ordering

### Decision

Park for now. The `main`-only model works for the reference
implementation. Revisit if a real project hits the ordering constraint
as a genuine bottleneck rather than a Story Zero edge case.

---

## I-014: CI compose and integration-test need a pluggable runtime environment

**Category:** CI pipeline / architecture
**Priority:** Important (currently placeholder in CI)
**Status:** ✅ Resolved (2026-04-05) — Docker Compose + DinD reference implementation working in CI
**Discovered:** 2026-04-04, during Step 23 — compose script failed in CI
because it pointed at a non-existent `scripts/compose.js`

### Problem

The root repo's `compose` and `integration-test` npm scripts are
**validated locally** (start 4 services, run Cypress) but have no CI
implementation. The methodology defines the intent — "compose the
system and run story-level tests" — but the mechanism is a plugin
decision, not a methodology decision.

### Current state

The npm scripts are echo placeholders that pass in CI. The real
validation was done locally with Chrome DevTools MCP and Cypress.
This is acceptable for pass1 but not for a real project.

### The mechanism is pluggable

How you compose and test the system in CI depends on the project's
infrastructure choices. Examples:

| Approach | Compose | Integration-test |
|---|---|---|
| Docker Compose | `docker compose up -d` | `docker compose run cypress` |
| Fixed environment | Deploy to staging via CI | Run Cypress against staging URL |
| Kubernetes | Helm install to ephemeral namespace | Run tests against namespace URL |
| Local processes | Start services as background jobs | Run Cypress against localhost |
| Serverless | Deploy stack (e.g. CDK/SAM) | Run tests against deployed endpoints |

The methodology prescribes **what** (compose + integration-test as
lifecycle phases). The project chooses **how** (Docker, k8s, fixed
env, etc.). This aligns with I-009 (plugin architecture) — the
compose/integration mechanism is another plugin category.

### What needs to happen

1. Define a **compose plugin interface** — what does a compose plugin
   need to provide? (start, stop, health-check, base URL)
2. Define an **integration-test plugin interface** — what does it need?
   (base URL from compose, test runner command, teardown)
3. Store the plugin choice in `project.yaml` or Story Zero metadata
4. The `wire-orchestration` capability generates CI jobs that call the
   plugin, not a hardcoded mechanism
5. Ship Docker Compose as the **reference plugin** (most common case)

### Dependencies

- I-009 (plugin architecture — this is another plugin category)
- I-003 (configurable test framework — integration-test runner is
  related but distinct from unit CAT framework)
- Story Zero wizard (I-001) should ask about compose strategy during
  bootstrap

---

## I-015: Project templates — pluggable scaffolding blueprints per component role

**Category:** M Power capability / architecture
**Priority:** Important (reduces scaffold-to-implementation gap)
**Discovered:** 2026-04-05, during I-005 fix session — realised scaffold
generates minimal placeholders that always need the same boilerplate added

### Problem

The `scaffold-repo` capability generates a minimal seed (placeholder
scripts, empty app structure). Every implementation then follows the same
pattern for a given role: Express + CORS + server.js/app.js split for
APIs, React + webpack + Module Federation for MFEs, etc. This boilerplate
is repeated every time and is predictable from the component role.

Projects like `create-react-app`, `create-next-app`, and `express-generator`
solved this years ago — you pick a template and get a working starting
point, not an empty shell.

### Proposal

Introduce **project templates** as a pluggable layer in M Power, backed
by a centralised **M config repo** per organisation.

**M config repo** — when a company adopts Methodology M, they set up a
single config repo that acts as the organisation's registry of blessed
stacks and conventions. This repo contains (among other things) a
template catalogue: a mapping of short keys to git URLs.

```
# m-config/templates.yaml
templates:
  node-api: https://gitlab.com/acme/m-templates/node-api.git
  react-mfe: https://gitlab.com/acme/m-templates/react-mfe.git
  react-shell: https://gitlab.com/acme/m-templates/react-shell.git
  fastify-api: https://gitlab.com/acme/m-templates/fastify-api.git
  next-mfe: https://gitlab.com/acme/m-templates/next-mfe.git
```

Each template is a standalone git repo containing a complete seed for
a specific component role + tech stack combination. Templates can be
versioned via tags — the URL can include a ref.

**Project-level usage** — `project.yaml` references template keys with
optional version pinning (like npm dependencies). The config repo maps
keys to URLs; the project controls which version it wants:

```
# project.yaml
templates:
  backend: node-api@1.2.0
  frontend: react-mfe@2.0.0
  frontend-host: react-shell
```

Unpinned keys (e.g. `react-shell`) resolve to the latest/default branch.
Pinned keys (e.g. `node-api@1.2.0`) resolve to that tag in the template
repo. This keeps the catalogue simple (just key→URL) while giving
projects full control over when they upgrade.

**Resolution chain:**
1. `scaffold-repo` reads the component's role from the sub-task
2. Looks up the role in `project.yaml` → gets a template key
3. Resolves the key via the M config repo's `templates.yaml` → gets a URL
4. Clones the template, seeds the managed repo with its contents
5. Falls back to minimal placeholders if no template is declared

**Template content** — each template repo provides:
- `package.json` with real dependencies and scripts (not placeholders)
- Source file structure (app.js, server.js, index.js, etc.)
- Test setup (vitest config, testing library setup, etc.)
- Webpack/build config where applicable
- `.gitignore` tailored to the stack
- Optionally: a `template.yaml` manifest describing what the template
  provides and any parameters it accepts

### Template vs implementation

Templates provide the **structural starting point** — the framework,
build tooling, test setup, and conventions. Implementation provides
the **business logic** — the actual endpoints, components, and
behaviour described in the sub-task.

The line is: if you'd copy-paste it from the last project, it's a
template concern. If it comes from the sub-task acceptance criteria,
it's an implementation concern.

### Relationship to I-009 (plugin architecture)

Templates are a specific instance of the plugin concept. Where I-009
talks about abstracting CI platforms and test frameworks, templates
abstract the initial project structure. They're complementary:
- Plugins define **how things run** (CI, test runner, compose)
- Templates define **what gets generated** (source structure, deps, config)

### Dependencies

- I-001 (Story Zero wizard — should ask about templates during bootstrap)
- I-009 (plugin architecture — templates are a plugin category)
- I-003 (configurable test framework — template includes test setup)
- `scaffold-repo` capability doc needs a `template` parameter
- Needs an M config repo concept defined — the org-level registry that
  holds template catalogue, default conventions, and shared config.
  This is a new artefact type in the methodology: one per company,
  referenced by all projects.


---

## I-016: Methodology paper overhaul

**Category:** Documentation
**Priority:** Post-demo (after TODOM-001 workshop is complete)
**Discovered:** 2026-04-05, during project.yaml design session

### Problem

The methodology paper (`methodology-m.md`) was written before the
reference implementation existed. Many concepts have been refined,
renamed, or expanded during pass1. The paper needs a major overhaul
to reflect what we've actually built and learned.

### What needs updating

- **project.yaml schema** — the paper references a minimal topology
  manifest. The actual schema now includes ports, templates, compose
  strategies, pat-compilation, and environment pipelines
  (see `docs/project-yaml-design.md`)
- **Shadow integration** — the paper describes the concept but the
  implementation details (webhook flow, commit status reporting,
  compose strategies) are much richer now
- **Templates and M config repo** — new concept not in the original paper
- **PAT→CAT compilation** — configurable per role, not hardcoded
- **Compose vs deploy** — the distinction between pre-merge assembly
  and post-merge deployment pipelines
- **Plugin architecture** — the paper mentions extensibility but the
  concrete plugin categories (CI, compose, deploy, test, template)
  emerged during implementation
- **Fix-forward rule** — emerged as a key practice, not in the paper
- **Embedded vs referenced components** — the shell lifecycle pattern

### Approach

Don't rewrite during the demo sprint. Capture everything in improvement
items and design docs as we go. After TODOM-001 is complete and the
workshop is proven, do a single focused overhaul pass on the paper
using all the accumulated learnings.



---

## I-017: DRY up shadow:compose and validate:compose in root repo CI

**Category:** CI pipeline / maintainability
**Priority:** Nice to have (tech debt)
**Discovered:** 2026-04-05, during pipeline failure analysis on MR !6

### Problem

The root repo `.gitlab-ci.yml` has two compose jobs — `shadow:compose`
(triggered by managed repo webhooks) and `validate:compose` (runs on
MR events and main pushes). Both contain identical logic: clone sibling
repos, `docker compose build`, `docker compose up -d`, health-check
loop, teardown in `after_script`.

This is copy-pasted code. Fix a timeout in one, forget the other.
Change a health endpoint, update one but not both. Classic drift risk.

### Proposal

Two options, in order of preference:

1. **Shared script** — extract the clone/build/healthcheck/teardown
   logic into `scripts/compose-up.sh` in the root repo. Both jobs
   call `sh scripts/compose-up.sh`. Cleaner, testable locally, and
   the diff between the two jobs becomes just the `rules:` block.

2. **YAML anchors** — extract the shared `script`, `before_script`,
   `after_script`, `image`, `services`, and `variables` into a YAML
   anchor. Both jobs reference it and only override `rules` and
   `needs`. Stays in one file but YAML anchors get ugly with complex
   structures.

### Impact

Pure maintainability. No functional change. Prevents the two jobs
from drifting apart as the compose logic evolves (new services,
different health endpoints, timeout changes, etc.).


---

## I-018: Compose strategy as a formal plugin boundary in wire-orchestration

**Category:** Architecture / M Power capability design
**Priority:** Important (foundational for extensibility)
**Discovered:** 2026-04-05, during DinD health check fix on MR !6

### Problem

The `wire-orchestration` capability currently generates CI with
Docker Compose + GitLab DinD details baked directly into the template
(DinD service, TLS certs, `apk add`, `docker` hostname for health
checks, etc.). This is all GitLab + Docker Compose implementation
detail — not methodology.

### The layering

- **Power (methodology):** "the compose stage must clone siblings,
  build the stack, verify health, and tear down." Defines lifecycle
  phases and the contract each must satisfy.
- **Plugin (compose strategy):** "Docker Compose via DinD on GitLab CI"
  — DinD service config, TLS certs, `docker` hostname, `apk` installs.
  A different plugin might use k8s, bare processes, or serverless deploy.
- **Project config:** ports, endpoints, timeout values, which siblings
  to clone — from `project.yaml`.

### Product model

M Power ships one reference implementation per plugin category:
- VCS/CI: GitLab
- Compose strategy: Docker Compose (DinD for CI, native for local)
- Test framework: Cypress (story-level), vitest (repo-level)

These are batteries-included defaults. Community can provide
alternatives (GitHub Actions, Playwright, k8s compose, etc.) against
the same contract interfaces. Nobody's blocked, nobody boils the ocean.

### What needs to happen

1. The `wire-orchestration` capability doc should clearly separate
   the methodology contract ("what compose must do") from the
   reference implementation ("how GitLab + Docker Compose does it")
2. DinD-specific gotchas (like `docker` hostname vs `localhost`)
   belong in the GitLab plugin notes, not in the generic template
3. The formal plugin interface definition is I-009 scope — for now,
   just make the boundary visible in the docs

### Relationship to other items

- I-009 (plugin architecture — this is a specific instance)
- I-014 (pluggable runtime environment — same concern, compose focus)
- I-017 (DRY up compose jobs — should use the plugin pattern)


---

## I-019: Persistence layer as a pluggable concern in M config repo

**Category:** Architecture / M Power capability design
**Priority:** Important (affects every project with shared state)
**Discovered:** 2026-04-05, during TODOM-001 API design — api-read and
api-write need shared state, no mechanism to declare persistence choice

### Problem

When two or more components need shared state (e.g. api-read and
api-write sharing a todo list), the persistence mechanism is currently
an ad-hoc implementation decision per repo. There's no project-level
declaration of "we use SQLite" or "we use Postgres", no scaffold
support for wiring it up, and no compose template for adding a DB
service or shared volume.

### The layering

- **M config repo (organisation):** catalogue of blessed persistence
  options — SQLite (dev/simple), Postgres, DynamoDB, Redis, etc.
  Each option is a template that includes: dependency, connection
  setup, migration pattern, compose service/volume config.
- **project.yaml (project):** declares which persistence option the
  project uses, e.g. `persistence: sqlite` or `persistence: postgres`.
- **scaffold-repo (power):** reads the persistence declaration and
  wires the chosen option into backend repos — adds the dependency,
  generates connection boilerplate, updates docker-compose.yml with
  the service or shared volume.

### Reference implementation

For the todo-m workshop: SQLite on a shared Docker volume. Both
api-read and api-write mount the same volume and access the same
`.db` file. No extra container needed.

### What needs to happen (future)

1. Define persistence as a plugin category in I-009
2. Add persistence declaration to project.yaml schema
3. Create SQLite and Postgres templates in the M config repo concept
4. Update scaffold-repo to wire persistence from project declaration
5. Update docker-compose template generation to add volumes/services

### Relationship to other items

- I-009 (plugin architecture — persistence is another plugin category)
- I-015 (project templates — persistence setup is part of the template)
- I-018 (compose strategy — DB services are part of compose config)


---

## I-020: Root repo sub-task is mandatory for every story

**Category:** Methodology / M Power capability
**Priority:** Critical (shadow integration integrity)
**Status:** ✅ Resolved (2026-04-05) — decompose-story and wire-orchestration capability docs updated
**Discovered:** 2026-04-05, during TODOM-001 shadow integration design

### Problem

Shadow integration needs story-level integration tests to be a real
gate. Without tests, shadow compose passes as long as containers are
healthy — which tells you nothing about whether the story's features
work.

The integration tests live on the root repo. But if a story doesn't
change the shell (like TODOM-001), there's no natural root repo MR,
and therefore no integration tests.

### Resolution

Every story MUST have a root repo sub-task, regardless of whether the
shell code changes. The root repo's contribution to every story is:

1. Story-level integration tests (`scripts/integration-tests/<story-id>.sh`)
2. Compose config changes (if needed)
3. Readiness tracker updates

The `decompose-story` capability now enforces this — the root repo
sub-task is mandatory and always the last suffix in the decomposition.

The integration test framework has two failure modes:
- **Structural:** story has open MRs but no test script → fail
- **Logical:** test script exists but checks fail → fail

Both prevent premature merging. The shadow pipeline bootstraps from
the root repo's story branch to pick up story-specific tests.

### Capability docs updated

- `decompose-story.md` — mandatory root repo sub-task rule, root
  sub-task format, integration test contract
- `wire-orchestration.md` — integration test gate section with
  structural/logical failure modes

---

## I-021: PAT validation loop must be explicit in managed repo steering

**Category:** Steering / developer workflow
**Priority:** Critical (methodology integrity)
**Status:** ✅ Resolved (2026-04-06) — steering template updated in scaffold-repo capability doc and all live managed repos
**Discovered:** 2026-04-06, during TODOM-001c implementation — agent
implemented the component and declared "done" without validating
against PATs in a browser

### Problem

The managed repo steering describes the development workflow as a
linear sequence: read sub-task → implement → transform PATs → run
tests → raise MR. But it doesn't explicitly state that implementation
and PAT validation are the same activity — a continuous loop, not
separate phases.

During TODOM-001c, the agent built the Todo component, verified the
webpack build passed, and declared implementation complete. It took
a human prompt to remind it to actually open Chrome, start the dev
server with API stubs, and verify the component against the PAT
contract (renders correctly, data-testid attributes present, add
flow works, empty state displays).

A passing build is not PAT validation. PAT validation means
demonstrating that the implementation satisfies the acceptance
criteria using whatever tools are appropriate (browser, curl,
Chrome DevTools MCP, etc.).

### Resolution

Updated the managed repo steering (`.kiro/steering/m-managed-repo.md`)
and the scaffold-repo capability template to make the PAT validation
loop explicit in the Development Workflow section:

1. Implementation IS PAT validation — they are the same activity
2. Never declare implementation complete without demonstrating PAT
   satisfaction using appropriate tools
3. For frontend components: open in browser, verify visually, check
   data-testid attributes
4. For API components: curl the endpoints, verify responses match
   the contract
5. Use API stubs (in `pats/stubs/`) to test frontend components
   against their dependency contracts

Also updated scaffold-repo capability doc to:
- Generate dependency-aware env vars (one per API dependency, from topology)
- Generate API stubs for frontend repos with API dependencies
- Include shared-state pattern for read/write stub pairs

---

## I-022: Rename "shadow integration" to "ahead-of-time integration"

**Category:** Terminology
**Priority:** Important (affects all docs, slides, demo script)
**Discovered:** 2026-04-06, during demo rehearsal

### Problem

"Shadow integration" sounds sneaky — like something running behind the
scenes that you shouldn't trust. The mechanism is the opposite: it's
transparent, deliberate, and the core confidence signal in M.

### Proposal

Rename to **ahead-of-time integration** (AOT integration). This says
exactly what it is: testing the post-merge composition before anyone
hits the merge button. The system composes all story branches into the
speculative post-merge state and runs the full acceptance suite against
it — ahead of time.

### What needs updating

- methodology-m.md (all references to "shadow")
- Demo slides (especially slide 6: "Shadow integration" → "Ahead-of-time integration")
- Demo runbook (docs/demo-runbook.md)
- CI job names (`shadow:compose` → `aot:compose`, `shadow:integration-test` → `aot:integration-test`, etc.)
- M Power capability docs (wire-orchestration, scaffold-repo)
- Workshop steering
- Root repo CI pipeline on GitLab

### Timing

After the demo. The rename touches too many files to risk before Friday.
Use "ahead-of-time integration" in the slides and narration; leave the
CI job names as `shadow:*` for now and rename in a cleanup pass.


---

## I-023: wire-orchestration must generate fan-out status reporting

**Category:** M Power capability fix (fix-forward)
**Priority:** Critical (core orchestration behaviour)
**Discovered:** 2026-04-06, during demo rehearsal — AOT integration only
reported status to the triggering repo, leaving other story MRs red

### Problem

The `wire-orchestration` capability generated `shadow:report-status` and
`shadow:report-failure` CI jobs that only pushed commit status back to
`$SOURCE_PROJECT_ID` — the repo whose webhook triggered the pipeline.
Other repos with open MRs for the same story never received the status.

This broke the core M promise: when the HEAD component arrives and AOT
integration passes, ALL story MRs should go green simultaneously.

### What was fixed live

1. Created `scripts/report-shadow-status.sh` — iterates all managed repos
   in the topology, finds open MRs matching the story ID, and pushes
   commit status to each one.
2. Updated `shadow:integration` job to export `STORY_ID` via dotenv
   artifact so report-status jobs can access it.
3. Both `shadow:report-status` and `shadow:report-failure` now call the
   shared script with `success` or `failed` argument.

### What needs updating in M Power

The `wire-orchestration` capability doc must:

1. Generate `scripts/report-shadow-status.sh` (or equivalent) as part of
   root repo scaffolding — parameterised with the managed repo list from
   the topology
2. Generate the CI report jobs calling the shared script instead of
   inline single-repo curl
3. Include the dotenv artifact on `shadow:integration` for STORY_ID
4. Document that status fan-out is how the cascade works — it's not
   optional, it's the mechanism that makes AOT integration visible

### Also fix

The `scaffold-repo` capability doc should mention that managed repos
will receive external commit statuses from the root repo's AOT pipeline,
and that `only_allow_merge_if_pipeline_succeeds` gates on these.


---

## I-024: Project template catalogue in the central M config repo

**Category:** Architecture / M Power capability
**Priority:** Important (affects scaffolding and org-level standardisation)
**Discovered:** 2026-04-06, during demo slide preparation

### Problem

When M scaffolds a new repo (`scaffold-repo`), it generates files from
hardcoded patterns in the capability doc. There's no mechanism for
organisations to define their own standard templates — CI configs,
Dockerfiles, test setups, linting configs, etc. Every new repo starts
from the same generic scaffold regardless of the organisation's
engineering standards.

### Proposal

The central M config repo (the root repo or a dedicated config repo)
holds a **project template catalogue** — pre-configured combinations
of plugins, CI configs, Dockerfiles, and scaffolding for common stacks.

When M bootstraps a new managed repo, it:

1. Reads the component's role and type from `project.yaml`
2. Resolves the template from the catalogue (e.g. `node-api`, `react-mfe`,
   `python-service`)
3. Pulls the template and generates the repo from it
4. Applies any project-level overrides from `project.yaml`

### Template structure

```
templates/
  node-api/
    Dockerfile
    .gitlab-ci.yml
    package.json.tmpl
    src/app.js.tmpl
    vitest.config.js
  react-mfe/
    Dockerfile
    .gitlab-ci.yml
    webpack.config.js.tmpl
    cypress.config.js
    package.json.tmpl
  python-api/
    Dockerfile
    .gitlab-ci.yml
    requirements.txt.tmpl
    pytest.ini
```

### Key properties

- **Versioned** — templates are tagged, repos record which template
  version they were generated from
- **Composable** — a template can extend a base template (e.g.
  `node-api-graphql` extends `node-api`)
- **Organisation-specific** — each org maintains their own catalogue
  reflecting their engineering standards
- **Executable standards** — the template catalogue IS the org's
  engineering standards, not a wiki page nobody reads

### Impact

Teams stop reinventing scaffolding. New repos start from a proven
template that embodies the org's standards. The `scaffold-repo`
capability becomes template-aware, and the template catalogue becomes
the plug-and-play mechanism for the plugin architecture (I-009).


---

## I-025: Two-tier config: M Core + Org Config

**Category:** Architecture / distribution model
**Priority:** Critical (adoption enabler)
**Discovered:** 2026-04-06, during post-demo planning

### Problem

M needs to come with batteries included. A user who installs M should
have a working project in minutes with zero configuration. At the same
time, organisations need to customise: their CI platform, their test
frameworks, their project templates, their engineering standards.

Currently the plugin architecture (I-009) and template catalogue (I-017)
describe what's pluggable but not where the configuration lives or how
it's distributed.

### Proposal: two config repos

**M Core Config** — ships with M. The reference defaults.

- GitLab CI templates (reference CI plugin)
- Cypress + vitest + supertest CAT compilation (reference CAT plugins)
- Express stub generation (reference stub plugin)
- Docker Compose deployment templates (reference deployment plugin)
- Standard PAT schema
- Standard project templates (node-api, react-mfe, python-api, etc.)
- Standard orchestration scripts (AOT integration, cascade merge, etc.)

This is what you get out of the box. Install M, bootstrap a project,
everything works. No configuration required.

**Org Config** — optional, per-organisation overlay.

- Override CI templates for GitHub Actions, Bitbucket Pipelines, etc.
- Swap test frameworks (Playwright instead of Cypress, etc.)
- Add organisation-specific project templates
- Point story management at Jira, Linear, etc.
- Custom engineering standards (linting, formatting, security policies)
- Organisation-specific orchestration customisations

If the org config doesn't exist, M Core works fine. If it does, it
takes precedence over M Core for any overlapping configuration.

### Resolution chain

```
Repo-level override → Org Config → M Core Config → built-in fallback
```

This is the same three-tier resolution from I-009, made concrete:

1. **Repo-level** — a managed repo declares its own tooling (highest
   priority, for exceptions)
2. **Org Config** — the organisation's standards (the normal case)
3. **M Core Config** — the reference defaults (batteries included)
4. **Built-in fallback** — hardcoded in M Power capabilities (last
   resort, should rarely be needed)

### What this enables

- "Install M, bootstrap a project, working in 5 minutes" — M Core
  provides everything needed
- "Customise for your org" — create an Org Config, override what you
  need, leave the rest at M Core defaults
- "Evolve independently" — M Core updates don't break Org Config
  overrides. Org Config updates don't require M Core changes.
- Template catalogue lives in Org Config (or M Core if using defaults)
- Plugin catalogue lives in Org Config (or M Core if using defaults)

### Demo talking point

"Everything you just saw? You can have it running on your project by
end of day. M comes with batteries included — install the power, run
the bootstrap, you're up. When you're ready to customise for your
organisation, create your org config and override what you need."

### Open questions

- Where do these repos physically live? GitHub? npm? A Kiro Power
  bundle that includes M Core Config?
- How does the M Power resolve the Org Config location? Environment
  variable? `.kiro/m-config.yaml`? Convention-based discovery?
- Versioning strategy: M Core Config versions independently from the
  M Power. Org Config versions independently from both. How do we
  handle compatibility?


---

## I-026: Installation and onboarding flows — greenfield vs existing M org

**Category:** Adoption / user experience
**Priority:** Critical (first-contact experience)
**Discovered:** 2026-04-06, during post-demo planning

### Problem

The experience of adopting M differs fundamentally depending on whether
the organisation has used M before. We need two distinct onboarding
flows, both frictionless.

### Flow 1: Greenfield — first M project in the org

The org has never used M. No Org Config exists. Everything is new.

**Steps (conceptual):**

1. Install M Power (Kiro power, npm package, or however we distribute)
2. M detects: no Org Config found
3. Offers two paths:
   - **Quick start** — use M Core defaults, skip org setup, go straight
     to project bootstrap. Good for evaluation, demos, small teams.
   - **Org setup first** — create Org Config repo, choose plugins,
     set up template catalogue, configure story management integration.
     Good for enterprise adoption.
4. Either way, the next step is project bootstrap:
   - "Create an M-type project called X with components Y, Z..."
   - M scaffolds everything from M Core (or Org Config if set up)
   - Story Zero is generated and ready to execute
5. First project is running. The org now has M.

**Key principle:** Quick start must work with ZERO configuration. The
user answers project questions (name, components, topology) and gets
a working project. Plugin choices default to M Core. Org Config can
be created later and retroactively applied.

### Flow 2: Existing M org — adding another project

The org already has M. Org Config exists. Templates are defined.
At least one M-type project is running.

**Steps (conceptual):**

1. Install M Power (if not already installed — may be org-standard)
2. M detects: Org Config found at [configured location]
3. Loads org templates, plugins, standards
4. Project bootstrap:
   - "Create an M-type project called X with components Y, Z..."
   - M scaffolds from Org Config templates (falling back to M Core)
   - Org CI templates, org linting rules, org Docker base images —
     all applied automatically
   - Story Zero generated with org-standard patterns
5. New project is running, consistent with existing M projects

**Key difference:** In Flow 2, the new project inherits the org's
engineering standards automatically. No manual configuration. No
"copy the CI config from the other project." The Org Config IS the
standard, and every new project gets it by default.

### What this means for the M Power

The M Power bootstrap capability needs to:

1. Detect whether an Org Config exists (convention or explicit config)
2. If yes: load it, merge with M Core, present org templates
3. If no: offer quick start vs org setup
4. In both cases: ask project-level questions, scaffold, generate
   Story Zero
5. Record which config versions were used (for reproducibility)

### Onboarding beyond the first project

Once an org has M, onboarding a new team to an existing project is
different again:

- Developer installs M Power
- Opens the project repo
- M Power reads project.yaml, detects M-type project
- Steering files guide the developer through the M workflow
- Ecosystem Briefing agent shows current project state
- Developer picks up a sub-task and starts implementing

No bootstrap needed. The project already exists. The developer just
needs the power installed and the repo cloned.

### Open questions

- How does M Power discover the Org Config? Git URL in a global
  config file? Environment variable? Kiro workspace setting?
- Can Org Config be private (enterprise) while M Core is public?
- Should there be an `m init-org` command separate from `m init-project`?
- How do we handle M Core version upgrades across existing projects?
  (e.g. new AOT integration features — do existing projects get them
  automatically or opt in?)


---

## I-027: Technical mechanics of installing M and bootstrapping into a project

**Category:** Distribution / installation mechanics
**Priority:** Critical (the "how do I actually get this" question)
**Discovered:** 2026-04-06, during post-demo planning

### Problem

"Install M" is hand-wavy. What does the user actually do? What gets
installed where? What's the artifact? What's the runtime? We need
concrete answers.

### The layers that need installing

1. **M Power** — the Kiro Power that provides the AI capabilities
   (decomposition, PAT generation, CAT compilation, scaffolding).
   This is the thinking layer.

2. **M Core Config** — the reference defaults (CI templates, project
   templates, orchestration scripts, PAT schema). This is the
   batteries-included layer.

3. **M CLI / bootstrap tooling** — whatever runs the scaffolding.
   Could be the M Power itself (via Kiro chat), a standalone CLI
   (`npx create-m-project`), or both.

4. **Org Config** — optional, per-organisation. Not "installed" —
   created by the org and pointed to.

### Option A: Pure Kiro Power

Everything lives in the M Power. User installs it via Kiro's power
management. M Core Config is bundled inside the power (or fetched
on first use).

```
Kiro → Install M Power → "Create an M-type project..."
  → Power reads M Core Config (bundled)
  → Power reads Org Config (if configured)
  → Power scaffolds repos, CI, Story Zero
```

Pros: single install point, integrated with Kiro, AI-native.
Cons: requires Kiro, can't bootstrap from a plain terminal.

### Option B: CLI + Power

A standalone CLI for bootstrapping, plus the Kiro Power for ongoing
development. The CLI handles the mechanical scaffolding; the Power
handles the AI-assisted phases.

```
npx create-m-project → scaffolds repos, CI, Story Zero
  → CLI reads M Core Config (npm package or git repo)
  → CLI reads Org Config (if configured)
  → Repos created with .kiro/ folder, steering, hooks
  → Developer opens in Kiro → M Power activates automatically
```

Pros: works without Kiro for bootstrapping, familiar npm pattern.
Cons: two things to maintain, potential version drift.

### Option C: Hybrid — Power with CLI escape hatch

The M Power is the primary interface. But it can also export a CLI
command for environments where Kiro isn't available (CI, scripts,
automation).

```
Primary: Kiro + M Power (interactive, AI-assisted)
Escape:  npx m-power scaffold (headless, deterministic)
```

### What "bootstrapping M into a project" means concretely

Regardless of the installation mechanism, bootstrapping produces:

**For a new project (greenfield):**
- Root repo on VCS (GitLab/GitHub) with:
  - project.yaml (topology manifest)
  - packages/shell/ (embedded shell stub)
  - .kiro/ (steering, hooks, agents)
  - scripts/ (orchestration: AOT, cascade, integration tests)
  - .gitlab-ci.yml (or equivalent for chosen CI)
  - pats/ (empty, ready for Story Zero PATs)
  - stories/ (empty, ready for readiness trackers)
- Managed repos on VCS (one per referenced component) with:
  - Scaffolded from project template (M Core or Org)
  - .kiro/ (steering for managed repo workflow)
  - .gitlab-ci.yml (lifecycle pipeline)
  - pats/ (empty, ready for repo-level PATs)
- Webhooks wired between managed repos and root
- Branch protection configured
- Pipeline-must-succeed enabled
- Story Zero generated and ready to execute

**For an existing project (adopting M):**
- Root repo wrapper created around existing repos
- project.yaml generated from existing topology
- Existing repos get .kiro/ folders, steering, hooks
- Webhooks wired
- Orchestration scripts added to root
- Story Zero adapted to validate existing infrastructure
- Existing tests mapped to PAT structure where possible

### What needs designing

- The M Core Config format and distribution (npm package? git repo?
  embedded in the power?)
- The Org Config discovery mechanism
- The bootstrap questionnaire (what questions, what order, what
  defaults)
- The "adopt M into existing project" flow (harder than greenfield)
- Version management: how does a project track which M version it
  was bootstrapped from, and how does it upgrade?



---

## I-028: Repo reorganisation — separate distributable M from workshop artefacts

**Category:** Repository structure / distribution
**Priority:** Important (prerequisite for versioning and CLI)
**Discovered:** 2026-04-07, during distribution model discussion

### Problem

The methodology-m repo mixes two concerns:

1. **Distributable M** — the methodology document, M Power capabilities,
   generic steering files, and (future) CLI. These are what consumers
   of M need.
2. **Workshop artefacts** — demo scripts, slides prompts, Jira
   emulation, patches, rewind scripts, ref-project clones, workshop
   steering. These exist to showcase M, not to be distributed.

Currently these are interleaved: workshop docs in `docs/`, workshop
scripts in `scripts/`, workshop steering in `.kiro/steering/`, and
ref-projects at the repo root. This makes it unclear what ships as
"M" and what's just the demo.

### Proposed structure

```
methodology-m/
├── methodology-m.md              ← core document (root)
├── README.md
├── LICENSE
├── package.json                  ← for CLI (@methodology-m/cli)
├── CHANGELOG.md                  ← human changelog
├── CHANGELOG-AI.md               ← AI-targeted migration changelog
│
├── powers/                       ← distributable M Power
│   └── m-power/
│       ├── POWER.md
│       ├── power.json
│       └── capabilities/*.md
│
├── steering/                     ← M-generic steering (distributable)
│   └── (steering that applies to all M consumers)
│
├── cli/                          ← CLI source
│   └── (init, update, diff commands)
│
├── docs/                         ← methodology-level docs only
│   ├── methodology.md
│   ├── project-yaml-design.md
│   └── improvements-and-ideas.md
│
├── workshop/                     ← everything workshop-specific
│   ├── README.md
│   ├── workshop-script.md
│   ├── docs/
│   │   ├── demo-day-plan.md
│   │   ├── demo-high-level.md
│   │   ├── demo-runbook.md
│   │   ├── slides-prompt.md
│   │   ├── design-notes.md
│   │   ├── presentation-ideas.md
│   │   └── incident-todo-mfe-hello-testid.md
│   ├── jira/
│   ├── workspace/
│   ├── patches/
│   ├── scripts/
│   │   ├── demo-rewind.sh
│   │   ├── m-checkpoint.sh
│   │   └── m-rewind.sh
│   ├── ref-projects/
│   │   └── todo-m-workshop/
│   └── steering/
│       └── workshop.md
│
└── .kiro/
    ├── steering/
    │   ├── hemingway-bridge.md   ← personal workflow (stays)
    │   └── powers-first.md       ← personal workflow (stays)
    └── powers/
        └── m-power -> ../../powers/m-power  (symlink)
```

### Key moves

- `powers/m-power/` at repo root becomes the canonical location;
  `.kiro/powers/m-power` becomes a symlink so Kiro still finds it
- `workshop-script.md` moves from root into `workshop/`
- `scripts/` at root (m-checkpoint.sh, m-rewind.sh) moves to
  `workshop/scripts/` — these are workshop-specific
- `ref-projects/` moves into `workshop/` — clones only exist for
  the workshop
- `.kiro/steering/workshop.md` moves to `workshop/steering/` — it's
  workshop context, not M-generic
- `docs/` at root keeps only methodology-level docs; workshop docs
  move to `workshop/docs/`
- Personal steering files (hemingway-bridge.md, powers-first.md)
  stay in `.kiro/steering/` — they're workflow conventions, not M

### Dependencies

- I-029 (versioning and CLI)
- Should be done before first version tag so v1.0.0 has the clean
  structure

---

## I-029: Version M as an npm package with AI-targeted changelog and CLI

**Category:** Distribution / versioning
**Priority:** Important (enables cross-project synchronisation)
**Status:** ✅ Partially resolved (2026-04-11) — CLI built with init/clone/update/diff/version/changelog commands, npm package structure ready, JSON schemas added. Remaining: npm publish, AI-targeted changelog format (CHANGELOG-AI.md), repo reorganisation (I-028).
**Discovered:** 2026-04-07, during distribution model discussion

### Problem

Methodology M has no version number, no changelog, and no distribution
mechanism. When M is adopted by another project (e.g. Outpost), there's
no way to track which version of M that project is using, what changed
between versions, or how to update.

### Proposal

Version M as an npm package (`@methodology-m/cli`) with semver and an
AI-targeted changelog. The package distributes:

- The M Power (capabilities, POWER.md)
- M-generic steering files
- The methodology document
- A CLI for installation and updates

### The CLI

```
npx @methodology-m/cli init       # scaffolds .kiro/powers, steering
npx @methodology-m/cli update     # pulls latest M files, shows diff
npx @methodology-m/cli diff       # shows what changed since installed version
npx @methodology-m/cli changelog  # shows AI-targeted changelog
```

The CLI manages the "Kiro face" of M in the consuming project — it
writes/updates files under `.kiro/` (powers, steering) and leaves the
project's own files untouched.

### The Janus model (dual-face projects)

Consuming projects like Outpost have two faces:

1. **Native face** — the project's own steering files, conventions,
   and agent configuration (e.g. Outpost's `steering/commander.md`,
   `steering/implementer.md`). This is what agents read day-to-day.

2. **M face** — the canonical M files installed by the CLI into
   `.kiro/`. Present in the repo as a reference, not directly consumed
   by the project's agents.

The update flow:

1. M bumps to v1.1.0
2. In consuming project: `npx @methodology-m/cli update`
3. CLI pulls new M files into `.kiro/` — clean overwrite (reference)
4. `git diff` shows what changed in the M face
5. Ask the AI: "M was updated to 1.1.0. Migrate relevant changes
   into our steering files."
6. AI reads both faces, proposes edits to the native face
7. Review, commit

### AI-targeted changelog format

```
## [1.1.0] - 2026-04-15

### For AI agents updating from 1.0.x

STEERING CHANGED: m-managed-repo.md
- PAT validation loop now requires browser verification for frontend
  components before declaring implementation complete
- Action: find your managed repo steering equivalent and add explicit
  PAT validation step to the development workflow

CAPABILITY ADDED: generate-integration-tests.md
- New capability for generating story-level integration test scripts
- Action: no migration needed, new capability only

METHODOLOGY CHANGED: methodology-m.md Section 4
- "Shadow integration" renamed to "ahead-of-time integration" (AOT)
- Action: find-and-replace "shadow integration" with "ahead-of-time
  integration" in all steering files and documentation
```

Structured enough for an AI to parse and act on. Human-readable
enough to review. Each entry has a clear action statement.

### What ships in the npm package

```
@methodology-m/cli
├── cli/                    ← CLI commands (init, update, diff)
├── dist/
│   ├── methodology-m.md    ← core document
│   ├── powers/
│   │   └── m-power/        ← capabilities, POWER.md
│   └── steering/           ← M-generic steering files
├── CHANGELOG.md            ← human changelog
├── CHANGELOG-AI.md         ← AI-targeted changelog
└── package.json
```

### Dependencies

- I-028 (repo reorganisation — clean separation of distributable vs
  workshop before packaging)
- Needs the M Power capabilities to be stable enough for a v1.0.0 tag

### Open questions

- Should the CLI also handle Org Config (I-018) or is that separate?
- npm scope: `@methodology-m/cli` or just `methodology-m`?
- Should consuming projects pin to exact versions or use ranges?


---

## I-030: Standalone and follow-up MRs — non-story and multi-MR-per-story support

**Category:** Orchestration / methodology
**Priority:** Important (affects real-world usage)
**Discovered:** 2026-04-07, during demo rehearsal

### Problem

M currently assumes every MR on a managed repo is part of a story (branch
name contains a story ID like `TODOM-001`). Every MR triggers AOT
integration, fan-out, and cascade merge. There's no support for:

1. **Standalone MRs** — refactors, dependency updates, bug fixes that
   aren't tied to any story. A developer should be able to raise a
   normal MR that goes through repo-level CI only, with no AOT trigger,
   no fan-out, no cascade.

2. **Follow-up MRs under the same story** — a developer finishes their
   sub-task, MR is merged via cascade, then wants to raise a follow-up
   MR (polish, tech debt, additional tests) under the same story ID.
   The current model treats this as a new story MR and triggers the
   full AOT cycle again, which may not be appropriate.

### Requirements

- MRs with no story ID in the branch name should skip AOT entirely.
  The webhook fires (it's on all MR events), but the root repo pipeline
  should detect "no story branch" and exit cleanly.
- MRs with a story ID that has already been merged (story complete)
  should either be treated as standalone or trigger a lighter validation.
- The developer should be able to choose: "this is a story MR" vs
  "this is a standalone MR" — possibly via branch naming convention
  (e.g. `feat/TODOM-001-*` = story, `fix/*` or `chore/*` = standalone).
- Follow-up MRs under a completed story should not block other repos
  or trigger cascade merge — they're independent changes that happen
  to reference the same story for traceability.

### Design considerations

- The detect-trigger script already extracts story ID from branch name.
  If no story ID found, it could set `TRIGGER_EVENT=standalone` and
  skip all AOT/cascade jobs.
- For follow-up MRs: check if the story's readiness tracker shows
  "complete" — if so, treat as standalone with traceability.
- The cascade merge script needs to understand that not all story MRs
  are part of the same merge transaction — only the first set (before
  story completion) are atomic.

### Dependencies

- detect-trigger.sh needs a "no story" path
- wire-orchestration capability doc needs updating
- Methodology paper should document the standalone MR concept


---

## I-031: Race condition — stale green status allows merge during story integrity change

**Category:** Orchestration / implementation detail
**Priority:** Nice to have (theoretical in small teams, real in large ones)
**Status:** ✅ Resolved (2026-04-07) — instant status invalidation pushes pending to all story MRs before AOT runs
**Discovered:** 2026-04-07, during demo rehearsal

### Problem

When a story MR is closed (or a constituent disappears), AOT re-runs and
pushes failure status to remaining MRs. But there's a window (~2 minutes)
between the close event and the new failure status arriving. During that
window, the remaining MRs still have a stale green `shadow-integration`
commit status and could theoretically be merged.

GitLab commit statuses are point-in-time snapshots, not live gates. The
platform doesn't know the status is stale.

### Options considered

1. **Cascade merge only** — never merge individual MRs. The cascade
   script checks integrity at merge time. But GitLab can't enforce
   "only merge via cascade" at the platform level.

2. **Pre-merge webhook** — not available on GitLab free tier.

3. **Merge via API only** — set `merge_access_level: 0` (no human can
   merge). Only the cascade merge script, running with a project access
   token, can merge MRs. Humans approve but don't click merge. This is
   watertight but changes the branch protection model significantly.

### Recommendation

Option 3 is the correct long-term answer for production M deployments.
For the reference implementation and demo, the race window is acceptable
(single presenter, cascade merge is the intended flow).

### Dependencies

- Branch protection model (scaffold-repo capability)
- Cascade merge script (needs to be the sole merge actor)
- Project access tokens (Premium+ for per-repo tokens, or group PAT)


---

## I-032: Pipeline failure webhook — immediate invalidation when repo tests fail

**Category:** Orchestration / water-tightness
**Priority:** Nice to have (closes timing gap)
**Status:** ✅ Resolved (2026-04-11) — pipeline_events added to webhooks, detect-trigger handles pipeline_failure, fan-out to all story MRs
**Discovered:** 2026-04-07, during demo rehearsal

### Problem

When a managed repo's pipeline fails (e.g. MFE Cypress tests break),
the other story MRs keep their stale green `shadow-integration` status
until the next AOT trigger. AOT only triggers on MR events (open, close,
update), not on pipeline status changes.

The aggregated check (I-031 resolution) handles this when AOT does run —
it downgrades on explicit pipeline failure. But there's a window between
"MFE pipeline fails" and "next AOT trigger" where API MRs look green.

### Proposal

Add `pipeline_events: true` to managed repo webhooks. When a pipeline
fails, the webhook fires, root repo triggers, invalidation runs (all
MRs go pending), then AOT re-evaluates.

### What needs changing

- Webhook config on managed repos (add pipeline_events)
- detect-trigger.sh needs to handle pipeline events (currently only MR events)
- wire-orchestration capability doc needs updating
- Need to filter: only trigger on pipeline failure, not on every pipeline event
  (otherwise every successful pipeline triggers unnecessary AOT runs)

### Dependencies

- wire-orchestration capability doc
- scaffold-repo webhook setup


---

## I-033: ~90s invalidation window on MR close — inherent GitLab.com Free tier limitation

**Category:** Orchestration / water-tightness
**Priority:** Accepted limitation (documented)
**Discovered:** 2026-04-08, during close-MR test of story integrity gate

### Problem

When a story MR is closed, the remaining sibling MRs retain their stale
green `shadow-integration` commit status for ~90 seconds while the root
pipeline's invalidation chain runs (webhook → detect-trigger ~40s →
invalidate-status ~45s). During this window, a sibling MR is technically
mergeable.

### Why it can't be closed on GitLab.com Free/Premium

Three mechanisms were investigated:

1. **External status checks** — GitLab Ultimate only. These start in
   `pending` by default and block merge until explicitly passed. Would
   eliminate the window entirely, but requires Ultimate tier.

2. **Server-side pre-receive hooks** — Self-managed GitLab only. Could
   reject the merge commit push by calling the root API to check story
   integrity. Not available on GitLab.com SaaS.

3. **Pessimistic invalidation (push pending on every commit)** — each
   managed repo's CI pushes `pending` for `shadow-integration` as its
   first job. Eliminates stale green for the push-new-code case, but
   does NOT help with the close-MR case (no new commit is pushed to
   sibling branches when a different MR is closed).

The ~90s is the irreducible latency of webhook delivery + shared runner
allocation + script execution. No architectural change on Free tier can
eliminate it.

### Risk assessment

Low. For this window to be exploited:

- All story MRs must have been green (story was proven working moments ago)
- Someone must click merge on a sibling MR within ~90s of the close event
- The close event itself is the anomaly — the code was valid

If a merge does slip through, the damage is limited: the merged code was
integration-tested and green. The story is incomplete (missing component),
but the merged code itself is sound. Worst case: revert one merge.

### Mitigations in place

- `shadow:invalidate-status` pushes `pending` to all story MRs as the
  first orchestration job after detect-trigger (sequenced before integration)
- `shadow:integration` integrity gate catches the missing MR and fails
- `shadow:report-failure` fans out `failed` to all remaining story MRs
- Cascade merge checks story completeness before merging siblings

### Resolution path

If the window becomes unacceptable:
- Upgrade to GitLab Ultimate and use external status checks
- Or deploy self-managed GitLab with a pre-receive hook
- Or accept the ~90s window as a known limitation (current choice)


---

## I-034: MR reopen events don't trigger root AOT pipeline

**Category:** Orchestration / webhook gap
**Priority:** Nice to have
**Discovered:** 2026-04-08, during close/reopen test cycle

### Problem

Reopening a managed repo MR does not fire the webhook that triggers the
root AOT pipeline. The `merge_requests_events` webhook fires on open,
update, merge, and close — but GitLab either doesn't fire on reopen, or
the trigger token setup doesn't match the reopen event payload.

This means after a close→reopen cycle, the MR sits with stale commit
statuses (whatever the last AOT run pushed). A manual retrigger (push a
no-op commit) is needed to kick off a fresh AOT evaluation.

### Impact

Low in normal workflow — MRs are rarely closed and reopened. But it's a
gap during testing and demo rehearsals where close/reopen is used to
exercise the integrity gate.

### Proposal

Investigate whether:
1. GitLab fires `merge_requests_events` on reopen (check webhook logs)
2. The root repo's trigger token setup filters out reopen actions
3. `detect-trigger-event.sh` handles the reopen payload correctly

If GitLab does fire the webhook but the trigger setup drops it, fix the
trigger configuration. If GitLab doesn't fire on reopen, document it as
a platform limitation and keep the retrigger-commit workaround.

---

## I-035: MR close fires duplicate root pipelines + detect-trigger treats close as open/update

**Category:** Orchestration / webhook behaviour
**Priority:** Nice to have (not a demo blocker)
**Discovered:** 2026-04-10, closing MFE MR !7 triggered two identical root pipelines

### Problem

Two issues observed when closing the MFE MR:

1. **Duplicate pipelines:** Closing one MR on the MFE repo triggered two
   separate root repo pipelines (both from source project 79995516, both
   seeing `MR state: closed`). The MFE has a single webhook with
   `merge_requests_events: true`. GitLab appears to fire the webhook
   twice for a single close action — possibly once for the close event
   and once for a subsequent state update.

2. **Close treated as open/update:** `detect-trigger-event.sh` sees
   `MR state: closed` but routes it to the AOT integration path
   (`→ This is an OPEN/UPDATE event`). A closed MR should be a no-op
   or trigger status invalidation only — not a full shadow integration
   run. The detect script doesn't distinguish close from open/update.

### Impact

Wastes CI minutes (two redundant shadow runs that both fail with
"story incomplete"). Not a demo blocker since the demo doesn't involve
closing MRs. But noisy during rehearsals and testing.

### Proposal

1. **detect-trigger-event.sh** — check the MR state from the API
   response. If `state == closed` or `state == merged`, skip the AOT
   integration path. Either exit early or route to a lightweight
   invalidation-only path.

2. **Duplicate webhook fires** — investigate GitLab webhook logs to
   confirm whether this is a platform behaviour (two events per close)
   or a configuration issue. If it's platform behaviour, the detect
   script fix in (1) makes the duplicates harmless since both would
   exit early.

### Dependencies

- Related to I-034 (MR reopen events) — both are about webhook event
  handling edge cases in `detect-trigger-event.sh`

---

## I-036: project.yaml is declaration-only — runtime artefacts don't read it

**Category:** Architecture / topology manifest
**Priority:** Important (conceptual integrity)
**Discovered:** 2026-04-10, auditing `tag` and `role` field usage

### Problem

`project.yaml` declares the topology: component names, roles, ports, tags,
locations, compose strategy. But no runtime artefact reads it. Every script,
CI pipeline, and docker-compose file that needs these values has them
hardcoded as literal strings.

Concrete examples:

| Value | Declared in project.yaml | Hardcoded in |
|-------|--------------------------|--------------|
| Ports (3000–3003) | `port:` per component | docker-compose.yml, integration-test.sh, CI health checks |
| Repo names | `location:` per component | integration-test.sh (`MANAGED_REPOS`), CI clone commands |
| Repo paths | `location:` per component | CI `git clone` URLs |
| Health endpoints | Derived from role + port | CI health check loops, compose health config |
| Build contexts | Derived from location | docker-compose.yml `context:` |

The `tag` field (topology version pin) is declared but never consumed —
the merge transaction / auto-bump flow (I-004) that would read it doesn't
exist yet.

The `role` field is consumed by M Power capabilities at generation time
(scaffold-repo uses it to decide backend vs frontend templates) but is
never read at runtime by any script or pipeline.

### Impact

- **project.yaml is documentation, not configuration.** Changing a port
  or adding a component in project.yaml has no effect unless you also
  manually update docker-compose.yml, integration-test.sh, the CI
  pipeline, and health check endpoints. The manifest and the reality
  can drift silently.

- **Violates single source of truth.** The methodology says project.yaml
  is the topology manifest. But the actual topology is defined by the
  sum of hardcoded values across multiple files. project.yaml is a
  parallel declaration that nothing enforces.

- **Blocks auto-bump.** The merge transaction needs to read `tag` from
  project.yaml, update it, and commit. If nothing else reads tags,
  the bump is cosmetic — it updates a field nobody consults.

### Proposal

Two paths, not mutually exclusive:

**Path A: Generate from project.yaml (build-time)**

M Power capabilities that produce runtime artefacts (docker-compose.yml,
CI pipeline, integration-test.sh, health check config) should derive
values from project.yaml rather than hardcoding them. When the topology
changes, re-running the capability regenerates the artefacts. This is
the current model — just applied more consistently.

**Path B: Read project.yaml at runtime**

Scripts read project.yaml directly (parse YAML, extract ports/names/paths).
This makes project.yaml the live configuration. Requires a YAML parser
available in CI (e.g. `yq`, or a small Node script). More dynamic but
adds a runtime dependency.

**Path A is simpler and aligns with how M already works** — powers
generate artefacts from the manifest. The gap is that some artefacts
(docker-compose, integration tests) were hand-written in pass1 instead
of generated. Path B is more robust but heavier.

### What needs to change

Whichever path is chosen:

1. `docker-compose.yml` — ports, build contexts, service names derived
   from project.yaml components
2. `integration-test.sh` — `MANAGED_REPOS` list, ports, health endpoints
   derived from project.yaml
3. `.gitlab-ci.yml` — clone URLs, health check endpoints derived from
   project.yaml
4. `wire-orchestration` capability — should generate these artefacts
   from project.yaml, not hardcode them
5. `tag` field — needs a consumer (merge transaction auto-bump, or
   compose cloning at a specific tag for production builds)

### Dependencies

- I-004 (merge transaction / auto-tag / auto-bump — needs `tag` to be meaningful)
- I-009 (plugin abstraction — compose strategy is a plugin, but it still
  needs topology input from somewhere)
- I-018 (compose strategy as plugin boundary — the plugin reads project.yaml)

---

## I-037: AC-to-PAT mapping should be 1:many, not 1:1

**Category:** M Power capability / PAT schema
**Priority:** Important (affects PAT expressiveness)
**Discovered:** 2026-04-10, reviewing generate-pats capability

### Problem

The `generate-pats` capability says "Transform each acceptance criterion
into a PAT entry" — implying a strict 1:1 mapping between ACs and PATs.
The schema reinforces this with `AC-001`, `AC-002` etc., one per story AC.

This works for coarse ACs like Story Zero ("shell renders", "MFE loads")
but breaks down for feature stories where a single AC covers multiple
distinct behaviours. For example:

**AC:** "User can add a todo"

This single criterion implies multiple testable behaviours:
- Happy path: type text, click add, item appears in list
- Validation: empty input, button disabled
- Edge case: whitespace-only input rejected
- Round-trip: added item persists after page refresh

Forcing these into one PAT entry either makes the `when`/`then` vague
("adding todos works correctly") or crams unrelated assertions into a
single steps list, making the PAT hard to read and the compiled CAT
hard to debug when one assertion fails.

### Proposal

Allow 1:many AC-to-PAT mapping. One acceptance criterion can yield
multiple PAT entries, each with a focused `when`/`then` and steps.

**ID scheme:** Use sub-IDs to preserve traceability:
```
- id: AC-003a
  when: user types a title and clicks Add
  then: new todo appears in the list
  steps: ...

- id: AC-003b
  when: user clicks Add with empty input
  then: nothing happens, button is disabled
  steps: ...

- id: AC-003c
  when: user adds a todo and refreshes the page
  then: the todo persists in the list
  steps: ...
```

The `a`, `b`, `c` suffixes tie back to the parent AC (AC-003) while
giving each behaviour its own identity for decomposition, CAT
compilation, and failure reporting.

### What needs to change

1. **`generate-pats` capability doc** — change "Transform each AC into
   a PAT entry" to "Transform each AC into one or more PAT entries."
   Add guidance on when to split: distinct user actions, distinct
   failure modes, distinct pre-conditions.
2. **PAT.yaml schema** — document the sub-ID convention (`AC-NNNx`).
3. **`decompose-story`** — the PAT-to-component mapping must handle
   sub-IDs (all sub-PATs of one AC typically map to the same component,
   but not necessarily).
4. **`generate-acceptance-tests`** — each sub-PAT becomes its own
   `it()` block in the compiled CAT, not a mega-test.

### Impact

More granular PATs mean more precise fitness functions for AI agents.
An agent implementing "add todo" gets three distinct targets to converge
on, not one vague one. Failure reporting is also clearer — "AC-003b
failed" tells you the validation path is broken, not just "adding
todos is broken."


---

## I-038: Sub-task PATs in YAML format — repo-scoped validation during implementation

**Category:** Methodology / M Power capability
**Priority:** High (closes the inner validation loop)
**Discovered:** 2026-04-10, pre-demo review of sub-task structure

### Problem

Sub-tasks currently contain PAT *stubs* — pseudocode `describe`/`it`
blocks with comments. These are not executable. During sub-task
implementation, Kiro has no runnable contract to validate against.

The story-level PAT (`TODOM-001.pat.yaml`) is the real contract, but
it's cross-component and includes integration assertions that can't be
verified in isolation (e.g. AC-005: "shell loads MFE, MFE communicates
with both APIs"). Kiro implementing a single repo can't validate the
full story PAT.

This leaves a gap: the methodology's core promise is a self-validating
approximation loop (implement → check against PAT → iterate), but at
the sub-task level there's nothing concrete to check against. Kiro is
effectively implementing on vibes and manual inspection.

### Proposal

Each sub-task gets its own `.pat.yaml` in the same format as the story
PAT, scoped to what's verifiable in isolation for that repo.

**Example:** `TODOM-001c.pat.yaml` for the MFE sub-task:

```
sub-task: TODOM-001c
parent-story: TODOM-001
component: todo-m-mfe
version: 1

acceptance:
  - id: AC-001
    when: Component renders with mock todo data
    then: Todo list displays items with count
    steps:
      - render: Todo component with mocked API
      - assert: "[data-testid='todo-list']" is visible
      - assert: "[data-testid='todo-item']" count > 0
      - assert: "[data-testid='todo-count']" is visible

  - id: AC-002
    when: Component renders with empty mock data
    then: Empty state is displayed with add form
    steps:
      - render: Todo component with empty mock API
      - assert: "[data-testid='todo-empty-state']" is visible
      - assert: "[data-testid='todo-input']" is visible

  - id: AC-004
    when: Input field is empty
    then: Add button is disabled
    steps:
      - render: Todo component
      - assert: "[data-testid='todo-add-button']" is disabled
```

Note: AC-005 (full system composition) is absent — it's a story-level
concern, not verifiable at the MFE repo level.

### Derivation

Sub-task PATs are mechanically derivable from the story PAT:

1. Filter story PAT ACs to those mapped to this sub-task's component
2. Replace system-level preconditions with repo-scoped equivalents
   (e.g. "navigate to /" becomes "render component with mocked API")
3. Drop ACs that require cross-component integration
4. Output in identical YAML schema with `sub-task` and `component` fields

The `decompose-story` power already knows which ACs map to which
component. Generating sub-task PATs is a natural extension.

### What changes

1. **`decompose-story` capability** — after generating sub-task markdown
   files, also generate `<sub-task-id>.pat.yaml` for each sub-task
2. **Sub-task markdown template** — remove PAT stubs section, replace
   with `PATs: see <sub-task-id>.pat.yaml` and list of AC IDs
3. **Implementation steering** — Kiro reads the sub-task `.pat.yaml`
   during implementation and validates against it (same loop as story
   PAT, just repo-scoped)
4. **PAT YAML schema** — document the `sub-task`, `parent-story`, and
   `component` fields as optional extensions for sub-task PATs

### Impact

- Closes the inner validation loop: Kiro has a runnable contract at
  every level (sub-task and story)
- Single format across both levels — no new concepts
- PAT stubs in markdown become unnecessary — less drift, single source
  of truth
- Sub-task PATs can seed repo-level CATs directly (same schema, just
  compile to test framework)
- The methodology's self-validating promise holds at every granularity


---

## I-039: Decomposition auto-establishes the AOT gate — compile story CATs and raise root MR

**Category:** Methodology / M Power capability (critical)
**Priority:** Critical (without this, AOT integration is structurally permissive)
**Status:** ✅ Resolved (2026-04-11) — decompose-story Step 4 added: auto-compile story PAT → Cypress spec, create branch, raise root MR
**Discovered:** 2026-04-10, investigating why all MRs went green despite incomplete story

### Problem

The current `decompose-story` capability generates sub-task files
including a mandatory root repo sub-task (TODOM-001d style). But the
root sub-task is just a markdown file describing what should be built.
A human (or Kiro) must then manually:

1. Compile the story PAT into a Cypress CAT
2. Commit it to a root repo branch
3. Raise an MR
4. Ensure `integration-test.sh` checks for the root MR

In practice, this step gets deferred or forgotten. When it does, the
AOT (shadow) integration gate runs without real story-level tests.
The gate passes on structural checks alone (are MRs present? do APIs
respond?) — not on actual acceptance criteria validation.

This was observed live: TODOM-001 had all three managed repo MRs open,
shadow integration ran, all tests passed, and every MR became
mergeable. But the integration tests were curl-based health checks,
not the Cypress CATs that would validate the story PAT. The gate was
green but meaningless.

The root cause: TODOM-001d (root sub-task) was never implemented.
Nobody compiled the story PAT into a Cypress spec. The methodology
prescribed it, but nothing enforced it.

### Proposal

`decompose-story` should automatically establish the AOT gate as a
side effect of decomposition. After generating sub-task files:

1. **Compile story PAT → Cypress CAT** — mechanical transformation
   from the PAT yaml into a runnable Cypress spec. The PAT steps
   map directly to Cypress commands:
   - `navigate: /` → `cy.visit('/')`
   - `wait: "[data-testid='X']" is visible` → `cy.get('[data-testid="X"]').should('be.visible')`
   - `assert: "[data-testid='X']" contains "Y"` → `cy.get('[data-testid="X"]').should('contain', 'Y')`
   - `click: "[data-testid='X']"` → `cy.get('[data-testid="X"]').click()`
   - `type: "[data-testid='X']" value "Y"` → `cy.get('[data-testid="X"]').type('Y')`

2. **Commit to root repo branch** — create a feature branch
   (e.g. `feat/<story-id>-integration-gate`), commit the Cypress
   spec to `pats/<story-id>.cy.js`

3. **Raise root MR** — automatically create the MR on the root repo.
   This MR is the gate. It exists from the moment the story is
   decomposed.

4. **Update `integration-test.sh`** — add the root repo to
   `MANAGED_REPOS` so the structural integrity check includes it
   (one-time fix, see related issue below)

### Outcome

By the time a dev starts implementing the first managed repo sub-task,
the gate is already live and failing:

- Root MR exists with the Cypress CAT
- Shadow integration runs the CAT against the composed system
- Tests fail (nothing implemented yet) → all MRs blocked
- As components land, tests progressively pass
- All green → story is genuinely complete → merge transaction

The root sub-task can never be "forgotten" because it's not a manual
step anymore. It's a side effect of decomposition.

### What changes

1. **`decompose-story` capability** — add steps after sub-task file
   generation:
   - Compile story PAT into Cypress spec
   - Create branch on root repo (via GitLab API)
   - Commit Cypress spec + any compose config changes
   - Raise MR on root repo
   - Update readiness tracker with root sub-task

2. **`generate-acceptance-tests` capability** — may be reused or
   inlined. The PAT→Cypress compilation logic should be shared
   between story-level CAT generation and repo-level CAT generation.

3. **`integration-test.sh`** — add root repo to `MANAGED_REPOS`
   so structural integrity includes the root MR. This is a one-time
   fix to the existing script.

4. **Root sub-task markdown** — still generated for documentation,
   but its primary deliverable (the Cypress CAT) is already committed.
   The sub-task file becomes a record of what was auto-generated,
   not a todo for a human.

### Related issues

- **I-038** (sub-task PATs in YAML format) — complements this by
  closing the inner validation loop. I-039 closes the outer loop.
- **Integration test script gap** — `MANAGED_REPOS` doesn't include
  `todo-m-root`. Simple fix: add it to the list. But with I-039,
  the root MR is auto-raised so it will always be present.

### Impact

- AOT integration becomes a real gate from the moment a story is
  decomposed — not after someone remembers to write the tests
- Zero manual steps between decomposition and having a meaningful
  integration gate
- The methodology's promise of ahead-of-time integration validation
  is structurally enforced, not just prescribed
- Eliminates the class of bugs where "everything went green but
  nothing was actually tested"


---

## I-040: Topology changes — adding, removing, or replacing components in a live project

**Category:** Methodology / architecture
**Priority:** Important (uncovered territory)
**Discovered:** 2026-04-11, discussing wiring between managed repos

### Problem

Methodology M assumes a static topology declared at bootstrap time in
`project.yaml`. Every capability — scaffold-repo, wire-orchestration,
integration-test.sh, report-shadow-status.sh, resolve-story-branches.sh
— reads the component list and treats it as fixed. There is no defined
process for what happens when the topology changes mid-project:

- **Adding a component** (e.g. new MFE, new API service): needs repo
  creation, webhook wiring, CI variable for merge transaction token,
  addition to integration test REPOS list, addition to compose config,
  addition to status fan-out script, health check endpoints updated.

- **Removing a component**: reverse of above — unhook webhooks, remove
  CI variables, remove from REPOS lists, update compose config. What
  happens to in-flight stories that reference the removed component?

- **Replacing a component** (e.g. splitting one API into two): combination
  of add + remove, plus migrating in-flight story sub-tasks and PATs.

- **Changing component type** (embedded → referenced or vice versa):
  the code moves, the orchestration wiring changes, but story-level
  PATs should be unaffected (they're topology-agnostic).

### What's affected

| Artefact | Hardcoded topology? | Needs updating on change? |
|---|---|---|
| `project.yaml` | Source of truth | Yes — add/remove component entry |
| `docker-compose.yml` | Service list, ports, build contexts | Yes |
| `integration-test.sh` | `REPOS` list | Yes |
| `report-shadow-status.sh` | `REPOS` list | Yes |
| `invalidate-story-status.sh` | Repo list (if any) | Yes |
| `resolve-story-branches.sh` | Repo list | Yes |
| `.gitlab-ci.yml` (root) | Clone commands, health endpoints | Yes |
| Webhooks | Per managed repo | Add/remove webhooks |
| CI variables | Per managed repo token | Add/remove variables |
| Health check endpoints | Per component | Add/remove endpoints |

Many of these lists are currently hardcoded strings that should be
derived from `project.yaml` (see I-036). Solving I-036 would make
topology changes much simpler — update `project.yaml`, re-run the
generation capability, done.

### Proposal

1. **Define a `topology-change` capability** — reads current and desired
   `project.yaml`, diffs, and applies the delta: new webhooks, removed
   CI variables, updated compose config, updated scripts.

2. **Derive runtime artefacts from project.yaml** (I-036) — scripts
   and CI configs should read from the manifest, not hardcode repo
   lists. This makes topology changes a single-source update.

3. **Document the manual process** for now — even without automation,
   the methodology should describe what steps are needed when adding
   or removing a component. Currently it's silent on the topic.

### Dependencies

- I-036 (project.yaml as live config, not just declaration)
- wire-orchestration capability (generates the wiring that needs updating)
- scaffold-repo capability (creates new components)

### Impact

Without this, adding a component to a live M project requires manual
updates to 10+ files/configs with no guidance from the methodology.
This is the kind of gap that causes "it works for the demo but breaks
in production" failures


---

## I-041: Pessimistic invalidation — push pending on pipeline start

**Category:** Orchestration / water-tightness
**Priority:** Important (tightens the gate)
**Discovered:** 2026-04-11, discussing gap between pipeline failure and status fan-out

### Problem

When a managed repo's pipeline starts (new push to an MR branch), there
is a window where sibling MRs retain their previous green
`shadow-integration` status. The new code hasn't been AOT-tested yet,
but the old status says "integration passed." This is stale information.

I-032 closed the gap for pipeline *failures* (webhook fires, root
detects failure, fans out `failed`). But the gap between "new code
pushed" and "AOT re-evaluates" remains. During this window, sibling
MRs appear mergeable based on a stale green that predates the new code.

### Proposal

Each managed repo's CI pipeline pushes `pending` for the
`shadow-integration` commit status on ALL story MRs as its very first
job. This immediately blocks all sibling MRs (including its own) until
AOT re-evaluates the new state.

**Implementation approach:**

1. Add a `invalidate-shadow` job as the first stage in each managed
   repo's `.gitlab-ci.yml` (generated by `scaffold-repo`)
2. The job extracts the story ID from the branch name
3. Calls a script (similar to `invalidate-story-status.sh` on root)
   that pushes `state=pending` for `shadow-integration` to all story
   MRs across all repos in the topology
4. Requires a token with API scope that can post commit statuses to
   sibling repos (the group-level token `M_GROUP_TOKEN`)

**Alternative:** Instead of each managed repo doing this, the root
repo's `shadow:invalidate-status` job already does it — but only after
the webhook fires and the root pipeline starts (~30-40s latency). The
managed-repo-first approach is faster (invalidation happens within
seconds of the push, before the webhook even fires).

### What needs changing

- `scaffold-repo` capability — add `invalidate-shadow` job to managed
  repo CI template
- `wire-orchestration` capability — document the pessimistic model
- Each managed repo needs `M_GROUP_TOKEN` as a CI variable (or the
  invalidation script needs to be callable without cross-repo access,
  delegating to the root repo via trigger)

### Trade-offs

- **Pro:** Eliminates stale green window almost entirely
- **Pro:** Managed repos take responsibility for signalling "my code
  changed, re-evaluate everything"
- **Con:** Requires group-level token on every managed repo (security
  surface increase)
- **Con:** Every push to any story branch invalidates all sibling MRs,
  even if the push is trivial (commit message fix, etc.)

### Dependencies

- I-032 (pipeline failure propagation — complementary)
- I-036 (project.yaml as live config — repo list for invalidation)
- scaffold-repo capability (generates managed repo CI)
- wire-orchestration capability (documents the invalidation model)
