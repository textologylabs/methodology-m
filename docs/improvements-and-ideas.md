# Improvements and Ideas

Captured during development of the reference implementation. Each item has
enough context to pick up without archaeology.

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
**Discovered:** 2026-04-04, during MFE visual verification against api-read

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
