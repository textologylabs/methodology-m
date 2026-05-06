# Improvements and Ideas

Captured during development of the reference implementation. Each item has
enough context to pick up without archaeology.

## Prioritisation

Items are tiered by impact and dependency ordering. Resolved items are
listed for completeness — their write-ups remain below as reference.

### Tier 1 — Structural integrity (do next)

| Item | Title | Rationale |
|------|-------|-----------|
| I-047 | project.yaml is AI-generated from Story Zero | Currently hand-authored. Nothing owns interpretation of topology/persistence/deployment intent from story prose. Renderer (I-036) is complete; this is the next step to close the bootstrap authoring loop. |
| I-049 | Deterministic capabilities as code, interpretive as SKILLs — **partial: renderer scope done v0.5.1** | Pure-function operations (renderer, PAT→CAT compilation, schema validation, integrity checks) should live in executable code (cli/), not as SKILL documents an agent interprets. Agents call them. Fixes the determinism gap I-036 exposed. **Renderer + compose/ci providers migrated in v0.5.1. PAT→CAT compilation, schema validation, scm/* pure-dispatch still open — migrate incrementally per-capability.** |

### Tier 2 — Completeness of the delivery loop

| Item | Title | Rationale |
|------|-------|-----------|
| I-004 | Merge transaction execution + gating (remaining after v0.14.0) | Auto-tag + auto-bump shipped in v0.14.0 as the post-merge slice. Cross-repo atomic merge of story MRs and merge-transaction button-light-up gating remain — filed as I-066. |
| I-040 | Topology changes (MERGE / SPLIT / PORT-CHANGE / TYPE-CHANGE) | ADD (v0.12.0), REMOVE (v0.12.1, shipped in v0.13.0), and RENAME (v0.14.0) all shipped. MERGE / SPLIT / PORT-CHANGE / TYPE-CHANGE remain — each its own design surface. |
| I-041 | Pessimistic invalidation on pipeline start | Push `pending` to all story MRs when any constituent pipeline starts. Tightens the gate. |
| I-045 | Extend PAT yaml to multi-framework assertions | PAT yaml's step types are Cypress-shaped (data-testid, click, type). Structural stories, backend-only stories, and component-level health checks need HTTP-style step types compiling to curl/supertest. Surfaced by the TODOM-S01 structural test. |
| I-050 | Capability regression test harness — **partial: thin seed done v0.5.1** | Formalise the rewind-replay-diff pattern into a repeatable harness covering bootstrap + scaffold + all structural ops (ADD/REMOVE/RENAME/MERGE/SPLIT/PORT-CHANGE) + business. **Thin seed (`scripts/e2e-harness.mjs`) shipped in v0.5.1 — covers render → branch → push → MR → poll pipeline → assert → teardown for ADD. Full structural-op coverage still open.** |

### Tier 3 — Architecture and extensibility

| Item | Title | Rationale |
|------|-------|-----------|
| I-009 | Plugin architecture (umbrella) — **3/4 done** | scm, compose, and ci dimensions shipped (gitlab + log-only for scm; docker-compose for compose; gitlab for ci). test and deploy dimensions still TODO. Unifies I-003, I-008, I-015, I-019, I-024, I-025 (I-014 and I-018 closed by I-036). |
| I-003 | Configurable PAT→CAT framework | Sub-item of I-009. Test stack as project config, not hardcoded. |
| I-008 | Role-specific CI templates | Sub-item of I-009. Frontend vs backend scaffold CI. Partial overlap with I-036's ci/gitlab provider (shell lifecycle conditional); full per-role CI template support still open. |
| I-015 | Project templates | Sub-item of I-009. Pluggable scaffolding blueprints per role. |
| I-019 | Persistence layer as plugin | Sub-item of I-009. Shared state between components. |
| I-024 | Project template catalogue | Sub-item of I-015. Org-level template registry. |
| I-025 | Two-tier config: M Core + Org Config | Distribution model. Batteries-included defaults + org overlay. |
| I-026 | Onboarding flows | Greenfield vs existing org adoption paths. |
| I-027 | Installation mechanics | Concrete distribution: npm, CLI, power bundle. |
| I-052 | `m init --user` — user-scope install for agent containers | M CLI currently only installs at project scope. Agentic consumers (e.g. Outpost's hut image) need M baked into the agent user's home so every agent container ships with M skills regardless of which repo it checks out. Requires wrapper path to be scope-aware. |
| I-053 | CI variable protection prereq — shadow pipeline silent break on unprotected main | `wire-orchestration` stores `M_GROUP_TOKEN` + `M_TOKEN_*` with `protected: true`, which is correct for production but makes them inaccessible to trigger pipelines on unprotected main (testbeds). `shadow:detect-trigger` aborts with `M_GROUP_TOKEN not set`. SKILL now documents the prerequisite + carve-out; future follow-up could add a capability-level main-protection check. |
| I-054 | Standalone trigger pipelines hang in `manual` + burn CI minutes on skip-only containers | GitLab rules evaluate before dotenv artifacts exist, so `merge-transaction`'s `when: manual` can't be gated on `TRIGGER_MODE`. Standalone triggers leave an unclicked manual job indefinitely. Also, every gated shadow:* job pulls alpine and apks curl+nodejs before executing its skip-gate, burning ~2.5 min of CI per standalone trigger. Cosmetic + cost concern, not functional. |
| I-055 | Bootstrap paradox — detect-trigger couldn't classify story MRs as active until gate MR merged | Pre-v0.9.0 `detect-story-trigger.sh` treated "no readiness tracker on main" as a skip signal, but the tracker only reaches main when the gate MR merges. Story MRs were perpetually classified as standalone, no AOT ever ran. Option Y: classification is based on live open-MR enumeration; tracker on main is consulted ONLY to filter out follow-up MRs to completed stories. v0.9.0. |

### Tier 4 — Polish and nice-to-haves

| Item | Title | Rationale |
|------|-------|-----------|
| I-001 | Story Zero wizard | Cold-start UX. Nice but Story Zero is a one-time event per project. |
| I-002 | Remove jira/ from GitLab repos | Conceptual cleanliness. Harmless but messy. |
| I-016 | Methodology paper overhaul | Post-demo. Accumulate learnings first. |
| I-017 | DRY compose jobs | Tech debt. No functional change. |
| I-034 | MR reopen events | Webhook edge case. Rare in practice. |
| I-035 | Duplicate pipelines on MR close | CI noise. Not blocking. |
| I-037 | AC-to-PAT 1:many mapping | PAT expressiveness. Current model works for simple stories. |
| I-048 | Switch report-shadow-status.sh to glab CLI | Currently uses raw curl + node (pass1 pattern). Switching to glab would clean up URL construction, JSON parsing, and make future extensions easier (other API calls). Blocked on alpine install story — glab isn't in default apk repo. Low priority, purely QoL, no functional change. |

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
| I-031 | Stale green race condition | `shadow:invalidate-status` restored as a detect-stage job gated on `TRIGGER_MODE=story`; `shadow:compose` needs it so `pending` lands on all sibling MRs before AOT starts. Regression-tested in `ci/gitlab.test.mjs`. v0.8.0. |
| I-032 | Pipeline failure fan-out | Renderer side: `shadow:detect-trigger` branches on `$EVENT_KIND` (mr \| pipeline); `TRIGGER_MODE=pipeline-failure` routes to `shadow:fanout-failure`. v0.8.0. Delivery side: replaced the pipeline-events webhook (403-blocked on GitLab.com) with a `report-failure-to-root` CI job in scaffold-repo's managed-repo template. v0.10.0 (I-056). |
| I-033 | 90s invalidation window | Accepted limitation. Documented. |
| I-039 | Decomposition auto-establishes AOT gate | decompose-story Step 4: auto-compile PAT → Cypress, raise root MR. |
| I-006 | API stubs for frontend repos | `pats/stubs/api-*.js` generated per dependency in scaffold-repo (express/cors, shared state). |
| I-022 | Rename shadow → AOT | Terminology unified across docs, CI jobs, capabilities. |
| I-028 | Repo reorganisation | Distributable M separated from workshop. `cli/`, `powers/`, `steering/` at repo root. |
| I-029 | Version M as npm package with CLI | CLI built, v0.4.0 published to npm as `methodology-m`. Bin entry at `cli/bin/m.mjs`. |
| I-014 | Compose strategy as plugin | `compose.*` provider namespace + `compose/docker-compose` reference impl delivered as part of I-036. v0.5.0. |
| I-018 | Compose strategy boundary in wire-orchestration | CI pipeline delegates compose-specific logic to `sh scripts/integration-test.sh` and `sh scripts/report-shadow-status.sh` instead of inlining. v0.5.0. |
| I-036 | project.yaml as live config | `render-topology-artefacts` capability + `compose.*` and `ci.*` provider namespaces. Bootstrap-root-repo and decompose-story both call the renderer. All four topology-derived files (`docker-compose.yml`, `scripts/integration-test.sh`, `.gitlab-ci.yml`, `scripts/report-shadow-status.sh`) are pure functions of `project.yaml`. v0.5.0. |
| I-051 | `scm.push_files` lifecycle gap — can't update existing files | `scm.push_or_update_files` added to the provider interface; implemented in `scm/gitlab.md` (atomic preferred + interim N-call fallback) and `scm/log-only.md`; wired into `decompose-story` S-4. Live-validated via e2e harness. v0.5.1. |
| I-042 | Reshuffle decompose-story and generate-pats | Lifecycle reshuffled to decompose-story → generate-pats → compile-story-pats. New `compile-story-pats` capability + `test.cat.*` provider namespace (`cypress` + `log-only` reference providers). PAT yaml schema patterns fixed to yaml-valid Option-B format; workshop PAT fixtures rewritten. v0.6.0. |
| I-030 | Standalone and follow-up MRs | `shadow:detect-trigger` classifies story-vs-standalone via readiness tracker authority (no branch-name convention). Downstream shadow + merge-transaction jobs gate on `$STORY_ID`. Webhook URLs encode per-repo identity via query-string variables — free-tier GitLab, no middleman. v0.7.0. |
| I-038 | Sub-task PATs in YAML | Sub-task branch of `pat.schema.json` wired up by I-042: `generate-pats` produces one `<sub-task-id>.pat.yaml` per sub-task with `parent-story:` + `component:` anchoring. PAT stubs in sub-task markdown retired. `scaffold-repo` and `generate-acceptance-tests` read the yaml directly. v0.6.0. |
| I-055 | AOT classification bootstrap paradox | `detect-story-trigger.sh` rewritten under Option Y semantics: classification is based on live open-MR enumeration; the readiness tracker on main is consulted only to filter follow-up MRs to completed stories. Resolves the circular dependency where story MRs couldn't classify as active until the gate MR's tracker was already on main. v0.9.0. |
| I-056 | Pipeline-failure fan-out delivery | Pipeline-events webhook (403-blocked at GitLab's trigger endpoint by the `X-Gitlab-Event: Pipeline Hook` loop-prevention guard) replaced by a `report-failure-to-root` CI job in scaffold-repo's managed-repo template. Runs `when: on_failure` under CI job context — no Pipeline Hook header, no 403. wire-orchestration drops the second webhook and adds `M_TRIGGER_TOKEN` + `ROOT_PROJECT_ID` as CI variables on each managed repo. Renderer side (root pipeline) unchanged from v0.8.0. v0.10.0. |
| I-057 | `report-failure-to-root` curl-globbing regression | v0.10.0's job constructs the trigger URL with `variables[KEY]=VAL` form syntax. curl interprets `[` and `]` as numeric-range glob and exits code 3 (`bad range in URL position 114`) before the request leaves the runner. Caught by L5 validation. Fix: add `-g` (`--globoff`). v0.10.1. |
| I-045 | HTTP step types in PAT yaml | Three new step verbs (`http`, `expect-status`, `expect-body-contains`) added to `pat.schema.json`. Single-provider absorption: the cypress provider compiles them via `cy.request(...).as('lastResponse')` rather than introducing a parallel `curl`/`supertest` provider plus a framework selector. PAT step types stay framework-agnostic at the schema layer; mixed PATs (browser + HTTP) compile to a single `.cy.js`. `compose-service:` and a standalone backend-only provider remain deferred until a real project demands them. v0.11.0. |
| I-040 | Topology changes (ADD) | A project's component set can evolve mid-project via the standard story flow. ADD shipped via two-phase `decompose-story` (Phase A: sub-task + readiness tracker, no SCM mutation; Phase B: `project.yaml` mutation + topology re-render) composed with v0.6.0's `generate-pats`/`compile-story-pats`/`test.cat.cypress`, v0.11.0's HTTP step types + cypress absorption, v0.5.1's pure-function topology renderer + `scm.push_or_update_files`, and #18's phase-split contract. No new code in v0.12.0 — the release ships I-040 because end-to-end ADD is now demonstrated against a real workshop testbed (TODOM-S02 → metrics on port 3004, root MR !35, pipeline 2495405820, all 5 jobs success; topology aliveness probes 5/5 pass on real GitLab CI). REMOVE / RENAME / MERGE / SPLIT / PORT-CHANGE remain deferred. v0.12.0. |
| I-040 | Topology changes (REMOVE) | The structural-verb family extended: a project's component set can also shrink mid-project. New `expect-unreachable` step verb (cypress provider absorbs it via fused fetch+catch — cy.request can't observe network errors before chained .then). Caller pre-flight at decompose-story Step 2 enforces M's verifiability invariant: removing a component with active callers conflates structural change with behaviour change, so REMOVE-with-callers is hard-rejected with guidance to ship a prep story first. compile-story-pats's bundle assembly identifies historical compiled CATs that probe the removed component (static grep on name + ports) and includes their deletion. Regenerated detect-story-trigger.sh carries a 5-line source-repo guard so orphan-repo webhooks classify as standalone (no spurious shadow runs); managed-repo decommission proper is filed as I-061 follow-up. Demonstrated end-to-end against the live workshop (TODOM-S03 → remove metrics, root MR !36, pipeline 2495493085, validate:compose green with topology probes 4/4 — was 5/5 before). v0.12.1 (shipped as part of v0.13.0 — see release notes). |
| I-040 | Topology changes (RENAME) | First structural verb to ship without schema changes. RENAME's two-AC PAT (new name reachable + old name unreachable) composes existing `http:` + `expect-status` + `expect-body-contains` + `expect-unreachable` verbs through the established cypress absorption (v0.11.0 + v0.12.x). Pre-flight scan in decompose-story Step 2 mirrors REMOVE: managed-repo source files + managed-repo PAT yamls hard-reject on real callers (same prep-story discipline); root PAT yamls warn (audit-trail). Historical compiled CATs that reference the old identifier are rewritten in place via the new shared utility `.m/capabilities/_lib/historical-cat-scan.mjs` (closes I-062). Source PAT yamls on root are deliberately not rewritten — divergence between source PAT yaml and compiled CAT after RENAME is the audit trail. Bundle uses I-063's unified actions[] payload (all `update` actions). v0.14.0. |
| I-004 | Post-merge lifecycle (auto-tag + auto-bump + topology CHANGELOG) | Closes the post-merge half of the M promise. Three new CI pieces: (a) the placeholder `tag` job in scaffold-repo's managed-repo template becomes a real semver patch bump with `[skip-auto-tag]` / `[bump-minor]` / `[bump-major]` markers; (b) new `report-tag-to-root` CI job mirrors v0.10.0's `report-failure-to-root`; (c) detect-story-trigger.sh learns a third `EVENT_KIND=tag` branch routing to the new `shadow:bump-topology` job, which shells out to a new rendered `scripts/bump-topology.sh` that mutates project.yaml, appends to a project-level `CHANGELOG.md` (seeded by bootstrap-root-repo), and opens a `chore/bump-<comp>-<tag>` MR. Resource group `bump_topology` serialises concurrent bumps. Merge transaction execution / gating filed as I-066; auto-merge of bump MRs filed as I-067. Manual `tag-release` retained as fallback. v0.14.0. |
| I-062 | Historical-CAT scan extracted to shared utility | Inline grep from compile-story-pats's REMOVE bundle assembly moved to `.m/capabilities/_lib/historical-cat-scan.mjs` with two operations: `findReferencing` (REMOVE) + `rewriteReferencing` (RENAME). RENAME's contract gave the abstraction a second caller, so it's no longer premature. v0.14.0. |
| I-063 | `scm.delete_file` provider primitive | `scm.push_or_update_files` extended to accept a third entry kind `{ path, action: 'delete' }`. GitLab provider documents two paths: atomic single-commit via `POST /projects/:id/repository/commits` with mixed `actions[]` (preferred, available via curl today; via MCP wrapper once that lands), interim per-action via existing `mcp_gitlab_create_or_update_file` for create/update plus a new `.m/providers/scm/gitlab/delete-file.mjs` helper for delete. Retires the v0.13.0 stub-`describe()` workaround in `compile-story-pats`'s historical-CAT cleanup. Function name preserved (rename to `scm.push_files` would have collided with the existing strict create-only function); same design intent. v0.14.0. |
| I-058 | Workshop MF chunk + api fetch fail under headless cypress | Shell + MFE bundles baked in `http://localhost:300x` URLs at build time — works for host browser (port mapping) but fails inside cypress-in-docker (`localhost` from cypress container ≠ host's localhost). Same-origin proxy through shell's nginx (and webpack-dev-server in `npm run dev`): `/mfe/* → mfe:3001/*`, `/api-read/* → api-read:3002/*`, `/api-write/* → api-write:3003/*`. Bundles now use relative URLs (`todoMfe@/mfe/remoteEntry.js`, `API_URL=/api-read`). Verified: TODOM-000 6/6 + TODOM-L4 3/3 cypress tests pass. Workshop-side fix only; no methodology impact. Resolved 2026-04-26. |
| I-059 | `m clone` topology parser miscount with `persistence:` block | Hand-rolled line scanner in `cli/src/lib/topology.mjs` didn't track scope: a top-level `persistence:` block (or any non-`components:` top-level header whose first child key was `type:` / `location:`) leaked into the last component, dropping it from `getReferencedRepos`. Fixed with a section-boundary check that closes the in-progress component when a non-indented header line is hit. Renderer was unaffected (uses `js-yaml`). Regression test in `cli/test/cli.test.mjs`. v0.13.0. |
| I-064 | Self-update prompt on operational `m` commands | CLI checks the npm registry on entry to operational commands and offers `Update now? (y/N)`. On accept, runs `npm i -g methodology-m@latest` and re-execs the original command. Skipped for meta commands (`help`, `version`, `changelog`), non-TTY environments, and when `M_NO_UPDATE_CHECK=1` is set. 2s registry timeout with silent fall-through on any error. Pattern adapted from `textologylabs/hex` (`src/update.ts`). Limits: assumes `npm` for installs (pnpm/yarn/bun users opt out via env var); pre-release tags on npm `latest` would over-prompt but Methodology M doesn't ship any. v0.13.0. |

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
**Status:** ✅ Mostly resolved — shadow status reporting (2026-04-05), auto-tag + auto-bump + project-level CHANGELOG (v0.14.0, 2026-05-06). Cross-repo merge-transaction execution + gating remain — filed as **I-066** follow-up.
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

### Locked design (v0.14.0 — auto-tag + auto-bump + topology changelog)

**Status:** DRAFT — review before impl.

Locked 2026-05-06 ahead of v0.14.0 implementation. Captures only
the post-merge-lifecycle slice of I-004; merge-transaction
execution and gating remain deferred (see "Out of scope" below).

**1. Scope.** Three pieces of automation, all triggered by an MR
merge to main on a managed repo:

- **(a) Auto-tag.** The placeholder `tag` CI job in scaffold-repo's
  managed-repo template (currently
  `"tag": "echo 'auto-tag: not yet implemented'"`) becomes a real
  semver bump + annotated tag + push.
- **(b) Tag-to-root notification.** A new
  `report-tag-to-root` CI job (mirrors v0.10.0's
  `report-failure-to-root`) calls root's trigger endpoint with
  `EVENT_KIND=tag`.
- **(c) Auto-bump.** Root's pipeline learns a third
  `EVENT_KIND=tag` branch in `detect-story-trigger.sh`. A new
  `shadow:bump-topology` job mutates `project.yaml` to set
  `components[name=$COMPONENT_NAME].tag = $NEW_TAG`, appends a
  `[Topology bumps]` entry to root's `CHANGELOG.md`, and opens a
  `chore/bump-<component>-<tag>` MR.

The merge transaction (cross-repo atomic merge of all story MRs)
and merge-transaction gating (button-light-up only when all
managed MRs green) are **out of scope** for this ship. They are
filed as a follow-up (see "Out of scope" below). The post-merge
lifecycle works without them — devs merge story MRs individually
in any order; tags + topology bumps fan out automatically.

**2. Why post-merge lifecycle without merge-transaction execution?**
The roadmap entry for I-004 v0.13.0 explicitly listed "auto-tag,
bump version, commit the bump, update CHANGELOG." That's a real
unit of value (eliminates manual bookkeeping) and ships on a
stable pre-merge flow already in production. The merge-transaction
execution is a different beast — cross-repo atomicity, rollback
semantics, partial-failure handling — and bundling it would
inflate risk for no incremental gain. Same scope-discipline that
drove ADD-then-REMOVE-then-RENAME instead of all-structural-verbs.

**3. Auto-tag mechanics — `tag` CI job.** Runs on
`pipeline.event=push` + `ref=main` (i.e. merge to main). Logic:

1. Read the latest annotated tag from origin (`git describe --tags
   --abbrev=0` or REST equivalent if shallow clone).
2. If no tag exists, default to `v0.1.0`. Otherwise patch-bump the
   latest tag (`v0.2.3` → `v0.2.4`).
3. Skip if the merge commit's message contains
   `[skip-auto-tag]` or `[no-tag]` (escape hatch for in-flight
   refactors and revert merges).
4. Skip if the merge commit's tree is unchanged from the previous
   tagged commit (no functional change → no new tag).
5. Create an annotated tag with the merge commit's first-line
   message as the tag message. Push the tag using a project access
   token already provisioned by `wire-orchestration` (the
   `m-merge-transaction` token gets a `write_repository` scope
   bump for this job).

**Default to patch bump.** Minor + major bumps require deliberate
intent — supported via `[bump-minor]` / `[bump-major]` markers in
the merge commit message (parser is a regex over the merge commit
title + body). Deliberately not configurable per-component in
`project.yaml` — the bump intent rides on the *commit*, not the
*topology*.

**4. Tag-to-root notification — `report-tag-to-root` CI job.**
Direct mirror of v0.10.0's `report-failure-to-root`:

- Stage `.post`, runs `when: on_success` after `tag` job.
- Posts to root's trigger endpoint via curl with `-g` (per I-057):
  `URL="$CI_API_V4_URL/projects/$ROOT_PROJECT_ID/ref/main/trigger/pipeline?token=$M_TRIGGER_TOKEN&variables[SOURCE_PROJECT_ID]=$CI_PROJECT_ID&variables[SOURCE_PROJECT_PATH]=$ENCODED_PATH&variables[NEW_TAG]=$NEW_TAG&variables[COMPONENT_NAME]=$COMPONENT_NAME&variables[EVENT_KIND]=tag"`
- Best-effort — if root unreachable, the tag still lands on the
  managed repo; the topology bump just stays manual until the next
  successful trigger.

CI variables already provisioned by `wire-orchestration`
(`M_TRIGGER_TOKEN`, `ROOT_PROJECT_ID`). `COMPONENT_NAME` is
derived from `package.json` `name` (same convention as
`tag-release` capability).

**5. Auto-bump mechanics — root `shadow:bump-topology` job.**
Root's `detect-story-trigger.sh` currently branches on
`EVENT_KIND` for `mr` / `pipeline`. Add a third branch for
`tag`:

```bash
if [[ "$EVENT_KIND" == "tag" ]]; then
  TRIGGER_MODE=tag
  echo "TRIGGER_MODE=tag" >> trigger.env
  echo "TAG_COMPONENT=$COMPONENT_NAME" >> trigger.env
  echo "TAG_NEW_VERSION=$NEW_TAG" >> trigger.env
  exit 0
fi
```

`shadow:bump-topology` job (new) gates on `TRIGGER_MODE=tag`:

1. Clone root repo.
2. Read `project.yaml`, locate the matching component by name,
   set `tag: $TAG_NEW_VERSION`.
3. Append a `[Topology bumps]` line to root's `CHANGELOG.md`
   under `[Unreleased]`:
   ```
   - Component `<name>` bumped from `<old>` to `<new>`.
   ```
   If the merge commit on the managed repo had a
   `[changelog: <text>]` marker, use `<text>` instead of the
   default line.
4. Commit on a fresh branch
   `chore/bump-<component>-<sanitised-tag>` (e.g.
   `chore/bump-metrics-v0-2-4`).
5. Push branch + open MR with title
   `🔧 Topology: bump <component> to <tag>` and body listing the
   triggering managed-repo pipeline + commit.
6. Optionally auto-merge the bump MR if its CI passes (the bump
   MR's pipeline classifies as `standalone` via the source-repo
   guard — managed-repo source is in `REPOS`, but the trigger here
   came from a `tag` event, not a story `mr` event).

**Auto-merge of bump MRs.** Default OFF for v0.14.0. The MR is
opened, sits with a green pipeline (changes are pure topology;
`validate:compose` proves the new tag is reachable), waits for a
human to click merge. Auto-merge is filed as a follow-up
(I-066 — see below). Reasoning: bump MRs interleave with story
MRs and merge-transaction MRs; auto-merging them changes the
baseline for in-flight stories and is the kind of automation that
benefits from explicit user opt-in.

**6. Concurrency — two managed repos tag at once.** Race shape:
managed-repo-A merges and tags, triggers `shadow:bump-topology`,
which clones root and starts mutating yaml; meanwhile
managed-repo-B does the same. Both push branches with different
names (`chore/bump-A-v0.2.4` vs `chore/bump-B-v0.3.1`), both open
MRs against main. Once one merges, the other's MR rebases or
conflicts. Resolution: the bump-topology job catches the conflict
on next push attempt, rebases against main, retries. Bounded retry
(2 attempts); on persistent conflict, post a comment on the second
MR and leave it for human resolution.

GitLab `resource_groups` is already used by `merge-transaction`
(see scm/gitlab.md "Resource groups"). Add `shadow:bump-topology`
to a `bump-topology` resource group so only one bump runs against
root at a time. This serialises the rebase-and-push cycle and
removes the race surface entirely.

**7. CHANGELOG entries.** Two CHANGELOG channels:

- **Methodology-m's own `CHANGELOG.md`** at the repo root —
  unchanged. Tracks releases of the methodology itself.
- **Each project's own `CHANGELOG.md` at the root repo** — a new
  project-level changelog written by `shadow:bump-topology`. The
  bootstrap-root-repo capability seeds an empty
  `[Unreleased] [Topology bumps]` section. Each tag event appends
  a line; periodically the user (or a future capability) closes
  the unreleased section into a dated release section.

The project-level CHANGELOG is a **new artefact**. Contract
defined in `bootstrap-root-repo` SKILL update + an example seeded
into the workshop fixture.

**8. Pre-existing tag-release capability.** The `tag-release`
capability (currently agent-driven, manual invocation by the user)
becomes the *manual* path for tagging — kept for cases where the
auto-tag escape hatches fire (`[skip-auto-tag]` markers, partial
deploys, repo-specific bumps). The auto-tag CI job is the
*automated* path. Both write the same shape of tag and trigger
the same downstream `report-tag-to-root` flow (the CI job runs
the same script the agent would run).

The `tag-release` SKILL is updated with a "Manual vs automatic"
header explaining the relationship.

### Worked example (TODOM-S05 — first story shipped via auto-tag)

After v0.14.0 ships:

1. A dev opens an MR on `todo-m-api-read` for a feature.
2. CI runs MR pipeline; story shadow chain on root reports
   green via existing wiring.
3. Dev merges the MR.
4. `todo-m-api-read`'s main pipeline runs, ending at the `tag`
   stage. Auto-tag job: latest tag was `v0.1.0`, no skip marker,
   tree changed → tag `v0.1.1` + push.
5. `report-tag-to-root` job calls root's trigger endpoint with
   `EVENT_KIND=tag, COMPONENT_NAME=api-read, NEW_TAG=v0.1.1`.
6. Root pipeline runs `detect-story-trigger.sh`, classifies as
   `TRIGGER_MODE=tag`, hands off to `shadow:bump-topology`.
7. `shadow:bump-topology` clones root, edits `project.yaml`
   (`api-read: tag: v0.1.0` → `tag: v0.1.1`), appends to
   `CHANGELOG.md`, commits to `chore/bump-api-read-v0-1-1`,
   pushes, opens MR `🔧 Topology: bump api-read to v0.1.1`.
8. Bump MR pipeline runs — `validate:compose` reaches all
   components incl. the newly-tagged api-read at v0.1.1.
   Pipeline green.
9. Tech lead reviews the bump MR (one-line yaml diff + one-line
   CHANGELOG diff), clicks merge.
10. Topology on root main reflects the new pinned version.

L5 evidence: end-to-end run on the workshop testbed. TODOM-S05
is a trivial business story (e.g. "add `/version` endpoint to
api-read returning the current package.json version") chosen so
the merge → tag → bump cycle exercises every step against real
GitLab CI.

### Implementation deltas

| Capability / file | Change |
|---|---|
| `scaffold-repo` SKILL | Managed-repo CI template: `tag` job becomes real (semver patch, escape hatches via merge-commit markers, push via project access token); new `report-tag-to-root` job in `.post` stage mirroring `report-failure-to-root` |
| `wire-orchestration` SKILL | Project access token gets `write_repository` scope (was read-only previously); confirmed `M_TRIGGER_TOKEN` + `ROOT_PROJECT_ID` already cover the report-tag flow |
| `bootstrap-root-repo` SKILL | Seeds an empty project-level `CHANGELOG.md` in the root repo with `## [Unreleased]\n### [Topology bumps]\n` headers |
| `.m/providers/ci/gitlab.mjs` | Renderer learns the third `EVENT_KIND=tag` branch in `detect-story-trigger.sh`. Renders new `shadow:bump-topology` job in root pipeline, gated on `TRIGGER_MODE=tag`, in resource group `bump-topology` |
| `.m/providers/ci/gitlab.test.mjs` | Regression coverage for: tag-event detection routes to `shadow:bump-topology`; mr-event still routes to `shadow:detect-trigger`; pipeline-failure unchanged. Idempotent renderer output |
| `tag-release` SKILL | "Manual vs automatic" header explains the relationship to the new auto-tag CI job. Manual path retained as fallback |
| `bootstrap-root-repo` SKILL | Adds the project-level CHANGELOG seed (one line in setup section) |

### Dependencies + follow-ups

- Depends on **I-063** (`scm.delete_file` MCP primitive — locked
  below): the bump-topology MR uses the unified `actions[]` push
  contract, though for v0.14.0 only `update` actions are needed.
- **I-066** filed as follow-up: merge-transaction execution
  (cross-repo atomic merge of story MRs) and merge-transaction
  gating (button-light-up only when all managed MRs green).
  Distinct scope; benefits from a stable post-merge lifecycle as
  prerequisite. Prioritised post-MVP.
- **I-067** filed as follow-up: auto-merge of bump MRs (currently
  human-clicked). Pull-driven — wait for a real project to ask.

### Sizing

**M.** New surface: one CI job (real `tag`), one CI job
(`report-tag-to-root`), one EVENT_KIND branch in detect-trigger,
one `shadow:bump-topology` job, one project-level CHANGELOG
artefact, the resource-group serialisation, the concurrent-bump
rebase loop. Each piece small; the integration is what makes it M
not S. L4 evidence is straightforward; L5 is the real test
because it runs the cross-repo trigger flow end-to-end.

### Out of scope for v0.14.0

- **Merge transaction execution.** Cross-repo atomic merge of all
  story MRs. Filed as I-066.
- **Merge transaction gating.** Button-light-up logic based on
  commit statuses across managed MRs. Filed as I-066.
- **Auto-merge of bump MRs.** Filed as I-067.
- **Major / minor bump heuristics.** Default is patch; minor +
  major require explicit `[bump-minor]` / `[bump-major]` markers
  on the merge commit. No semver-from-commit-content inference
  (e.g. parsing conventional commits) — that's a separate concern
  filed if needed.
- **Tag rollback.** If the auto-tag fires but the
  `report-tag-to-root` notification fails irrecoverably, the tag
  on the managed repo is real but root's project.yaml is stale.
  Recovery is a manual `tag-release` invocation. No automatic
  rollback in v0.14.0.


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
**Status:** ✅ Resolved (2026-04-22, v0.7.0) — `shadow:detect-trigger`
job classifies every trigger as story-MR or standalone via
authority-based detection (readiness tracker cross-check, no
branch-name convention). All downstream shadow + merge-transaction
jobs gate on `$STORY_ID` via dotenv artifact and early-exit on
empty. Also addresses follow-up MRs to completed stories as
standalone by the same rule. Webhook URL construction in
`wire-orchestration` Step 3 now encodes `SOURCE_PROJECT_ID` and
`SOURCE_PROJECT_PATH` as static query-string variables — free-tier
GitLab, no middleman service required.
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
**Priority:** Water-tightness
**Status:** ✅ Resolved in v0.8.0 (2026-04-22). `shadow:invalidate-status`
is emitted by `ci/gitlab.mjs` as a detect-stage job gated on
`TRIGGER_MODE=story`. It calls `report-shadow-status.sh pending` to
push `pending` to every open story MR (root + managed), and
`shadow:compose` declares `needs: [shadow:invalidate-status]` so
invalidation always lands before AOT begins. Regression tests in
`ci/gitlab.test.mjs` (`I-031 pre-AOT invalidation`) lock the job
contract so the v0.5.0-style silent simplification can't drop it
again.
**Original resolution:** 2026-04-07 — instant status invalidation pushes pending to all story MRs before AOT runs.
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
**Priority:** Water-tightness
**Status:** ✅ Resolved in v0.8.0 (2026-04-22). `wire-orchestration`
now installs two webhooks per managed repo — one `merge_request`-only
webhook tagged `variables[EVENT_KIND]=mr` and one `pipeline`-only
webhook tagged `variables[EVENT_KIND]=pipeline` — so every trigger
carries an unambiguous event-kind signal as a CI variable.
`shadow:detect-trigger` branches on `$EVENT_KIND`: on pipeline events
it queries the source project's recent pipelines for a failed status,
extracts any `[A-Z]+-[0-9]+` story ID from the failing pipeline's
ref, validates the readiness tracker, and emits
`TRIGGER_MODE=pipeline-failure`. A new `shadow:fanout-failure` job in
the report-status stage gates on that mode, skips compose +
integration-test entirely, and calls `report-shadow-status.sh failed`
to push `failed` to every sibling story MR. Regression tests in
`ci/gitlab.test.mjs` (`I-032 pipeline-failure fan-out`) lock the
branch and the job contract.
**Original resolution:** 2026-04-11 — pipeline_events added to webhooks, detect-trigger handles pipeline_failure, fan-out to all story MRs.
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

## I-047: project.yaml should be AI-generated from Story Zero

**Category:** Methodology / capability lifecycle
**Priority:** High (sits directly after I-036; renderer is meaningless without a generated input)
**Discovered:** 2026-04-15, during I-036 scoping — surfaced by sub-agent baseline run

### Problem

`project.yaml` is the topology manifest. I-036 makes it a live config that
the renderer consumes. But nothing generates it — it is hand-authored by
whoever bootstraps the project. This means:

- Topology, persistence, deployment model, component roles, ports, tags
  — all interpreted from Story Zero prose by a human, typed into yaml,
  and then handed to `bootstrap-root-repo` as input.
- There is no capability that owns "read Story Zero, emit project.yaml".
- Every pass1 / workshop / demo has required human intervention at this
  step, making end-to-end AI execution of M impossible from Story Zero.
- The drift items surfaced by the I-036 sub-agent baseline (missing
  persistence block in the SKILL-literal bootstrap output vs. pass1
  having one) are a direct symptom: nothing owns the interpretation,
  so different actors produce different project.yamls from the same
  source.

### Proposal

A new capability — working name `author-project-yaml` — reads the Story
Zero markdown file and emits a complete, schema-valid `project.yaml`.
Interprets:
- `## Project` section → project name, group, topology mode, CI platform, deployment model
- `## Components` catalogue → components list with name, role, port
  assignment, type (embedded/referenced), tag seed
- Implicit persistence needs from the story prose → `persistence:` block
  when the story implies shared state (e.g. "both backends read/write
  the same todos")
- Provider selection → `providers:` block
- Compose strategy → `compose:` block with local + integration entries

Runs BEFORE `bootstrap-root-repo`. The output is fed into
`bootstrap-root-repo` as the `project-yaml` parameter, which now reads
it instead of deriving fields ad-hoc from the story.

### Dependencies

- Must ship after I-036 (the renderer that consumes project.yaml must
  exist and be stable before we automate the author of its input).
- Unblocks end-to-end AI execution of Story Zero — no more human
  yaml typing.

### Impact

Closes the last hand-authored artefact in the M bootstrap flow. With
I-036 (live config) + I-047 (generated config), the whole topology
surface becomes AI-driven from Story Zero prose alone.

---

## I-049: Deterministic capabilities as code, interpretive as SKILLs — ⚠️ PARTIAL (v0.5.1)

**Category:** Architecture / execution model
**Priority:** High (unblocks real determinism, dramatically cheaper to run)
**Discovered:** 2026-04-15, during I-036 live validation post-mortem
**Status:** Renderer scope delivered in v0.5.1 (`.m/capabilities/render-topology-artefacts/render.mjs` + `.m/providers/compose/*` + `.m/providers/ci/*` as executable Node modules). Remaining scope — PAT→CAT compilation, schema validation, scm/* pure-dispatch — still open. Migrate incrementally per-capability post-v1.0.

### Problem

M capabilities are currently all expressed as SKILL.md documents that an
AI agent reads and executes. This model conflates two fundamentally
different kinds of operations:

- **Interpretive** — "read this story, identify which component owns
  which PAT, propose a decomposition." These need context, judgment,
  creativity. An agent is the right executor. SKILL.md is the right
  home.
- **Deterministic** — "given this `project.yaml`, emit exactly these
  four files." These are pure functions. The output is fully determined
  by the input. No creativity. No judgment. No variance allowed.

The I-036 `render-topology-artefacts` capability is the cleanest example.
Its whole job is: parse yaml, emit files. It has no interpretive surface.
But today it's a SKILL an agent reads and executes by hand. Consequences:

- **Determinism is aspirational, not mechanical.** Two agents reading
  the same SKILL may produce slightly different bytes. The "byte-
  identical output" claim in the SKILL cannot be enforced.
- **Execution is slow and expensive.** An agent re-reading the SKILL
  every time it renders (minutes, plus token cost) when a Node function
  would take milliseconds for free.
- **Regression testing is impossible.** You can't diff two renders
  against each other with confidence because each render depends on
  agent discipline.
- **The renderer output during I-036's own live test was hand-written
  by me as agent.** If I transcribed anything wrong, the test passed
  despite the bug — and no automated check could catch it.

The provider interface already baked in this distinction for SCM:
`scm.create_repo` is not a SKILL — it's a concrete MCP/API call dispatched
through `.m/providers/scm/gitlab.md`. Agents don't "interpret" how to
create a repo; they call the function. The same pattern should apply to
every pure-function capability.

### Proposal

Draw an explicit line:

- **Executable code (in `cli/` as Node functions, exposed via the M CLI):**
  - `render-topology-artefacts` (the full chain: parse project.yaml →
    dispatch providers → emit files)
  - PAT → CAT compilation (the Cypress transform)
  - Schema validation (`m validate-project`)
  - Readiness tracker operations
  - Integrity gate checks (SCM-aware, not filesystem)
  - Any other pure function currently living in a SKILL

- **SKILL.md (interpretive agent work):**
  - `decompose-story` story reading, PAT mapping, sub-task authoring
  - `generate-pats` prose → PAT YAML
  - Structural story recognition (reading story text to decide if it's
    structural and which kind)
  - Reviewer judgments
  - Anything that needs context, creativity, or judgment

Capabilities remain the top-level unit. Their SKILL.md becomes shorter —
agents do the interpretive work, then CALL the executable helpers for
the deterministic parts. Example refactor of `decompose-story`:

```
decompose-story (SKILL, agent-executed):
  1. Read story. Propose PAT mapping. [interpretive]
  2. For structural: decide operation type (ADD/REMOVE/...). [interpretive]
  3. Author new project.yaml via Edit tool. [interpretive]
  4. CALL `m render-topology-artefacts` [deterministic, scripted]
  5. CALL `m compile-pat --story TODOM-001 --framework cypress` [deterministic]
  6. Git commit + push [standard dev flow]
  7. CALL scm.create_merge_request [provider dispatch]
```

### What needs to change

1. **M CLI** grows new subcommands — one per deterministic operation.
   `m render-topology-artefacts`, `m compile-pat`, `m validate-project`,
   etc. Each is a pure function of its arguments.
2. **Provider files** describe what the function does at the interface
   level; **CLI files** implement it. The SKILL becomes a reference
   doc, not an execution script.
3. **Existing SKILLs are slimmed down.** They call `m <command>`
   instead of containing the pseudo-code of the operation.
4. **Tests come for free** — a Node function is trivially unit-testable
   and integration-testable. I-050's regression harness becomes much
   easier to build on top of this.

### Dependencies

- Requires modest Node development — the CLI already exists (I-029),
  so the scaffolding is there.
- Must ship before I-040 (topology changes) and I-050 (capability
  regression test harness) to be truly valuable.
- Coexists with I-047 (AI-generated project.yaml) — `author-project-yaml`
  is an interpretive capability (Story Zero prose → yaml) and stays
  in SKILL form, but calls `m validate-project` after emitting.

### Impact

Flips M from "SKILLs all the way down" to a clean interpretive/
deterministic split. Massively cheaper per-run, actually deterministic
in the mathematical sense, and makes automated testing possible. This
is the conceptual fix for the gap I-036's live test exposed.

---

## I-050: Capability regression test harness — ⚠️ PARTIAL (v0.5.1)

**Category:** Testing infrastructure / methodology
**Priority:** High (quality of evolution from here on)
**Discovered:** 2026-04-15, during I-036 live validation
**Status:** Thin seed shipped in v0.5.1 (`scripts/e2e-harness.mjs`, 379 lines, zero-dep). Scripts render → branch → push → MR → poll pipeline → assert → teardown for an ADD scenario. Full structural-op coverage (REMOVE/RENAME/MERGE/SPLIT/PORT-CHANGE, scaffold, wire) still open.

### Problem

I-036's live validation was real and end-to-end, but also ad-hoc:
rewind workshop → manually edit project.yaml → hand-write rendered files
→ git commit + push → raise MR → watch pipeline → read log → call it
green. Each step was bespoke. There is no repeatable harness, so
regression coverage is accidental, not designed.

Specific gaps left by the I-036 live test:

- **Only the ADD structural operation was exercised.** REMOVE, RENAME,
  MERGE, SPLIT, PORT-CHANGE all share most of the renderer codepath but
  are untested.
- **`bootstrap-root-repo` was skipped entirely.** The rewound workshop
  starts at post-bootstrap state, so the refactored bootstrap path
  (Step 6 renderer call, persistence extraction, packages/shell stub)
  never ran against real GitLab.
- **`scaffold-repo` was mocked.** I created `todo-m-analytics` with a
  minimal seed commit, not through the full scaffold-repo flow (which
  includes CI pipeline, access tokens, webhooks, etc.).
- **`report-shadow-status.sh` never executed.** It only fires on trigger
  pipelines, which validate:compose doesn't use. The curl+REST rollback
  is syntactically present but runtime-untested.

### Proposal

A formal harness covering every capability path end-to-end, runnable
as a single command. Rough shape:

```
m test e2e --target gitlab --group methodology-m/todo-m-workshop-e2e
```

The harness:

1. Creates (or reuses) a throwaway workshop group on the target SCM.
2. Runs `bootstrap-root-repo` → asserts rendered files present + valid.
3. Runs `scaffold-repo` for each managed component → asserts CI green.
4. Smoke: pushes a trivial change to a managed repo → asserts shadow
   compose webhook → pipeline fan-out → commit status fan-out.
5. Runs `decompose-story` for TODOM-001 (business) → asserts MR !X
   raised, pipeline green, no sub-task leakage into SCM repos.
6. Runs `decompose-story` for TODOM-S01 (structural ADD) → asserts MR,
   pipeline green, topology files regenerated correctly.
7. Repeats for TODOM-S02..S06 (REMOVE/RENAME/MERGE/SPLIT/PORT-CHANGE)
   — each is a new committed fixture.
8. Tears down or rewinds at the end.

Each step asserts BOTH the local file state AND the remote GitLab state
(pipeline results, MR structure, commit status). Pass/fail is mechanical.

### What needs to change

1. **Test fixtures committed permanently:** TODOM-000 (already exists),
   TODOM-001 (exists), TODOM-S01 (exists, added by I-036),
   TODOM-S02..S06 (new — one per non-ADD structural operation).
2. **Harness binary:** a new CLI command (`m test e2e` or similar) or
   shell script that drives the full sequence.
3. **Assertions:** each step has a declarative expectation — e.g.
   "after bootstrap, root repo has files [x, y, z]; after decompose-S01,
   docker-compose.yml contains service 'analytics'".
4. **CI integration (optional):** the harness could run on every
   methodology-m PR that touches a capability or provider, against a
   throwaway subgroup. Would need a token with create-project + delete-
   project permissions.

### Dependencies

- I-049 (deterministic capabilities as code) makes this dramatically
  easier — asserting "the renderer produces these bytes" is trivial
  against a code function, painful against an agent-executed SKILL.
- I-029 (M CLI) — the harness plugs in as another CLI command.

### Impact

Evolving M from here on currently depends on manual validation per
change. Any refactor that touches a capability requires a full ad-hoc
live run. With the harness, CI catches regressions automatically.
Confidence-per-release increases 10x.

---

## I-051: `scm.push_files` lifecycle gap — can't update existing files — ✅ DONE (v0.5.1)

**Category:** Provider interface / SCM
**Priority:** Medium (latent bug, affects every structural story)
**Discovered:** 2026-04-15, during I-036 live validation
**Resolved:** v0.5.1. `scm.push_or_update_files` added to the provider interface; implemented in `scm/gitlab.md` (atomic preferred + interim N-call fallback) and `scm/log-only.md`; wired into `decompose-story` S-4. Live-validated via `scripts/e2e-harness.mjs` (MR !29, pipeline 2462335312, all 5 jobs green).

### Problem

The refactored `decompose-story` SKILL's S-4 section shows:

```
scm.push_files(repo, branch, files=[
  { path: "project.yaml",                content: ... },
  { path: "docker-compose.yml",          content: ... },
  { path: "scripts/integration-test.sh", content: ... },
  { path: ".gitlab-ci.yml",              content: ... },
  { path: "scripts/report-shadow-status.sh", content: ... },
])
```

But `scm.push_files` is create-only per the gitlab provider spec:

> **Gotchas:** `push_files` rejects commits that touch files already
> existing on the branch. For re-runs on partially seeded repos, use
> `scm.create_or_update_file()` per file instead.

For a structural story, `project.yaml`, `docker-compose.yml`, and
`.gitlab-ci.yml` ALWAYS already exist (they were seeded at bootstrap).
So the SKILL's S-4 pseudo-code would fail on the first real structural
run with "A file with this name already exists".

During I-036's live validation I hit this exact error on my first
attempt and worked around it by using `git commit + git push` from the
local clone, bypassing `scm.push_files` entirely. That works but it's
not what the SKILL says to do.

### Proposal

Two candidate fixes:

**Option A — Update the SKILL to use `create_or_update_file` per file.**
Drawback: each file becomes its own commit. No atomicity. The MR shows
N commits instead of one "structural change" commit.

**Option B — Add a new provider function `scm.push_or_update_files`.**
Same shape as `push_files` but handles both create and update cases
atomically (via GitLab's commits API which supports mixed create/update
actions in a single commit). The SKILL stays clean.

Option B is the cleaner fix. The GitLab commits API natively supports
mixed `create`/`update` actions in a single commit payload, so a single
MCP call can produce one atomic commit with the full file set. Other
SCM providers (GitHub, Gitea) have similar APIs.

### What needs to change

1. **Provider interface**: add `scm.push_or_update_files(repo, branch,
   files[], commit_message)` to `.m/providers/provider-interface.md`.
2. **gitlab provider**: implement via `POST /projects/:id/repository/commits`
   with `actions: [{action: "create|update", file_path, content}, ...]`.
3. **log-only provider**: dry-run stub.
4. **decompose-story SKILL S-4**: switch to the new function.

### Dependencies

- Provider interface extension (straightforward).
- MCP tooling may need a new `mcp__gitlab__commits` function that
  accepts a mixed-action payload. Current `push_files` only does create.

### Impact

Closes a latent bug in the structural story path and restores SKILL/
execution fidelity. Needed before the capability regression harness
(I-050) can mechanically exercise every structural operation.

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
**Status:** ✅ Resolved (2026-04-21, v0.6.0) — sub-task branch of
`pat.schema.json` already in place; I-042's lifecycle reshuffle
wired `generate-pats` to produce `<sub-task-id>.pat.yaml` per
sub-task with `parent-story:` + `component:` anchoring. Retires
markdown PAT stubs.
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
**Status:** ✅ ADD / REMOVE / RENAME shipped — ADD (v0.12.0, 2026-05-02), REMOVE (v0.12.1 → bundled into v0.13.0, 2026-05-06), RENAME (v0.14.0, 2026-05-06). RENAME is the first structural verb to ship without schema changes; the symmetric two-AC PAT (new name reachable + old name unreachable) composes existing v0.11.0 / v0.12.x verbs. ADD + REMOVE were demonstrated end-to-end against the live workshop testbed (TODOM-S02 + TODOM-S03); RENAME L4/L5 evidence is filed against TODOM-S04 (post-restoration of the metrics component). MERGE / SPLIT / PORT-CHANGE / TYPE-CHANGE remain deferred to v0.14.x as separate items per the same locked-design-then-impl pattern. See CHANGELOG v0.12.0 / v0.13.0 (REMOVE) / v0.14.0 (RENAME).

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

### Locked design (v0.12.0 ADD)

Locked 2026-05-01 ahead of v0.12.0 implementation. v0.12.0 ships ADD
only; other structural verbs follow as separate items.

1. **No structural tag.** A story is structural when its prose
   implies topology change. The agent reads the verbs ("add",
   "remove", "rename"…) — there is no `type: structural` flag, no
   front-matter, no auto-detection.
2. **Sub-task PAT for the new component only.** Existing components
   are unchanged by an ADD; they get no "no-behavior-change"
   sub-task PATs. The new component gets a sub-task PAT whose AC is
   `/health` returns 200 + `ok`.
3. **v0.12.0 scope = ADD only.** REMOVE has the in-flight-story
   policy problem; RENAME has cross-repo rewire complexity; MERGE
   and SPLIT compound both. Bundling them inflates risk for no gain.
   Each becomes its own v0.12.x item.
4. **Story-level PAT shape:** a single AC using
   `http: GET http://<new-component>:<port>/health` +
   `expect-status: 200` + `expect-body-contains: "ok"`. Direct chain
   from v0.11.0's HTTP step types into v0.12.0's structural assertion.

### Resolution direction — two-phase decompose-story

The chicken-and-egg between `scaffold-repo` (needs sub-task markdown
+ sub-task PAT) and `decompose-story` (refuses to mutate
`project.yaml` until the new repo exists) is resolved by splitting
`decompose-story` into two callable phases:

- **Phase A** — sub-task authoring (Steps 1–3). No SCM calls, no
  `project.yaml` mutations. Output identical for business and
  structural stories.
- **Phase B** — structural mutations (S-1: project.yaml, S-2:
  topology artefact regeneration). No-op for business stories.

For ADD orchestration:

```
decompose-story --phase=a   → sub-task markdown, readiness tracker
generate-pats                → story PAT + sub-task PATs
scaffold-repo (new comp)     → uses new sub-task + PAT to seed repo
decompose-story --phase=b   → mutate project.yaml + regenerate
compile-story-pats           → integration-gate MR
```

For business stories the orchestration collapses to the existing
`decompose-story → generate-pats → compile-story-pats` chain — Phase
B no-ops at the end of the unphased call. No behaviour change for
non-structural callers.

The phase-split pattern generalises to RENAME / MERGE / SPLIT (same
"target repo must exist" precondition); REMOVE has no precondition
and uses the unphased call.

See `.m/capabilities/decompose-story/SKILL.md` "Phase boundary" and
"Order of operations for ADD-type structural changes" for the
canonical contract.

### Dependencies

- I-036 (project.yaml as live config, not just declaration)
- wire-orchestration capability (generates the wiring that needs updating)
- scaffold-repo capability (creates new components)

### Impact

Without this, adding a component to a live M project requires manual
updates to 10+ files/configs with no guidance from the methodology.
This is the kind of gap that causes "it works for the demo but breaks
in production" failures

### Locked design (v0.12.x REMOVE)

Locked 2026-05-02 ahead of v0.12.x REMOVE implementation. Builds on
the v0.12.0 ADD locked design above; only the deltas REMOVE forces
are spelled out here.

**1. Scope.** Pure REMOVE only — the to-be-removed component must
have no active callers in the current topology. This is **M's
verifiability invariant**, not a safety net: a structural change
must be verifiable as a structural change. Removing a component
that is actively called would break callers — that's a behaviour
change in the callers, which has its own ACs and its own gate.
Bundling the two means the structural-ness of the change is no
longer verifiable in isolation; the gate would conflate "topology
shrank" with "callers correctly handle the removal," and a green
gate would not prove either independently.

The discipline this enforces: developers must first ship a prep
story that either **adds the replacement** the new caller needs OR
**removes the active use** of the to-be-removed component. Once
the topology shows zero active callers, the REMOVE story decomposes
cleanly — its only proof obligation is "the smaller composed system
still works," which the regenerated topology aliveness probes +
existing CATs + the negative-existence story PAT (see (4)) verify
end-to-end.

REMOVE-with-callers is therefore **rejected at decompose-story
Step 2** with a guidance message naming the callers and
recommending the prep-story split. See (7) for the pre-flight scan
shape.

**2. Phase orchestration.** REMOVE uses the **unphased call** —
already specified in `decompose-story` SKILL "Phase boundary" /
"Preconditions". REMOVE has no precondition (M's view of the project
IS `project.yaml`; once a component is removed from yaml, M no longer
cares whether the actual GitLab repo exists). One call:
`decompose-story → generate-pats → compile-story-pats`. Same shape
as ADD orchestration, minus the inter-phase scaffold-repo step.

**3. Sub-tasks.** A pure REMOVE has **zero managed-repo sub-tasks**
because there is no managed-repo work — the change is entirely in
`project.yaml` + the renderer regenerating topology files. The
readiness tracker is generated with `components: []`. The merge-
transaction's completeness gate is vacuously satisfied (zero
sub-tasks to wait on); the per-AC gate proof is carried by the
story-level PAT (see (4)) and the regenerated topology probes.
`pat.schema.json` for the readiness tracker must allow empty
`components:` — currently does not (`minItems: 1` per readiness
tracker schema, if any). The schema relaxation is part of this ship.

**4. Story-level PAT shape — `expect-unreachable`.** Direct chain
from v0.11.0's HTTP step types: REMOVE introduces one new step
verb that asserts the negative-existence of the removed endpoint.
The PAT shape mirrors ADD's symmetry:

```yaml
acceptance:
  - id: AC-001
    when: The composed system is up after metrics is removed
    then: GET /health on the previously-existing metrics endpoint is unreachable
    steps:
      - http: "GET http://metrics:3004/health"
      - expect-unreachable
```

The `expect-unreachable` verb passes if the preceding `http:` either
(a) failed at the network layer (DNS failure, connection refused,
timeout — all expected outcomes when a service is no longer in the
docker network) OR (b) returned a 5xx. It fails if the request
returned 1xx/2xx/3xx/4xx — those would mean *something* answered,
which contradicts "the component is gone."

The cypress provider absorbs the new verb the same way it absorbed
v0.11.0's three HTTP verbs: one new entry in the `step` `oneOf`
of `pat.schema.json`, one new `$def` (`step-expect-unreachable`),
one new case in `cypress.mjs`'s `compileStep` switch. The
implementation note (out of scope for this design): `cy.request`
throws on network errors before any chained `.then` runs, so the
compile target for `expect-unreachable` cannot reuse the
`cy.request(...).as('lastResponse')` pattern. Likely shape: compile
the `http:` + `expect-unreachable` pair atomically into a single
`cy.then(async () => { try { await fetch(...) ... } catch { ... } })`
block (fetch is available in cypress's browser context and surfaces
network errors as catchable promise rejections). This is the only
real implementation puzzle in this ship; design-wise the verb is
straightforward.

This eliminates the connection-refused fragility of the
"naive negative-existence" approach: we are not asserting that a
specific port is closed, we are asserting that a *named endpoint
that used to exist now does not respond*. Same assertion shape as
ADD ("the named endpoint we just added now responds with X") —
just inverted. Symmetric, principled, no sentinels.

`generate-pats` produces the REMOVE story PAT the same way it
produces any other one-AC story PAT — no special-casing needed
beyond the new step verb being available in the schema.

**5. Historical CAT cleanup.** The gate MR bundle includes
**deletion of historical compiled CATs that probe the removed
component**. Identified by a static scan over `pats/*.cy.js` for
references to the removed component's name or port. The
corresponding PAT yaml + readiness tracker for those historical
stories stay on main as audit trail; only the compiled `.cy.js`
files are removed (cypress's `**/*.cy.js` glob would otherwise
keep running them and they would fail forever against the smaller
topology).

The static scan is a `grep` shape, intentionally simple. False
positives (a CAT that mentions the component name in a comment but
doesn't actually probe it) are acceptable; the worst case is a
reviewer adds the CAT back in a follow-up PR. False negatives (a
CAT that probes the component via an indirect alias) are unlikely
in practice because the absorbed-cypress provider compiles
`http: GET http://<name>:<port>/...` to literal strings in the
`.cy.js` output.

**6. Managed repo + orchestration leftovers — bounded scope.** M
does not delete the GitLab managed repo, its webhook to root, its
`M_TRIGGER_TOKEN` / `ROOT_PROJECT_ID` CI variables, or its branch
protection — those are user decisions outside M's view. **But** the
default behaviour without intervention is more than just noise: the
orphan repo's webhook continues to fire root's trigger endpoint on
every MR event, and root's `detect-story-trigger.sh` does not gate
on the trigger source. If any other active story MR exists on the
current topology when the orphan webhook fires, the orphan trigger
gets classified as `story` mode and a spurious `shadow:compose`
runs (consuming CI minutes, posting no-op status updates). That's
mildly worse than noise.

**Mitigation in this ship — source-repo guard.** Add a 5-line check
to `scripts/detect-story-trigger.sh`: if the trigger source
(`SOURCE_PROJECT_PATH`) is not in the current `REPOS` list, set
`TRIGGER_MODE=standalone` and skip downstream shadow work. This
eliminates spurious shadow runs from orphan webhooks entirely, with
no managed-repo cleanup required. Lives in the regenerated
`detect-story-trigger.sh` template (`ci/gitlab.mjs` provider) so
it's idempotent and applies to every project that re-renders.

**Out of scope.** Actual webhook + CI variable + branch-protection
cleanup on the orphan repo is filed as a follow-up
(`unwire-orchestration` capability, see Dependencies below). Strictly
optional; the source-repo guard above closes the only operational
gap. Users who want a tidy GitLab can do the cleanup manually or
wait for the follow-up capability.

**7. Caller pre-flight check at decompose-story Step 2.** Before
proposing the AC mapping, the agent scans:

- `project.yaml` `components[].location` for any reference to the
  to-be-removed component (none expected — locations are independent).
- The current `pats/*.pat.yaml` and `pats/*.cy.js` on root for
  references to the to-be-removed component's name or port.
- Each managed repo's `pats/*.pat.yaml` (cheap — already cloned for
  any non-trivial story work).

If any caller is found, decompose-story refuses to proceed and
prints a guidance message naming the callers and recommending the
prep-story split.

### Worked example (TODOM-S03 — "remove the metrics component")

For the upcoming evidence run:

1. `decompose-story` reads `TODOM-S03.md` ("remove the metrics
   component"), runs caller pre-flight (passes — metrics has no
   callers in the current topology after v0.12.0 ADD: scan finds no
   PAT yaml or `.cy.js` referencing `metrics` or port `3004` outside
   `pats/TODOM-S02.*`, which is the ADD's own gate spec and is
   handled in step 3 below). Proposes an empty sub-task list, gets
   confirmation, writes the readiness tracker with `components: []`,
   mutates `project.yaml` to drop the metrics entry + drops
   `http://localhost:3004/health` from
   `compose.integration.health.endpoints`, and runs the renderer to
   regenerate the four topology files (one fewer service in
   docker-compose, one fewer probe in integration-test.sh, one fewer
   clone in .gitlab-ci.yml, one fewer entry in
   report-shadow-status.sh + detect-story-trigger.sh — including the
   new source-repo guard from (6)).
2. `generate-pats` produces the story PAT
   `pats/TODOM-S03.pat.yaml`:
   ```yaml
   story: TODOM-S03
   version: 1
   acceptance:
     - id: AC-001
       when: The composed system is up after metrics is removed
       then: GET /health on the previously-existing metrics endpoint is unreachable
       steps:
         - http: "GET http://metrics:3004/health"
         - expect-unreachable
   ```
3. `compile-story-pats` compiles the PAT to
   `pats/TODOM-S03.cy.js` via the cypress provider (the new
   `expect-unreachable` step compiles to a fetch-with-catch block).
   Runs the historical-CAT scan, finds `pats/TODOM-S02.cy.js`
   references `metrics:3004`, includes its deletion in the bundle,
   and pushes the bundle to root MR
   `feat/TODOM-S03d-integration-gate`:
   - `project.yaml` (mutated)
   - `docker-compose.yml`, `.gitlab-ci.yml`, `scripts/integration-
     test.sh`, `scripts/report-shadow-status.sh`,
     `scripts/detect-story-trigger.sh` (regenerated, incl. source-
     repo guard)
   - `stories/TODOM-S03.yaml` (readiness tracker, empty components)
   - `pats/TODOM-S03.pat.yaml` + `pats/TODOM-S03.cy.js` (new)
   - `pats/TODOM-S02.cy.js` (DELETED — historical CAT for the
     now-gone metrics)
4. Root MR pipeline runs `validate:compose` against the smaller
   topology. Topology probes 4/4 pass (was 5/5; metrics probe gone).
   `validate:integration-test` no-op as today. Pipeline green.
   L4 evidence: local `cypress/included` run executes the new
   TODOM-S03 spec — `expect-unreachable` passes against the
   removed `metrics:3004` (DNS failure inside the smaller compose
   network). Plus TODOM-000 regression 6/6 pass.
5. Squash-merge the gate MR. Topology on main reflects the smaller
   shape. The orphan `todo-m-metrics` repo on GitLab continues to
   exist; future MR webhooks from it now classify as standalone
   thanks to the source-repo guard, so no spurious shadow runs.
   The user archives or deletes the repo on their own schedule.

### Implementation deltas vs v0.12.0 ADD

| Capability | Change for REMOVE |
|---|---|
| `decompose-story` SKILL | Caller pre-flight check at Step 2 (hard reject on active callers — see (1), (7)); readiness tracker allowed `components: []` for REMOVE |
| `pat.schema.json` | (a) Add `expect-unreachable` to the `step` `oneOf` + new `$def` `step-expect-unreachable`; (b) allow empty `components:` array on the readiness tracker schema |
| `generate-pats` | No change — produces the REMOVE story PAT the same way it produces any other one-AC story PAT, just using the new step verb |
| `.m/providers/test/cat/cypress.mjs` | New compile case for `expect-unreachable`. Implementation note: must compile the `http:` + `expect-unreachable` pair atomically (cy.request throws on network errors before chained `.then` runs). Likely shape: a single `cy.then(async () => { try { await fetch(...) } catch { ... } })` block using the browser's fetch + AbortSignal.timeout |
| `.m/providers/test/cat/cypress.test.mjs` | Regression coverage: `expect-unreachable` passes on DNS failure, passes on connection refused, passes on 5xx, fails on 2xx/3xx/4xx, and the mixed-AC case (browser + `expect-unreachable` in one `it()`) |
| `compile-story-pats` | Historical-CAT scan + deletion in bundle (grep over `pats/*.cy.js` for the removed component's name + port) |
| `render-topology-artefacts` | No change — purely a function of `project.yaml` |
| `.m/providers/ci/gitlab.mjs` | Source-repo guard added to the rendered `detect-story-trigger.sh`: `if SOURCE_PROJECT_PATH ∉ REPOS → TRIGGER_MODE=standalone; exit`. Idempotent template change — applies to every project that re-renders. Regression test on the rendered script |
| `wire-orchestration` | No change in v0.12.x REMOVE; future `unwire-orchestration` filed as follow-up |

### Dependencies + follow-ups

- Filed for follow-up (post-v0.12.x REMOVE): **I-061** —
  `unwire-orchestration` capability that mirrors
  `wire-orchestration` for managed-repo decommission (delete
  webhook, delete CI variables, optionally archive/delete repo).
  Strictly optional after the source-repo guard from (6) — the
  guard closes the only operational gap.
- Filed for follow-up: **I-062** — historical-CAT scan as a shared
  utility (currently only used by REMOVE; RENAME may want a
  variant that rewrites instead of deletes).

### Sizing

**S** — same as ADD. No new design surface beyond the deltas above;
each delta is mechanical and small. The `expect-unreachable`
compile target (fetch-with-catch wrapper) is the only nontrivial
implementation puzzle and even that is well-bounded. Most of the
work is the caller-preflight scan, the new step verb (schema +
provider + tests), the historical-CAT delete, the source-repo
guard. Plus L4/L5 evidence for TODOM-S03 against the workshop.

### Locked design (v0.14.0 RENAME)

**Status:** DRAFT — review before impl.

Locked 2026-05-06 ahead of v0.14.0 RENAME implementation. Builds on
the v0.12.x ADD + REMOVE locked designs above; only the deltas
RENAME forces are spelled out here.

**1. Scope.** Pure RENAME — change a component's `name` field (and
the symbolic identifiers derived from it: docker service name,
hostname in URLs, REPOS list entry, fan-out list entry). Component's
`location`, `port`, `role`, `type`, `tag` are **preserved**.
Renaming the GitLab repo at `location` is a *separate operation* the
user does outside M; methodology RENAME is purely a yaml-side
rebadge. If the user wants both, they run RENAME plus their own
`gitlab project rename` step out of band.

The structural-ness of RENAME is "the topology now refers to the
component by a new name." Source-code references to the old name
inside managed repos are **callers** — same shape as REMOVE callers.
Per M's verifiability invariant: a structural change must be
verifiable as structural in isolation; bundling caller-rewrites
with a name change conflates topology rebadge with code rewrite.

RENAME-with-callers is therefore **rejected at decompose-story
Step 2** with a guidance message naming the callers and
recommending a prep-story split (update callers to indirect via a
config indirection, then RENAME, then optionally clean the
indirection in a follow-up). Same discipline as REMOVE.

Compiled CATs on root (`pats/*.cy.js`) referencing the old name are
**not callers** — they are AOT artefacts, regenerable from PAT yaml
+ topology. They are rewritten in the gate MR bundle, not used as
rejection signals. PAT yamls on root (`pats/*.pat.yaml`) are
**audit trail** — they are *not* rewritten and *not* used as
rejection signals. The compiled `.cy.js` will diverge from its
source `.pat.yaml` after RENAME; that divergence is intentional and
documented in the gate MR description.

**2. Phase orchestration.** RENAME uses the **unphased call** —
same as REMOVE. The renamed component already exists at the
preserved `location`; M's view of the project is `project.yaml`,
and a name change inside yaml needs no `scaffold-repo` step. One
call: `decompose-story → generate-pats → compile-story-pats`.

**3. Sub-tasks.** A pure RENAME has **zero managed-repo sub-tasks**
— the change is entirely in `project.yaml` + the renderer
regenerating topology files. Same readiness-tracker `components: []`
shape as REMOVE; same vacuous merge-transaction completeness gate;
same per-AC gate proof carried by the story-level PAT plus the
regenerated topology probes.

**4. Story-level PAT shape — symmetric two-AC composition.** RENAME
introduces **no new step verbs**. The PAT composes verbs already
shipped in v0.11.0 (HTTP) and v0.12.x (`expect-unreachable`):

```yaml
acceptance:
  - id: AC-001
    when: The composed system is up after metrics is renamed to telemetry
    then: GET /health on the new name (telemetry) returns 200
    steps:
      - http: "GET http://telemetry:3004/health"
      - expect-status: 200
      - expect-body-contains: "ok"
  - id: AC-002
    when: The composed system is up after metrics is renamed to telemetry
    then: GET /health on the previously-existing name (metrics) is unreachable
    steps:
      - http: "GET http://metrics:3004/health"
      - expect-unreachable
```

This is the first structural verb that ships **without schema
changes**. RENAME's expressiveness falls out of the existing verb
set. `generate-pats` produces the two-AC PAT the same way it
produces any other; `compile-story-pats` compiles via the existing
cypress provider absorption. Worth calling out in the release notes
as evidence the verb-absorption strategy from v0.11.0 generalises.

**5. Historical CAT cleanup — rewrite, not delete.** Where REMOVE
deletes compiled CATs that reference the gone component, RENAME
**rewrites them in place** so they continue to run against the
renamed component. The scan finds `pats/*.cy.js` files matching
`<old-name>:<port>` (and the bare token `<old-name>` where it is a
docker service identifier — distinguishable by surrounding context;
when in doubt, the rewrite is the safe direction because the old
identifier is no longer in the topology). Each match has the
identifier replaced with `<new-name>`, and the rewritten file is
included in the gate MR bundle as a `update` action.

Source PAT yamls on root (`pats/*.pat.yaml`) are **not rewritten**.
They preserve the original story's wording (which referenced the
component by its name at the time the story shipped). The compiled
`.cy.js` and the source `.pat.yaml` diverge after RENAME — this is
intentional and the divergence is the audit trail. A reader
following provenance from `.cy.js` to `.pat.yaml` to the merged
gate MR sees the rename event in the history and can reconcile.

**6. Historical-CAT scan extracted to a shared utility (closes
I-062).** The inline grep that REMOVE shipped in
`compile-story-pats`'s bundle assembly is extracted to
`.m/capabilities/_lib/historical-cat-scan.mjs`. Two operations:

- `findReferencing(rootDir, terms[])` → returns matching
  `pats/*.cy.js` files. Used by REMOVE for deletion.
- `rewriteReferencing(rootDir, oldTerm, newTerm)` → returns
  matching files **and the rewritten content** for each. Caller
  decides whether to push the rewrites (RENAME) or ignore them.

This is the second-caller extraction the I-062 design block
forecast. With RENAME's contract clarified, the abstraction is no
longer premature.

**7. Caller pre-flight check at decompose-story Step 2.** Extends
the REMOVE pre-flight (which only scanned root) to also scan
managed-repo source files. Specifically:

- **Root `pats/*.pat.yaml`** for references to the old name. A
  match here is a stale audit-trail concern, **not** a hard reject
  — the user gets a warning that historical PAT yamls reference
  the old name; the corresponding `.cy.js` files will be rewritten
  to use the new name, creating documented divergence.
- **Each managed repo's source files** matching
  `*.{js,jsx,ts,tsx,mjs,cjs}` outside `node_modules/` and `dist/`
  for `<old-name>:<port>` or `http://<old-name>` literal patterns.
  A match here is a **hard reject** — these are real callers; the
  rename would break them. Guidance message names the matching
  files and recommends a prep story.
- **Each managed repo's `pats/*.pat.yaml`** for `<old-name>:<port>`.
  A match is a **hard reject** — the managed-repo PAT yaml feeds
  scaffold-repo / generate-acceptance-tests, and stale references
  would compile to broken CATs at the next regeneration.

The pre-flight is reused via the shared utility from (6); the only
new work is the file-glob discovery for managed repos.

**8. project.yaml mutation shape.** Single key change inside the
component's entry:

```yaml
- name: metrics    →    - name: telemetry
  type: referenced       type: referenced
  location: ...          location: ...    # preserved
  port: 3004             port: 3004        # preserved
  ...                    ...
```

The renderer regenerates `docker-compose.yml`,
`scripts/integration-test.sh`, `.gitlab-ci.yml`,
`scripts/report-shadow-status.sh`, and
`scripts/detect-story-trigger.sh` — each picks up the new name
from yaml. No new renderer logic.

**9. compose.integration.health.endpoints update.** If the
endpoints list contains `http://localhost:<port>/...` entries that
reference the old name elsewhere (none expected — endpoints
typically reference `localhost`, not the docker service name), no
change. If the endpoints list does reference the docker service
name, the renderer rewrites consistently.

### Worked example (TODOM-S04 — "rename `metrics` to `telemetry`")

For the upcoming evidence run (post v0.13.0; restored after v0.12.x
REMOVE deleted metrics — assumes a prep ADD story re-adds metrics
under the original name first, OR runs against a fresh fixture
that still has metrics):

1. `decompose-story` reads `TODOM-S04.md` ("rename the metrics
   component to telemetry"), runs caller pre-flight:
   - Root `pats/*.pat.yaml`: scan finds `pats/TODOM-S02.pat.yaml`
     references `metrics:3004`. **Warning printed**, not rejected.
   - Managed repos: assume scan finds zero references in source.
     **Pass.**
   - Managed-repo PAT yamls: assume scan finds zero. **Pass.**
   Proposes empty sub-task list, gets confirmation, writes the
   readiness tracker with `components: []`, mutates `project.yaml`
   to set `name: telemetry` on the matching component, and runs the
   renderer to regenerate the four topology files.
2. `generate-pats` produces the story PAT
   `pats/TODOM-S04.pat.yaml` with two ACs (AC-001: telemetry
   reachable; AC-002: metrics unreachable).
3. `compile-story-pats` compiles the PAT to
   `pats/TODOM-S04.cy.js` via the cypress provider (no new step
   verbs; both ACs use existing absorption). Calls the new
   historical-CAT utility:
   - `rewriteReferencing(root, "metrics", "telemetry")` returns
     `pats/TODOM-S02.cy.js` with `metrics:3004` → `telemetry:3004`.
   - The rewritten `pats/TODOM-S02.cy.js` is included in the bundle
     as an `update` action.
   - `pats/TODOM-S02.pat.yaml` is **not touched** (audit trail).
   Pushes the bundle to root MR `feat/TODOM-S04d-integration-gate`:
   - `project.yaml` (mutated)
   - `docker-compose.yml`, `.gitlab-ci.yml`,
     `scripts/integration-test.sh`,
     `scripts/report-shadow-status.sh`,
     `scripts/detect-story-trigger.sh` (regenerated)
   - `stories/TODOM-S04.yaml` (readiness tracker, empty components)
   - `pats/TODOM-S04.pat.yaml` + `pats/TODOM-S04.cy.js` (new)
   - `pats/TODOM-S02.cy.js` (REWRITTEN — was probing `metrics:3004`,
     now probes `telemetry:3004`; original `pats/TODOM-S02.pat.yaml`
     unchanged on main)
4. Root MR pipeline runs `validate:compose` against the renamed
   topology. Topology aliveness probes pass (probe count unchanged
   — same component count, just renamed). `validate:integration-
   test` no-op as today. Pipeline green. L4 evidence: local
   `cypress/included` run executes the new TODOM-S04 spec — AC-001
   reaches `telemetry:3004`, AC-002 confirms `metrics:3004` is
   unreachable. Plus TODOM-S02 (now rewritten to probe telemetry)
   regression passes. Plus TODOM-000 regression 6/6 pass.
5. Squash-merge the gate MR. Topology on main reflects the renamed
   component. Audit trail preserved: `pats/TODOM-S02.pat.yaml`
   still says `metrics:3004` in plain words (frozen at the time of
   that story); `pats/TODOM-S02.cy.js` now references
   `telemetry:3004` because that is what the topology now exposes.
   The git history of the gate MR is the bridge between them.

### Implementation deltas vs v0.12.x REMOVE

| Capability / file | Change for RENAME |
|---|---|
| `decompose-story` SKILL | Pre-flight scan extended to managed-repo source files + managed-repo PAT yamls (hard reject). Root PAT yaml warning (not reject). Same Step 2 location as REMOVE; same hard-reject-with-guidance shape |
| `pat.schema.json` | **No change.** RENAME's PAT shape uses only verbs already in the schema (`http:`, `expect-status`, `expect-body-contains`, `expect-unreachable`) |
| `generate-pats` | **No change** — produces the two-AC RENAME PAT the same way it produces any other multi-AC story PAT |
| `.m/providers/test/cat/cypress.mjs` | **No change** — both ACs compile through existing absorption |
| `.m/capabilities/_lib/historical-cat-scan.mjs` | **NEW** — extracts the inline grep from `compile-story-pats`'s REMOVE bundle assembly. Exposes `findReferencing` (REMOVE) + `rewriteReferencing` (RENAME). Closes I-062 |
| `compile-story-pats` SKILL | Bundle assembly invokes the shared utility for REMOVE (find-for-deletion) and RENAME (find-for-rewrite, push as `update` actions) |
| `compile-story-pats` SKILL | New "RENAME bundle assembly" subsection mirroring the existing "Structural REMOVE stories only" subsection |
| `render-topology-artefacts` | **No change** — purely a function of `project.yaml`; new name in yaml → all derived files use new name |
| `wire-orchestration` | **No change** — managed-repo wiring uses GitLab project IDs, not component names; webhooks survive a name change at the methodology layer |

### Dependencies + follow-ups

- Depends on **I-063** (`scm.delete_file` MCP primitive — locked
  below) for the gate MR bundle's mixed-action push: RENAME's bundle
  is all `update` actions (no deletes), but the historical-CAT
  utility surfaces both shapes; the cleaner provider contract from
  I-063 lands the unified `actions[]` payload.

### Sizing

**S–M.** Smaller than REMOVE (no new step verbs, no schema
changes). Most of the work is:

- The pre-flight scan extension (managed-repo source + PAT yamls)
- The shared utility extraction (closes I-062)
- The `update`-style bundle assembly (vs REMOVE's `delete`)
- Plus L4/L5 evidence for TODOM-S04 against the workshop

The cypress absorption story is "we already shipped this in v0.11.0
+ v0.12.x" — RENAME consumes the existing surface.

### Out of scope for v0.14.0 RENAME

- **MERGE / SPLIT / PORT-CHANGE / TYPE-CHANGE.** Each has its own
  design surface (combinations of ADD+REMOVE, port-only changes
  with no name change, embedded↔referenced flips). Filed as
  separate v0.14.x items per the same locked-design-then-impl
  pattern.
- **Renaming the GitLab repo at `location`.** User-side operation
  outside M's view. Methodology RENAME is purely yaml-side rebadge.
- **Auto-deletion of orphan name references** in managed-repo
  source code. Pre-flight rejects RENAME-with-callers; we do not
  attempt to rewrite real callers. That is a behaviour change with
  its own ACs, not a structural change.


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


---

## I-042: Reshuffle decompose-story and generate-pats — decomposition first, PATs second, parent story always in scope

**Category:** Methodology / capability lifecycle
**Priority:** High (blocks I-038's resolution; root cause of PAT stubs)
**Status:** ✅ Resolved (2026-04-21, v0.6.0) — lifecycle reshuffled to
decompose-story → generate-pats → compile-story-pats. Old Step 4 of
decompose-story extracted to new `compile-story-pats` capability
backed by a new `test.cat.*` provider namespace (`cypress` + `log-only`
reference providers). Side discovery during implementation: PAT yaml
step grammar was not valid yaml; `pat.schema.json` patterns and the
workshop PAT fixtures rewritten to yaml-valid Option-B format. Also
closes I-038.
**Discovered:** 2026-04-13

### Problem

Current order is `generate-pats` → `decompose-story`. This means:

1. PATs only exist at story level when decomposition runs
2. Sub-task PATs cannot be produced because the AC→component mapping
   is established *during* decomposition, not before it
3. `decompose-story` emits markdown PAT stubs as a placeholder — which
   is the I-038 problem in physical form
4. There is no clean way to introduce sub-task PAT generation without
   either inverting the order or making `generate-pats` awkwardly
   level-aware

The lifecycle has a gap: sub-task PATs *should* be produced, but no
capability is positioned to own that step. Adding the feature requires
restructuring, not extension.

### Proposal

Reverse the order. `decompose-story` runs first on the story prose
alone; `generate-pats` runs second with the decomposition in hand.

1. **decompose-story** — reads the story markdown alone. Identifies
   components touched and AC→component mapping from the story prose
   (not from a pre-existing PAT YAML). Produces sub-task markdown
   files. Handles structural changes if present (project.yaml edit +
   topology artefact regeneration). No PAT generation, no compilation.

2. **generate-pats** — reads the enriched story + all sub-task
   markdown files. Produces, in one capability run:
   - `<story-id>.pat.yaml` — the parent contract
   - One `<sub-task-id>.pat.yaml` per sub-task — a repo-scoped
     projection of the story PAT, anchored back to the parent

3. **Compile + raise root MR** — currently `decompose-story` Step 4.
   After the reshuffle this needs to move, because decompose no
   longer has PATs in hand. Options:
   - Stay in decompose-story but call generate-pats internally
   - Move to generate-pats as its final step
   - Extract to a new capability (e.g. `compile-and-gate`)

   Resolution is part of this item's implementation.

### Why the parent story must stay in scope during sub-task PAT generation

Sub-task PATs are not independent contracts. They are **projections
of the story PAT onto specific components**. The parent story is
their conceptual anchor, and `generate-pats` must keep it in scope
at all times when producing sub-task PATs. Reasons:

- **Coherence.** Two sub-task PATs in the same story must use
  consistent terminology, test data, and assumptions. Generated in
  isolation, they drift apart — same concept named differently in
  different repos. Parent-aware generation keeps them aligned.

- **Traceability.** Each sub-task PAT can declare `parent: <story-id>`
  and tag each AC with `derives-from: <story-AC-id>`, making the
  decomposition machine-readable. When the story PAT changes,
  sub-task PATs can be regenerated coherently from the new parent.

- **Single source of truth.** The story PAT is canonical. Sub-task
  PATs are derivations. If they conflict (e.g. the story says "list
  shows count" but the mfe sub-task drops the count assertion), the
  story wins and the sub-task is rejected. Parent-aware generation
  enforces this by construction.

- **Validation symmetry.** When a sub-task is implemented, its tests
  pass. When the story is integrated, the story PAT runs against
  the composed system. Both descend from the same anchor, so they
  should agree — and if they don't, the disagreement is information,
  not noise.

### Relationship to I-038

I-038 describes *what* sub-task PATs look like (YAML format, schema,
fields). This item describes *when and how* they are produced
(generate-pats, after decomposition, with parent in scope). Both
items together describe the full lifecycle. **This item is a
precondition for I-038's resolution.**

### Impact on existing capabilities

- **decompose-story** — Step 1-3 stay (read inputs, propose mapping,
  write sub-task markdown), but the input list shrinks: no longer
  reads `pat.yaml`. Step 4 (compile + raise root MR) moves elsewhere.
  The structural-stories handling section (S-1 to S-4) follows
  wherever Step 4 lands, since they extend the root MR push.
- **generate-pats** — gains sub-task awareness. Iterates over story
  + all sub-tasks, generating PATs at each level with parent in scope.
- **Workshop execution order** — any script or doc that sequences
  capabilities (`generate-pats` then `decompose-story`) needs updating.

### Effort

Medium. Touches two capabilities, their schemas (sub-task PAT format
from I-038), the workshop's execution scripts, and any documentation
that describes the M lifecycle. Not trivial but contained.

### Dependencies

- I-038 (sub-task PATs in YAML — completes after this lifecycle fix)
- decompose-story capability (current home of PAT compilation, Step 4)
- generate-pats capability (gains sub-task awareness)


---

## I-045: Extend PAT yaml to support multi-framework assertions

**Category:** Methodology / PAT schema
**Priority:** Medium
**Discovered:** 2026-04-13, during structural story test (TODOM-S01)
**Status:** ✅ Resolved in v0.11.0 (2026-04-26). PAT yaml gains three
new step verbs (`http`, `expect-status`, `expect-body-contains`) and
the cypress provider absorbs them via `cy.request(...).as('lastResponse')`.
Single-provider absorption replaces the original "two providers + a
framework selector" plan — see *Methodology stance shift* below.

### Problem

PAT yaml's `acceptance.steps` schema is Cypress-shaped. Step types
(`navigate`, `click`, `type`, `assert` with `data-testid` selectors)
all assume a browser context. This works well for user-facing business
stories but is limiting for:

- **Structural stories** — adding/removing components has no
  user-facing assertion; the natural verification is "does the new
  component respond at /health?", which is an HTTP assertion, not a
  DOM assertion
- **Backend-only stories** — pure API behaviour assertions that don't
  involve a browser
- **Composability checks** — "does service X depend on service Y", or
  "does the compose file declare the new component as a build
  context", can't be expressed as browser actions

### Proposal

Extend the PAT yaml schema to support multiple step types tied to
different test frameworks:

| Step type | Compiles to | Use case |
|---|---|---|
| `navigate:`, `click:`, `type:`, `assert:` (existing) | Cypress | Browser-level UI behaviour |
| `http: GET /endpoint` | curl or supertest | API contract / health probe |
| `expect-status: 200` | curl or supertest | HTTP status check |
| `expect-body-contains: <string>` | curl or supertest | Response body assertion |
| `compose-service: <name>` | docker compose ps | Structural — service exists in compose |

The CAT compilation step in `decompose-story` (or `generate-pats`,
post-I-042) inspects the step types in each AC and chooses the right
framework. Mixed PATs (browser + HTTP) compile to multi-framework
specs — Cypress for the browser ACs, curl/supertest for the HTTP ACs.
Output paths are framework-aware:

- `pats/<story-id>.cy.js` for Cypress
- `pats/<story-id>.http.sh` (or `.spec.js` with supertest) for HTTP

### Relationship to Finding 6 from the TODOM-S01 test

Surfaced because the structural test exposed that compiling a
structural PAT to Cypress produces a meaningless spec — the regression
check from AC-001 doesn't verify the new component at all, and PAT
yaml has no native way to express "the new component responds at
/health". The structural section of `decompose-story` works around
this today by relying on the topology aliveness probe in
`scripts/integration-test.sh` (S-3), which is curl-based and lives
outside the PAT system.

That workaround is fine for ADD/REMOVE/RENAME/MERGE/SPLIT/PORT-CHANGE
in their pure forms, but it means the PAT system itself can't
articulate structural assertions. I-045 closes that gap so PAT yaml
becomes the single source of truth for "what this story asserts",
regardless of the framework needed to verify it.

### Dependencies

- I-042 (decompose-story / generate-pats reshuffle) — should land
  first, since the new `generate-pats` lifecycle is the natural place
  to handle multi-framework compilation
- I-038 (sub-task PATs in YAML) — same lifecycle change

### Effort

Medium. Touches: `pat.schema.json` (new step types), `decompose-story`
(or `generate-pats` post-I-042) compilation logic, and any
documentation describing the PAT format. The structural section of
`decompose-story` becomes simpler once I-045 lands — its CAT
compilation rules collapse into the standard PAT compilation flow.

### Methodology stance shift (v0.11.0)

The original proposal above sketched two new `test.cat.*` providers
(`curl`, `supertest`) and a framework selector in `compile-story-pats`
that would route per-step verb to the right runner, with mixed PATs
emitting two output files (`<story>.cy.js` for browser, `<story>.http.sh`
or `.spec.js` for HTTP).

v0.11.0 deliberately departs from that plan. Instead:

- **PAT step types stay framework-agnostic at the schema layer.** A
  step's verb names what it asserts, not what runs it.
- **The cypress provider absorbs HTTP via `cy.request`.** No parallel
  provider, no framework selector in the compiler, no per-AC `kind`
  tag, no two-output coordination. Mixed PATs compile to a single
  `.cy.js` end to end.
- **`compose-service:` is excluded.** The structural exit criterion
  is satisfied by `http:` + `expect-status:` alone (HTTP probe
  inside the PAT, the actually-missing piece). Compose-existence
  checks remain in the aliveness probe in `integration-test.sh`.
- **A standalone backend-only provider stays deferred.** `cy.request`
  doesn't need DOM nav but does still boot Cypress. The day a
  truly backend-only project arrives, a `curl`/`supertest`
  provider becomes pull-driven work.

Why this is better than the original two-provider plan: one runner,
one CI invocation, one output file, no per-step framework dispatch
in `compile-story-pats`. The "PAT yaml is the single source of
truth for assertions" narrative is preserved without paying a
provider-selection-architecture cost the MVP doesn't need.

### Changes in v0.11.0

- **`.m/schemas/pat.schema.json`** — three new entries in the `step`
  `oneOf`, three new `$defs`:
  - `step-http` (string, pattern `^(GET|POST|PUT|PATCH|DELETE) \S+( body '[^']*')?$`)
    — `<METHOD> <url>[ body '<json>']`. Body, when present, must
    be a valid JSON value embedded as a single-quoted scalar
    (JSON ⊂ JS, so it can be inlined directly into spec source).
  - `step-expect-status` (integer, 100–599) — assertion against
    the most recent http step's status.
  - `step-expect-body-contains` (string, no inner single quote) —
    literal substring match against the body of the most recent
    http step. Object bodies are stringified via `JSON.stringify`
    before matching, so authors include the JSON punctuation
    they expect (`"\"count\":0"`).

  Existing browser step types are untouched; existing PATs still
  validate without modification.

- **`.m/providers/test/cat/cypress.mjs`** — three new cases in the
  `compileStep` switch and three matching helpers (`compileHttp`,
  `compileExpectStatus`, `compileExpectBodyContains`). `compileHttp`
  emits the request-options form when a body is present (so the
  JSON body literal embeds directly as a JS object) and the
  shorthand `cy.request(method, url)` form otherwise; both call
  `.as('lastResponse')` so subsequent assertion steps can chain
  off `@lastResponse`. `compileExpectBodyContains` coerces the
  body to JSON text before substring match so object responses
  match cleanly.

- **`.m/providers/test/cat/cypress.test.mjs`** — new file. Closes
  the pre-existing gap where `cypress.md` referenced a regression
  suite that did not exist. 29 tests:
  - Output shape (path, mode, error cases).
  - All browser step verbs as a regression net.
  - All three new HTTP step verbs (positive cases, malformed
    rejection, escaping).
  - Mixed PAT (browser AC + HTTP AC) compiling to a single
    `.cy.js` with declared order preserved.
  - Determinism: same input → byte-identical output.

- **`.m/providers/test/cat/cypress.md`** — provider doc grows an
  HTTP steps mapping table, grammar notes (methods, URL forms,
  body, alias semantics, substring vs JSON-path), and the
  methodology-stance callout naming the single-provider absorption
  decision.

- **`docs/methodology.md`** — Section 5 PAT description updated
  to name the cypress provider as the handler for both browser
  and HTTP steps, retiring the "curl/supertest coming with I-045"
  forward-looking phrase.

- **`docs/roadmap.md`** — v0.11.0 entry rewritten to describe the
  absorption stance and the explicit `compose-service:` deferral.
  Sizing table updated (S, shipped). I-040's prior-phase callout
  in v0.12.0 reworded to point at HTTP step types rather than
  multi-framework compilation.

Migration note: none. PATs that use only the existing browser step
types validate and compile byte-identically. Authors who want HTTP
assertions add the new verbs to new ACs.

---

## I-052: `m init --user` — user-scope install for agent containers

**Category:** M CLI capability
**Tier:** 3 — Architecture and extensibility
**Discovered:** 2026-04-16, during Outpost ↔ M integration design discussion

### Problem

`m init` currently installs at **project scope** only:

- `.m/` goes in the target directory (`<target>/.m/`)
- Wrappers go in `<target>/.claude/steering/m-steering.md` and `<target>/.claude/skills/<name>/SKILL.md`
- The steering wrapper contains the relative string `Read and follow the canonical steering at .m/m.md.`, which resolves against the agent's cwd

That model is correct for **human-driven projects**: a developer opens a repo, runs `m init`, and M lives alongside the code. But it breaks down for **agentic consumers** like Outpost, where the methodology is best expressed as a property of the *agent*, not the *project*.

### Outpost's use case — why project-scope doesn't fit

Outpost runs agents (implementer, test-engineer, senior-reviewer, scrum-master, and a future BA role) inside disposable `hut` containers. Each agent is launched against a working copy of some repo that may or may not be M-type. The agent's job is to know M as a capability it brings with it — not to depend on the repo having been `m init`'d first.

Options considered:

1. **Run `m init` per project inside the container at launch time.** Fragile (fails on non-M projects), adds latency, requires the agent to decide whether to init or not, creates version skew between agent and project.
2. **Bake `m init` into the container image at project scope in a fixed directory, symlink on launch.** Fiddly. Multiple moving parts. Breaks when cwd changes.
3. **Bake M into the agent user's home at image build time.** Clean. Works regardless of cwd. Matches how Claude Code already resolves user-level skills and steering (`~/.claude/` is walked before project-level). Mirrors the way humans install global tools.

Option 3 is clearly right, and it's exactly what a `--user` scope flag enables.

### Proposed solution

Add a `--user` flag (or `--scope=user`) to `m init`:

```bash
m init --user
```

Semantics:

| Concern | Project scope (current) | User scope (new) |
|---|---|---|
| `.m/` location | `<target>/.m/` | `~/.m/` |
| Steering wrapper | `<target>/.claude/steering/m-steering.md` | `~/.claude/steering/m-steering.md` |
| Skill wrappers | `<target>/.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| Version file | `<target>/.m/.m-version` (existing) | `~/.m/.m-version` |
| Wrapper path inside `m-steering.md` | `Read .m/m.md` (relative → cwd) | `Read ~/.m/m.md` (absolute → home) |
| Bundled version source | Current CLI's bundled `.m/` | Same — `m init` always uses the bundled version it ships with |
| `m update` behaviour | Updates `<target>/.m/` to latest bundled | Updates `~/.m/` to latest bundled |

The bundled-version model already fits this cleanly: `m version` reports three versions (bundled, local config, npm), and per the existing design `m init` uses the bundled version and records it in the installed `.m/`. `--user` changes only *where* the installed copy lives — the versioning semantics are identical.

### Wrapper path — the key correctness fix

The current steering wrapper template is a static file at `cli/templates/claude/steering/m-steering.md`:

```markdown
# Methodology M — Claude Steering

Read and follow the canonical steering at `.m/m.md`.
```

The relative `.m/m.md` only works because project-scope installs put `.m/` in the cwd. For user scope, the agent's cwd is arbitrary (whatever repo it happens to be working on), so the path must resolve to the user's home.

The fix: make the wrapper a **template** rather than a static file, and have the generator in [`cli/src/lib/wrappers/claude.mjs`](cli/src/lib/wrappers/claude.mjs) substitute the correct path at generation time based on scope:

- Project scope → `.m/m.md` (relative, current behaviour preserved)
- User scope → `~/.m/m.md` (or the expanded absolute path)

This needs to be applied consistently to any other wrapper that references `.m/` by relative path. If the skill wrappers also contain internal `.m/` references, they need the same treatment.

### Scope marker in the version file

`m update` needs to know which scope it's updating. Two approaches:

1. **Implicit from cwd/home:** if `~/.m/.m-version` exists, update there when invoked from outside a project; if `<cwd>/.m/.m-version` exists, update the project. Ambiguous when both exist.
2. **Explicit marker in `.m-version`:** record `scope: user` or `scope: project` at install time. `m update` reads it and writes back to the same scope. `m update --user` forces user scope explicitly.

Option 2 is less ambiguous and self-documenting. Minor schema addition to the version file.

### Outpost integration (the consuming use case)

Once `--user` lands, the Outpost hut image Dockerfile becomes:

```dockerfile
RUN npm install -g methodology-m && m init --user
```

Pin the `methodology-m` version in the Dockerfile for reproducible builds. Bumping M in the hut image becomes a deliberate act: update the Dockerfile, rebuild the image, redeploy. This matches Outpost's existing release discipline.

All Outpost agents (Dev, QA, Reviewer, SM, BA) boot with M skills and `.m/m.md` available under the agent user's home. The agent reads them the same way it reads any other skill — no per-project setup, no conditional init logic, no version drift between agent and project.

### Scope of work

- `cli/src/commands/init.mjs` — parse `--user` / `--scope`, route `copyDistM` + wrapper generation to `$HOME` instead of `target`
- `cli/src/commands/update.mjs` — read scope marker from version file, update the correct `.m/`
- `cli/src/lib/version-file.mjs` — record and read scope
- `cli/src/lib/wrappers/claude.mjs` — templatise wrapper content, substitute path based on scope
- `cli/templates/claude/steering/m-steering.md` — convert to template with a `{{M_PATH}}` placeholder (or equivalent)
- `cli/src/lib/copy.mjs` — honour alternate target for `copyDistM`
- Tests covering both scopes
- Documentation — README or the methodology doc, describing when to use which scope

### Priority

Tier 3. Not blocking the M delivery loop (Tier 1/2 items still take precedence), but unblocks a concrete downstream consumer (Outpost) and generalises to any future agentic M consumer. Implementation is mechanically small — the surface area is a flag, a path substitution, and a scope marker.

### Related

- Outpost backlog #56 (M methodology injection — agents work M-native) depends on this.
- Outpost backlog #57 (BA agent) is the most M-dependent agent role and benefits most from user-scope install.
- Does not block Tier 1/2 M work — can land independently whenever the CLI has spare cycles.


---

## I-053: CI variable protection prerequisite — shadow pipeline silently breaks if root main is unprotected

**Category:** Methodology / wire-orchestration prerequisite
**Tier:** 3 — Documentation gap with a concrete reproduction path
**Discovered:** 2026-04-23, during L3 standalone-MR smoke test on todo-m-workshop

### Problem

`wire-orchestration` Step 4 stores `M_GROUP_TOKEN` and each
`M_TOKEN_*` as CI variables with `protected: true, masked: true` —
the right default for production M projects.

GitLab, however, exposes `protected: true` CI variables **only** to
pipelines running on protected refs. If the root repo's main branch
is intentionally unprotected (e.g. a testbed where the dev wants
force-push freedom), trigger pipelines run on ref `main` but with
every protected variable **silently inaccessible**.

Result: `shadow:detect-trigger` aborts immediately with `M_GROUP_TOKEN
not set — cannot query MRs, aborting classification` on the very first
trigger. Every downstream shadow job is skipped (missing dotenv
artifact). The whole v0.7.0/v0.8.0 trigger classification machinery is
dead-on-arrival without the variable being accessible.

The old hand-written pipeline didn't surface this because it used
`M_GROUP_TOKEN` only to push commit statuses, and early-exited on
empty `$SOURCE_PROJECT_ID` before ever needing the token. The v0.7.0
detect stage promotes the token from optional-for-statuses to
required-for-classification, so the missing-on-unprotected-ref
behaviour becomes load-bearing.

### What was silent

- No renderer-level surface to catch this — the renderer doesn't own CI
  variable provisioning.
- No capability-level check in `wire-orchestration` — the SKILL didn't
  document the precondition (fixed by this issue).
- GitLab itself doesn't flag the gap — the variable is happily
  configured, just not exposed at runtime.

Diagnosis required reading the failed detect-trigger job log. Without
that, the failure looks like a mysterious silent token miss.

### Fix in wire-orchestration SKILL (already applied in this issue's PR)

Added to Step 4:

> **Prerequisite — protected ref + protected variable.** GitLab exposes
> `protected: true` CI variables only to pipelines running on protected
> refs. If the root repo has intentionally-unprotected main, set both
> `M_GROUP_TOKEN` and every `M_TOKEN_*` with `protected: false,
> masked: true` instead. Token values are still redacted from logs.

Plus a "do not mix" warning — every shadow-pipeline variable must
agree on the protected flag.

### Candidate follow-ups (not in this issue's scope)

- **Capability-level check** — teach `wire-orchestration` to inspect
  the root repo's main-branch protection state before storing CI
  variables, and default `protected: false` if main is unprotected
  (plus emit a warning). Small code change; closes the silent-failure
  loop with runtime detection.
- **Provider contract** — `scm.store_ci_secret` could accept an
  `ensure_accessible: true` option that auto-decides the protected
  flag based on the target repo's branch protection. More invasive.

### Priority

Tier 3. One-line docs fix closes the immediate gap. The capability-level
check would be the full fix but isn't blocking — the SKILL note is
enough for humans + AI agents invoking `wire-orchestration`. Revisit
if we hit this again in a different guise.


---

## I-054: Standalone trigger pipelines hang in `manual` + burn CI minutes on skip-only containers

**Category:** Methodology / orchestration cost + UX
**Tier:** 4 — Polish. No functional impact, but visible.
**Discovered:** 2026-04-23, during L3 standalone-MR smoke test on todo-m-workshop

### Problem A — pipeline hangs in `manual`

`merge-transaction`'s rule on every trigger pipeline is:

```yaml
rules:
  - if: $CI_PIPELINE_SOURCE == "trigger"
    when: manual
```

GitLab rules are evaluated at pipeline-creation time using predefined
variables — they can't see dotenv artifacts produced by earlier jobs.
So there's no way to hide `merge-transaction` when
`TRIGGER_MODE=standalone`.

Result: every standalone trigger pipeline creates a `merge-transaction`
job in `manual` state that nobody will ever click. The pipeline's
overall status reads `manual` in the UI, looking incomplete. Functionally
fine (the managed-repo MR merges on its own CI; the trigger pipeline
is informational), but cosmetically noisy and it clutters the pipelines
list with waiting-for-action items that never action.

### Problem B — skip-gate overhead

Every gated `shadow:*` job (invalidate-status, compose,
integration-test, report-status, report-failure, fanout-failure) emits
a container that:

1. Pulls its image (`alpine:3.19` or `docker:latest`).
2. Runs `apk add --no-cache curl nodejs` in `before_script` (16
   packages, ~15s).
3. Executes the skip-gate at the top of `script:`.
4. Exits 0 in <1s because TRIGGER_MODE doesn't match.

A standalone trigger therefore burns ~15-30s × 5 containers (≈2–3 min
of CI wall-time, and all of it measured against the runner quota) just
to echo "skipping". Not free — but bounded.

### Why both problems share a root cause

GitLab's `rules:` keyword is the only place a job's entire existence
can be gated. `rules:` are static per-pipeline-creation. Dotenv
variables from `shadow:detect-trigger` are only visible via `needs:`,
which can skip a job's **script** but not its **creation**. So the
skip-gate is the best tool available — but it has both failure modes
above.

### Options

1. **Cancel the manual job programmatically.** Teach
   `shadow:detect-trigger` to POST to the pipeline's `merge-transaction`
   job to cancel/skip it when `TRIGGER_MODE != story`. Removes Problem A.
   Doesn't help Problem B (those jobs already ran). Requires the detect
   job to hold a CI API token with scope for manipulating the current
   pipeline — more surface area.

2. **Two-phase pipeline via `trigger:` child pipeline.** Make
   `shadow:detect-trigger` emit a child pipeline yaml (via
   `artifacts.reports.dotenv` + `trigger: strategy: depend`) that only
   contains the jobs relevant to the classified TRIGGER_MODE. Standalone
   → empty child pipeline → nothing runs. Story → full shadow pipeline.
   Solves both problems. Much more invasive — the renderer goes from
   one static `.gitlab-ci.yml` to a generator + child templates.

3. **Reduce per-job overhead.** Use a shared base image that already
   has curl + nodejs installed (instead of apk-installing on every
   job). Halves the skip-only CI cost but doesn't fix the manual-state
   hang.

4. **Accept it.** Standalone triggers are supposed to be rare; the
   cost is bounded; the hang is ugly but not harmful.

### Priority

Tier 4 — polish. Revisit if:
- Standalone triggers stop being rare (e.g. real projects with lots
  of hotfix / dep-bump MRs flooding the trigger pipeline list).
- CI quota on the workshop becomes a visible concern.
- Child-pipeline approach is attractive for another reason (e.g. finer
  control over story-vs-pipeline-failure fan-out).

Option 2 is the only one that solves both. Not worth the scope unless
there's a second reason.


---

## I-055: Bootstrap paradox — detect-trigger couldn't classify story MRs as active until gate MR merged

**Category:** Methodology / AOT classification
**Tier:** 1 — Core AOT correctness (shipped as v0.9.0)
**Status:** ✅ Resolved in v0.9.0 (2026-04-23). Classification now
treats live open-MR enumeration as the authority for active-story
state; readiness tracker on main is consulted only to filter out
follow-up MRs to already-completed stories. SKILL doc and
`ci/gitlab.mjs` both updated; regression tests added.
**Discovered:** 2026-04-23, during L4 story-E2E test on
todo-m-workshop. First sub-task MR (#7 on todo-m-api-read) fired
the root trigger pipeline, `shadow:detect-trigger` classified the
story as `standalone` despite the MR clearly referencing an active
story ID.

### Problem

Pre-v0.9.0 `detect-story-trigger.sh` classified a trigger as
`story` only if the readiness tracker `stories/<id>.yaml` was
present on `ref=main` with a non-completed status:

```sh
case "$STATUS" in
  "" | completed)
    # Tracker absent from main → skip. This was the bug.
    ;;
  *)
    STORY_ID="$candidate"
    TRIGGER_MODE="story"
    ;;
esac
```

But the tracker's normal development location is the gate MR's
branch (staged by `decompose-story`, bundled into the gate MR by
`compile-story-pats`) — **not** main. The tracker only reaches main
when the gate MR merges, which per `compile-story-pats` SKILL is
supposed to happen **after** the story is whole and verified:

> The root MR exists from the moment the story is decomposed.
> Shadow integration will see it in the completeness check. The
> compiled CAT will fail until all components implement their parts
> — this is correct behaviour. The gate is red until the story is
> genuinely complete.

Result: an unsatisfiable precondition. Story MRs can't be classified
as active until the tracker is on main, but the tracker doesn't reach
main until the gate MR merges, which is supposed to happen after the
story completes, which requires shadow integration, which requires
classification as active. Circular.

### Root cause

Two distinct concerns were conflated in the pre-I-055 design:

1. **Classification** — "is this MR part of an active story?" — which
   is a question about live SCM state (open MRs).
2. **Orchestration metadata** — "what are the constituents,
   high-water-marks, CAT reference?" — which the tracker provides
   for `merge-transaction`.

The tracker was being used for both. I-055 separates them: live
MR enumeration answers the classification question; the tracker
is a completion record + merge-transaction input, consulted only
when relevant.

### Fix (shipped in v0.9.0)

`detect-story-trigger.sh` now classifies based on LIVE open-MR
enumeration. For each candidate story ID extracted from open MRs
across the topology, the tracker on main is consulted ONLY to
detect follow-up MRs targeting already-completed stories:

- Tracker on main with `status: complete` → follow-up to a merged
  story → skip (standalone).
- Tracker absent from main → active story (the open MR IS the proof).
- Tracker on main with non-complete status → active story.

Symmetric treatment applies to the `EVENT_KIND=pipeline` branch —
a failing pipeline whose ref encodes an active story ID (where
"active" is defined as "not marked complete on main") triggers the
`pipeline-failure` fan-out.

### Changes in v0.9.0

- **`.m/providers/ci/gitlab.mjs`** — `renderDetectStoryTrigger`
  rewritten to reflect Option Y semantics. Classification-semantics
  comment block added to the generated script, locking the intent
  against silent reversion.
- **`wire-orchestration` SKILL** — "Detect stage — trigger
  classification" section expanded with an explicit Option Y
  paragraph explaining the new contract and the paradox it resolves.
- **`ci/gitlab.test.mjs`** — new regression suite `I-055 Option Y
  classification semantics` with five tests covering both the MR and
  pipeline paths + a preamble-presence test that guards the
  intent-narrating comment.

### Alternatives considered and rejected

- **Option A** (land the gate MR first to get tracker on main) —
  violates story-atomic merge: the CAT ships to main before any
  component has proven it satisfies the contract.
- **Option X** (detect-trigger reads tracker from open MR branches
  as well as main) — smaller code change but keeps the
  classification/metadata conflation. Retains the tracker as a
  classification input when it shouldn't be.
- **Option Z** (split gate MR into a quick declaration MR +
  integration-gate MR) — preserves all principles but pays a
  two-MR-per-story tax forever. Also leaves tracker-on-main as a
  classification input, which remains conflated.

Option Y is the cleanest because it resolves the conflation at
the source.

### Impact on dependent SKILLs

- **`decompose-story`** — unchanged. Still stages the tracker in
  the root working directory; still makes zero SCM calls.
- **`compile-story-pats`** — unchanged. Still bundles the tracker
  onto the gate MR branch. The tracker is in the MR because
  `merge-transaction` needs it there at completion time.
- **`wire-orchestration`** — classification description updated
  (see above) — no runtime behaviour change to this capability.

### Migration note

Any existing M-type project on v0.8.x needs to re-render
`scripts/detect-story-trigger.sh` from the v0.9.0 provider and push
it to root repo main. The workshop retrofit MR accompanying this
release demonstrates the procedure; see the v0.9.0 release notes.

## I-056: Pipeline-failure fan-out delivery — GitLab blocks pipeline-hook → trigger-endpoint calls (403)

**Category:** Methodology / AOT delivery mechanism
**Tier:** 1 — Core AOT correctness
**Status:** ✅ Resolved in v0.10.0 (2026-04-25). Pipeline-failure
delivery is now a `report-failure-to-root` CI job in `scaffold-repo`'s
managed-repo template, fired `when: on_failure` under CI job context
(no `X-Gitlab-Event: Pipeline Hook` header → no 403). The
`pipeline_events` webhook is gone from `wire-orchestration` —
one MR webhook per managed repo. Discovered 2026-04-24 during L4
workshop E2E (todo-m-workshop, three sub-task MRs open for
TODOM-001).

### Problem

`wire-orchestration` installs two webhooks per managed repo (I-032):

1. A `merge_request_events` webhook whose URL encodes
   `variables[EVENT_KIND]=mr` — fires on MR open/update/close.
2. A `pipeline_events` webhook whose URL encodes
   `variables[EVENT_KIND]=pipeline` — fires on every pipeline
   status change.

Both webhooks point at the **same** root-repo trigger endpoint with
the **same** trigger token. The MR webhook works as designed — each
delivery returns `201 Created` and fires a root shadow pipeline.
The pipeline webhook delivery consistently returns `403 Forbidden`
from the trigger endpoint. After a few consecutive failures GitLab
auto-disables the webhook (`alert_status: temporarily_disabled`),
so even once the root cause is understood the delivery path is
latency-throttled by GitLab's webhook health tracking.

### Root cause

GitLab.com's trigger endpoint specifically rejects any incoming
request that carries `X-Gitlab-Event: Pipeline Hook`. Reproduced
cleanly:

```bash
# 201 Created — same URL, no special header
curl -X POST "https://gitlab.com/api/v4/projects/$ROOT_ID/ref/main/trigger/pipeline?token=$T&variables[EVENT_KIND]=pipeline"

# 201 Created — Merge Request Hook header passes through
curl -X POST -H 'X-Gitlab-Event: Merge Request Hook' "$URL"

# 403 Forbidden — Pipeline Hook header is the discriminator
curl -X POST -H 'X-Gitlab-Event: Pipeline Hook' "$URL"
```

This is a loop-prevention guard on GitLab's side: a pipeline hook
firing into a pipeline-trigger endpoint would create a pipeline
whose completion fires another pipeline hook, which would trigger
another pipeline, and so on. GitLab closes the loop by rejecting
the class of request at the endpoint, regardless of intent.

No documented setting toggles this behaviour, and the rejection
is request-shape-based (header), not token-based, so token
rotation or scope changes do not help.

### Evidence

- Webhook event log on mfe hook `76370079`:
  every delivery on 2026-04-23 and 2026-04-24 returns
  `response_status: "403"` with body `{"message":"403 Forbidden"}`.
  Same token, same URL as hook `76370078` (MR events), which
  returns `201` on every delivery.
- Manual reproduction via curl with only the `X-Gitlab-Event`
  header varying — see bash snippet above.
- `alert_status: temporarily_disabled` on the pipeline webhook
  after the 403 run, confirming GitLab's auto-disable kicked in.

### Impact

I-032's renderer artefacts still work — `shadow:detect-trigger`
correctly classifies `EVENT_KIND=pipeline` events into
`TRIGGER_MODE=pipeline-failure` and `shadow:fanout-failure`
correctly pushes `failed` to sibling MR heads — but no such
event ever reaches detect-trigger, so the code path is dead in
production.

Practical consequence: when a managed repo pipeline fails while a
story is in flight, sibling story MRs show `pending` until the
next MR-event triggers re-evaluation. The stale-green race I-031
addresses at story start is re-introduced at story mid-flight,
weaker (because `pending` not `failed`) and bounded by the next
MR event rather than unbounded.

### Fix direction — CI-job-based delivery

Replace the pipeline-events webhook with a CI job on each managed
repo that fires on pipeline failure and calls root's trigger
endpoint directly. Under CI job context the request has no
`X-Gitlab-Event` header and so is not subject to the loop-prevention
guard.

Renderer-side (per managed repo pipeline):

```yaml
report-failure-to-root:
  stage: .post
  when: on_failure
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl
  script:
    - |
      curl -fsSL -X POST \
        "$ROOT_TRIGGER_URL&variables[SOURCE_PROJECT_ID]=$CI_PROJECT_ID&variables[SOURCE_PROJECT_PATH]=$CI_PROJECT_PATH&variables[SOURCE_PIPELINE_ID]=$CI_PIPELINE_ID&variables[EVENT_KIND]=pipeline"
  variables:
    ROOT_TRIGGER_URL: "https://gitlab.com/api/v4/projects/$ROOT_PROJECT_ID/ref/main/trigger/pipeline?token=$ROOT_TRIGGER_TOKEN"
```

Wire-orchestration side:

- Install only **one** webhook per managed repo (MR events).
- Stop installing the pipeline-events webhook.
- Ensure `ROOT_PROJECT_ID` and `ROOT_TRIGGER_TOKEN` are available
  as CI variables on the managed repo — probably set by
  `wire-orchestration` at the same time it sets `M_GROUP_TOKEN`.

Root-side — no changes needed. `shadow:detect-trigger` already
handles `EVENT_KIND=pipeline`; it will simply start receiving
real traffic once the delivery mechanism swaps.

### Alternatives considered

- **Do nothing** — accept that pipeline-failure fan-out is a
  GitLab-self-hosted-only feature. Rejected: most M adopters
  will be on GitLab.com at first.
- **External forwarder** (Lambda / Cloudflare Worker that strips
  the `X-Gitlab-Event` header and re-issues the request) —
  works but adds an external infra dependency and a trust
  boundary. Reserve for orgs that specifically can't run CI
  jobs on failure for policy reasons.
- **Use a different event class** (e.g. `push_events`) — does
  not carry pipeline status, so fails the I-032 contract.

### Changes in v0.10.0

- **`.m/capabilities/scaffold-repo/SKILL.md`** — managed-repo
  pipeline template gains a `report-failure-to-root` job in the
  `.post` stage. Runs `when: on_failure` on MR pipelines and main
  pushes. Uses `M_TRIGGER_TOKEN` + `ROOT_PROJECT_ID` from the
  managed repo's CI variables, URL-encodes `CI_PROJECT_PATH`,
  curl-POSTs the trigger endpoint with `EVENT_KIND=pipeline`.
  Lifecycle phase contract table extended with the `.post` row.
- **`.m/capabilities/wire-orchestration/SKILL.md`** — Step 3
  collapses to one MR webhook per managed repo (MR events only;
  push and pipeline events explicitly disabled). Step 4 adds a
  new subsection for the I-056 CI variables: `M_TRIGGER_TOKEN`
  (masked, unprotected — pipeline-trigger-scoped only) and
  `ROOT_PROJECT_ID` (unprotected, unmasked — non-secret) on
  every managed repo. Detect-stage description updated to
  reflect the dual delivery (MR webhook for `mr` events,
  CI-job for `pipeline` events).
- **`.m/providers/ci/gitlab.mjs`** — comment touch-ups on
  `shadow:detect-trigger` and the script preamble naming the
  two delivery paths. No code change to the root pipeline; root
  already handles `EVENT_KIND=pipeline` correctly (I-032 from
  v0.8.0).

### Migration note

Existing M-type projects on v0.8.x or v0.9.x need to:

1. Re-scaffold or re-render `.gitlab-ci.yml` on each managed repo
   so it gets the new `report-failure-to-root` job.
2. Delete the `pipeline_events` webhook on each managed repo
   (keep the `merge_request_events` one).
3. Set `M_TRIGGER_TOKEN` + `ROOT_PROJECT_ID` as CI variables on
   each managed repo (re-running `wire-orchestration` against an
   existing project does this idempotently).

## I-058: Workshop shell + mfe Module Federation chunk loading fails under headless Cypress

**Category:** Workshop testbed (todo-m-workshop) — runtime config
**Tier:** 4 — Polish (testbed-side; no methodology impact)
**Discovered:** 2026-04-26, during v0.11.0 / I-045 L4 validation
**Status:** ✅ Resolved 2026-04-26 (same-day). Same-origin proxy through
shell's nginx + webpack-dev-server: `/mfe/*`, `/api-read/*`,
`/api-write/*` route to the matching containers via Docker DNS. Shell
and mfe bundles use relative URLs by default
(`todoMfe@/mfe/remoteEntry.js`, `API_URL=/api-read`). Verified:
TODOM-000 6/6 and TODOM-L4 3/3 cypress tests pass against
`cypress/included:14.5.4` on the compose network. See *Resolution*
below.

### Problem

Any PAT whose `cy.visit('/')` lands on the workshop shell fails inside
a headless Cypress 14 run with:

```
ScriptExternalLoadError
  at … (http://shell:3000/main.js:2:139077)
  at i (http://shell:3000/main.js:2:139560)
  …
  at i.f.consumes (http://shell:3000/main.js:2:145927)
```

The shell renders enough of itself for the first DOM check to pass
(`[data-testid='app-shell'] is visible`), but the moment it tries to
load mfe via the Module Federation `consumes` runtime, the chunk
load throws and the test fails.

### Repro

Verified 2026-04-26 against the live `todo-m-workshop` testbed at
`/tmp/m-l1/todo-m-root`:

```sh
cd /tmp/m-l1/todo-m-root
docker compose up -d --build
docker run --rm \
  --network todo-m-root_default \
  -v /tmp/m-l1/todo-m-root:/e2e -w /e2e \
  cypress/included:14.5.4 \
  --spec pats/TODOM-000.cy.js \
  --config baseUrl=http://shell:3000
```

Result: 1/6 ACs pass (the one that only checks shell visibility);
5/6 fail or skip on the cascading `before each` failure once mfe
chunk loading triggers.

The same harness was used for the I-045 L4 validation
(`pats/TODOM-L4.cy.js`). Both pure-HTTP ACs (`cy.request`-only) passed
cleanly — proving the failure is specifically at the shell + mfe
runtime layer, not anywhere in the cypress provider's compiled output
or the docker / network plumbing.

### Hypothesis

Most likely a webpack `publicPath` / Cypress baseUrl mismatch in the
shell's Module Federation runtime config. The shell builds
`remoteEntry.js` URLs assuming a specific origin and that origin
doesn't match what Cypress sees inside the docker network (or the
`consumes` machinery is asking for a chunk path the mfe container
isn't serving). Other plausible causes: missing CORS headers on the
mfe container's chunk responses; a relative path that resolves
differently when loaded under a Cypress AUT iframe.

### Impact

- **Methodology:** none. M itself doesn't depend on the testbed shell
  rendering correctly — this is a workshop-only artefact and a real
  adopter's project would carry its own frontend with its own MF
  config.
- **Validation discipline:** **medium**. While I-058 is open, L4/L5
  E2E validation against the workshop testbed is restricted to
  HTTP-only PATs (which still cover the I-045 / I-040 structural
  exit criteria). Browser-touching ACs can't be exercised
  end-to-end on the testbed, so any methodology change that
  meaningfully exercises the shell needs an alternative venue.
- **CI gate:** unknown. The current integration-test in CI runs
  `sh scripts/integration-test.sh` (curl probes), not Cypress, so
  the gate itself is unaffected. If CI is later extended to run
  Cypress (likely under v0.12.0 / I-040 work), I-058 must be
  resolved first.

### Effort

S. Likely a one-line `publicPath: 'auto'` (or matching origin) in
`packages/shell/webpack.config.js` plus possibly a corresponding
tweak in `todo-m-mfe`'s ModuleFederationPlugin output config.
Verification is a single re-run of TODOM-000 under the same
`cypress/included` container.

### Out of scope for v0.11.0

I-058 was discovered during v0.11.0 / I-045 L4 validation but is
testbed-side. Filing now so the next time the workshop is touched
for E2E browser validation (likely the v0.12.0 / I-040 cycle) it's
on the radar.

### Resolution (2026-04-26)

The hypothesis above was correct in shape but pointed at
`publicPath`; the actual lever was the `MFE_URL` and `API_URL`
build-time defaults baked into the bundles. Fix landed same-day
across the two workshop repos.

**Root cause.** Shell's `webpack.config.js` defaulted `MFE_URL` to
`http://localhost:3001`. MFE's `Hello.jsx` defaulted `API_URL` to
`http://localhost:3002`. Both URLs are baked into the production
bundle at build time. They work for a developer's host browser
(docker-compose port mapping translates `localhost:3001` → mfe
container) but fail inside cypress-in-docker — `localhost:3001`
from inside the cypress container resolves to nothing.

**Fix shape.** Same-origin proxy through the shell, with two
parallel implementations:

- **Production / docker-compose:** shell's `nginx.conf` gains three
  `location` blocks: `/mfe/`, `/api-read/`, `/api-write/`, each with
  `proxy_pass http://<service>:<port>/;` so the request is
  forwarded across the docker network via DNS.
- **Local development (`npm run dev` / `start-all.sh`):** shell's
  `webpack.config.js` gains a `devServer.proxy` block with the same
  three context-path mappings, targeting `http://localhost:300x`
  (the host-published ports the dev process can reach).

Bundles now reference the MFE remote and the API as relative URLs:

- Shell: `MFE_URL` default flips to `/mfe`, so the
  `ModuleFederationPlugin` emits `todoMfe@/mfe/remoteEntry.js`.
- MFE: `API_URL` default flips to `/api-read`, so `Hello.jsx`
  fetches `/api-read/hello`.

Result: the same bundle runs identically on the developer's host
browser, inside cypress-in-docker, and (eventually) in CI. No
build-time URL drift, no environment-specific webpack rebuild.

**Standalone-mfe dev** (`npx webpack serve` in the mfe repo, port
3001 with no shell in front) loses the API fetch — the page
renders but shows "Failed to fetch message". Acceptable: that mode
exists for component-level dev, not E2E. If standalone-mfe ever
needs working API access, add a matching `devServer.proxy` to the
mfe's webpack config.

### Changes (workshop repos)

- **`todo-m-workshop/todo-m-root` commit `038a63d`:** shell's
  `nginx.conf`, `webpack.config.js`, and `Dockerfile`. Adds the
  three nginx `location` proxies, the matching webpack-dev-server
  proxy block, and flips `MFE_URL` default to `/mfe` (in webpack
  config and Dockerfile ARG).
- **`todo-m-workshop/todo-m-mfe` commit `577396a`:** flips `API_URL`
  default to `/api-read` in `Hello.jsx` and the Dockerfile ARG.

### Verification

```sh
cd /tmp/m-l1/todo-m-root
docker compose up -d --build
docker run --rm \
  --network todo-m-root_default \
  -v /tmp/m-l1/todo-m-root:/e2e -w /e2e \
  cypress/included:14.5.4 \
  --spec 'pats/TODOM-*.cy.js' \
  --config baseUrl=http://shell:3000
```

Result: **TODOM-000 6/6 pass + TODOM-L4 3/3 pass**. Pre-fix:
TODOM-000 1/6 + TODOM-L4 2/3.

### Methodology impact

None. The fix lives in the testbed application code, not in
methodology-m. M-type adopters carry their own frontend application
with its own MF / origin configuration; this issue was a
self-inflicted artefact of the workshop's specific build choices.

What this *does* unblock: L4/L5 cypress validation against the
workshop testbed for browser-touching PATs — including v0.12.0's
structural ADD demonstration.


---

## I-059: `m clone` naive YAML parser miscounts referenced repos when persistence is declared

**Status:** ✅ Resolved 2026-05-06 — section-boundary check in
`cli/src/lib/topology.mjs` closes the in-progress component on a
non-indented header line so `persistence:` (and similar top-level
blocks) can no longer overwrite the last component's fields. Smaller
fix than the originally proposed `js-yaml` swap; same effect on the
symptom. v0.13.0.

**Category:** M CLI / topology parser
**Priority:** Low (papercut — easy workaround)
**Discovered:** 2026-05-02, kicking off v0.12.0 ADD evidence run

### Problem

`cli/src/lib/topology.mjs` parses `project.yaml` with a hand-rolled
line scanner instead of a real YAML parser. The scanner doesn't track
indent / scope: once it sees a `- name:` it sets `currentComponent`
and keeps overwriting `currentComponent.type` and `currentComponent.location`
on every subsequent `type:` / `location:` line — including lines from
later top-level blocks like `persistence:`.

In the live workshop topology, the file is laid out roughly as:

```yaml
components:
  - name: shell
    type: embedded
    ...
  - name: api-write
    type: referenced
    ...
persistence:
  type: sqlite
  volume: todo-data
```

When the parser reaches `persistence:`'s `type: sqlite`,
`currentComponent` is still `api-write` from the last `- name:`. The
parser overwrites `api-write.type` to `sqlite`. Then
`getReferencedRepos` filters by `type === 'referenced'` and silently
drops `api-write`.

### Symptoms

```
$ m clone https://gitlab.com/methodology-m/todo-m-workshop/todo-m-root.git
  Project: todo-m (2 managed repos)   ← should be 3
  Cloning todo-m-mfe...
  Cloning todo-m-api-read...
                                      ← todo-m-api-write silently missing
```

Any project that declares `persistence:` (or any other top-level
block whose first child is `type:` or `location:`) after `components:`
will undercount referenced repos.

### Where it bites

- **`m clone` from URL** — silently undercounts and skips siblings.
- **`m clone` from inside an existing root** — same path, same bug.

### Where it does NOT bite

- **`render-topology-artefacts/render.mjs`** — uses `js-yaml`, no
  bug. Phase B of `decompose-story` (the v0.12.0 ADD lever) is safe.
- The schema validator and provider dispatch — both use parsed YAML.

### Fix direction

Replace the hand-rolled scanner with `js-yaml` (already vendored at
`.m/vendor/js-yaml.mjs`). `cli/src/lib/topology.mjs` becomes a thin
shape-extractor over a properly-parsed object. Add a regression test
that includes `persistence:` after `components:`. Estimate: XS.

### Workaround (until fixed)

`git clone` the missing managed repos manually. The bug is silent
but visually obvious in the `m clone` summary line — the count is
lower than the number of `type: referenced` entries in
`project.yaml`.


---

## I-060: Stale `TODOM-000.pat.yaml` copies fail current schema (live workshop + pass1 snapshot)

**Category:** Workshop hygiene
**Priority:** Low (compiled CAT works; only re-compilation is broken)
**Discovered:** 2026-05-02, generate-pats step of v0.12.0 ADD evidence run

### Problem

Two copies of `TODOM-000.pat.yaml` predate the current schema and
fail validation:

- `ref-projects/todo-m-workshop/pass1/todo-m-root/pats/TODOM-000.pat.yaml`
  (in this repo — frozen pass1 snapshot)
- `methodology-m/todo-m-workshop/todo-m-root` on GitLab — the live
  workshop's root repo at `pats/TODOM-000.pat.yaml`

Both fail `js-yaml.load(...)` with *bad indentation of a mapping
entry* on the assert lines. The breakage is two-layered:

1. **Syntax.** The double-quoted scalar terminates at the inner
   closing quote, leaving trailing tokens that aren't valid yaml:

   ```yaml
   - assert: "[data-testid='app-shell']" is visible
                                       ^ scalar ends here; rest is junk
   ```

   Correct shape (one continuous double-quoted scalar):

   ```yaml
   - assert: "[data-testid='app-shell'] is visible"
   ```

2. **Semantics.** Some predicates aren't legal under the current
   `step-assert` pattern at all — e.g. `contains no error state`.
   The schema's predicate set is
   `(is visible|is disabled|contains '<value>'|count > N)`. Even
   with the syntax fix, those ACs would still fail validation.

### Where it does NOT bite (today)

The compiled CAT lives next to the broken yaml as
`pats/TODOM-000.cy.js` and is what cypress actually runs. Neither
the live AOT pipeline nor any local cypress run hits the broken
yaml — the runner consumes `.cy.js`, not `.pat.yaml`. So nothing
is *currently* failing.

### Where it bites the day someone tries to recompile

Anyone re-running `compile-story-pats` for TODOM-000 (e.g. to
re-emit the CAT after a provider tweak, or to validate the
contract is still consistent with the compiled artefact) will hit
a parse error with no clear path forward. The same applies to any
schema-validation pass over all PAT yamls in the workshop.

### Canonical version exists

`workshop/jira/TODOM-000/TODOM-000.pat.yaml` (in this repo) IS
schema-clean. The fix in both broken locations is "copy from
canonical, adjust any locale-specific deltas". Content drift means
this isn't a one-line replacement — about 24 step lines per file
need rewriting and a few semantically-invalid predicates need
mapping onto current ones.

### Two-part fix

1. **`ref-projects/.../pass1/.../TODOM-000.pat.yaml`** — sync to
   canonical (or remove if pass1 is intentionally frozen and not
   meant to track schema evolution). Filed for resolution in a
   future workshop-hygiene PR; deliberately out of scope for the
   v0.12.0 ADD PR (orthogonal scope).
2. **Live workshop `todo-m-root` `pats/TODOM-000.pat.yaml`** —
   separate hygiene MR against the workshop's `todo-m-root` repo
   on GitLab. Out of band from this methodology-m PR (different
   repo, different review surface).

### Workaround (until fixed)

None needed for normal operation. Anyone touching
`compile-story-pats` for TODOM-000 should fix the yaml before
recompiling.


---

## I-061: `unwire-orchestration` capability — managed-repo decommission

**Category:** M capability / structural-verb completeness
**Priority:** Low (orphan-repo source-repo guard from v0.12.1
closes the only operational gap)
**Discovered:** 2026-05-02, locking the v0.12.x REMOVE design

### Problem

When a REMOVE story merges, the to-be-removed managed repo is
left untouched on the SCM platform — its webhook to root, its
`M_TRIGGER_TOKEN` / `ROOT_PROJECT_ID` CI variables, and its
branch protection all remain. M's view of the project ends at
`project.yaml`, by design.

The v0.12.1 REMOVE ship added a source-repo guard to
`detect-story-trigger.sh` so orphan-repo MR webhooks classify as
standalone (no spurious shadow runs), which is the only
operational hazard. What's left is cosmetic / GitLab-tidy: the
orphan webhook keeps firing harmless triggers, the orphan repo
keeps appearing in the project listing, the orphan CI variables
keep existing.

### Proposal

Add an `unwire-orchestration` capability that mirrors
`wire-orchestration` for the decommission path:

1. Delete the managed repo's MR webhook to root.
2. Delete the managed repo's `M_TRIGGER_TOKEN` and
   `ROOT_PROJECT_ID` CI variables.
3. (Optional, behind a `--archive-repo` flag) Archive or delete
   the managed repo on the SCM platform.

The capability would be invoked by the agent at the user's
explicit request after a REMOVE story merges (NOT auto-invoked —
M does not delete user assets without intent).

### Why low priority

- The source-repo guard from v0.12.1 closes the spurious-run
  problem. Everything else is tidiness.
- Real M projects shouldn't accumulate orphan repos faster than
  manual cleanup can handle.
- Bundled cleanup adds risk to the REMOVE ship without unblocking
  any user need.

Pull-driven — implement when a real project asks for it.


---

## I-062: Historical-CAT scan as a shared utility (REMOVE today, RENAME tomorrow)

**Status:** ✅ Resolved 2026-05-06 — extracted to
`.m/capabilities/_lib/historical-cat-scan.mjs` with two operations:
`findReferencing` (REMOVE) and `rewriteReferencing` (RENAME).
RENAME's contract gave the abstraction a second caller, so the
extraction is no longer premature. v0.14.0.

**Category:** M capability / refactor
**Priority:** Low (single-call-site for now)
**Discovered:** 2026-05-02, locking the v0.12.x REMOVE design

### Problem

v0.12.1 REMOVE introduced a static grep over `pats/*.cy.js` to
identify historical compiled CATs that probe the to-be-removed
component. The scan lives inline in `compile-story-pats`'s bundle
assembly. RENAME (deferred to a later v0.12.x ship) will need a
similar but distinct scan: instead of "find files referencing
component X for deletion," it'll be "find files referencing
component X and rewrite them to reference component Y."

### Proposal

Extract the scan logic into a shared utility (likely
`.m/capabilities/_lib/historical-cat-scan.mjs` or similar). The
utility takes the root repo working dir + a list of "term to
locate" patterns, returns the matching files. Callers decide what
to do with the matches (delete vs rewrite).

### Why low priority

- Single caller today (REMOVE).
- Inline is fine while the contract is unclear (the RENAME shape
  may want different semantics).
- Premature abstraction would lock the wrong shape.

Re-evaluate once RENAME's design is locked.


---

## I-063: `scm.delete_file` MCP primitive

**Status:** ✅ Resolved 2026-05-06 — `scm.push_or_update_files`
extended with a third action kind `{ path, action: 'delete' }`.
GitLab provider documents two paths (atomic mixed-actions commit,
interim per-action curl via the new `delete-file.mjs` helper);
backwards-compatible (existing `{ path, content }` entries unchanged).
The function name was preserved (the locked design's proposed
rename to `scm.push_files` would have collided with the existing
strict create-only function); same design intent. v0.14.0.

**Category:** SCM provider tooling
**Priority:** Medium (workaround exists but methodology-defined
deletes ship as stubs without it)
**Discovered:** 2026-05-03, v0.12.1 REMOVE evidence run on the
workshop

### Problem

The MCP gitlab wrapper exposes `create_or_update_file` for file
writes but has no `delete_file` action. v0.12.1's REMOVE design
calls for the gate MR bundle to **delete** historical compiled
CATs that probe the removed component (so cypress's
`**/*.cy.js` glob doesn't surface them and run them against a
topology that no longer answers their probes). With no delete
primitive, the v0.12.1 evidence run pushed a stub `describe()`
block in place of the real delete — functionally equivalent
(cypress discovers the file, finds no tests, moves on) but
doesn't match the methodology's documented semantic.

The GitLab REST commits API supports `action: "delete"` natively;
the gap is in the MCP wrapper layer, not the underlying platform.

### Proposal

Add `mcp__gitlab__delete_file` (or extend
`create_or_update_file` with a `delete: true` mode) backed by:

```
DELETE /projects/:id/repository/files/:path
```

or, preferred for atomicity with other bundle operations:

```
POST /projects/:id/repository/commits
  actions: [{ action: "delete", file_path: ... }, ...]
```

The atomic-commits-API path also enables the
`scm.push_or_update_files` provider doc's "preferred
implementation (atomic single commit)" path, which currently
falls back to per-file calls because no MCP wrapper for the
commits API exists yet.

### Workaround (until fixed)

Push a stub `describe()` block via `create_or_update_file`. The
file remains on disk but contains no tests; cypress treats it as
a no-op spec. Operationally equivalent for cypress runs; not
equivalent for code-archaeology purposes (the file should be
gone, not stubbed). Document the workaround in the gate MR
description and file the gap as a known limitation.

### Methodology impact

The `scm.delete_file` semantic is also needed for any future M
capability that issues file deletions through the SCM:

- v0.12.x RENAME (rewrites historical CATs in place — could be
  modeled as delete-then-create or as in-place update; either
  works)
- I-061 `unwire-orchestration` (deleting the managed-repo CI
  variables uses a different MCP tool; not blocked by this)

Worth shipping early so REMOVE evidence runs use the real delete
on the next iteration.

### Locked design (v0.14.0 — provider contract + curl fallback)

**Status:** DRAFT — review before impl.

Locked 2026-05-06 ahead of v0.14.0 implementation. Bundles with
v0.14.0 RENAME + I-004; the unified `actions[]` push contract from
this design unblocks RENAME's mixed-action bundles even though
RENAME itself only uses `update`.

**1. Scope.** Three deliverables, all in the methodology repo:

- **(a) Provider interface contract** — `scm.push_or_update_files`
  becomes `scm.push_files` with a unified `actions[]` payload that
  accepts `create` / `update` / `delete` action kinds. Same name +
  shape as GitLab's commits API.
- **(b) `scm/gitlab.md` provider doc** — spec the
  `delete` action shape: agent calls a per-file delete via direct
  curl against `DELETE /projects/:id/repository/files/:path` (the
  v0.14.0 reality, while the MCP wrapper catches up), or against
  `POST /projects/:id/repository/commits` with the atomic
  `actions[]` payload (preferred path once the wrapper supports
  it).
- **(c) `compile-story-pats` REMOVE bundle** updated to use the
  new contract — the v0.13.0 stub-describe workaround for
  historical-CAT cleanup retires; deletes are real deletes.

The MCP wrapper change (`mcp__gitlab__delete_file` or
extending `mcp__gitlab__create_or_update_file` with a
`delete: true` mode) lives in a **separate codebase** (the MCP
gitlab server) and is **out of scope** for the methodology repo.
v0.14.0 ships the methodology contract + a curl fallback that
works today; the MCP wrapper change can land asynchronously
without re-shipping the methodology side.

**2. Why ship now.** I-063 became blocking when the v0.12.1
REMOVE evidence run (MR !36, merged 2026-05-06) had to ship the
historical-CAT delete as a stub `describe()` block instead of a
real delete. The MR description called out the limitation
explicitly. Each subsequent REMOVE / RENAME story compounds the
audit-trail debt: stub files accumulate on main, diverging from
the methodology's documented "delete = real delete" semantic.
Locking this design alongside RENAME (which surfaces the same
mixed-action shape) is the moment to align the contract.

**3. Provider contract — `scm.push_files` with unified
`actions[]`.** Replaces the v0.5.1 `scm.push_or_update_files`
shape. New shape:

```js
scm.push_files({
  project: <repo-path>,
  branch: <branch>,
  start_branch: <main-or-target>,
  commit_message: <string>,
  actions: [
    { action: "create", file_path: <path>, content: <content> },
    { action: "update", file_path: <path>, content: <content> },
    { action: "delete", file_path: <path> },
  ],
})
```

Each `action` independently atomic-or-N-call per the provider
implementation. The naming convention (`push_files`, no
`_or_update_files`) reflects that the operation is no longer
restricted to create-or-update.

**4. GitLab provider implementation — two paths.**

- **Preferred (atomic):** single `POST /projects/:id/repository/
  commits` with the full `actions[]` payload. One commit, one
  network call. Available today via curl; available via the MCP
  wrapper once it lands.
- **Interim (per-file):** when the actions list is small (≤ 5
  files) and the MCP wrapper is the only option, fall back to
  per-action calls:
  - `create` / `update` → `mcp__gitlab__create_or_update_file`
  - `delete` → curl
    `DELETE /projects/:id/repository/files/<encoded-path>` with
    `?branch=<branch>&commit_message=<msg>` query params, using
    `M_GROUP_TOKEN`.
- The provider implementation chooses based on whether the agent
  has access to the atomic-commits endpoint at runtime (probe via
  `OPTIONS` or feature flag in `project.yaml.providers.scm`).

**5. Curl fallback shape (v0.14.0 reality).** The capability
agent (running `compile-story-pats`) issues delete actions via
the Bash tool against a small node script:

```js
// .m/providers/scm/gitlab/delete-file.mjs
import { argv } from "node:process";
const [, , project, branch, path, message, token] = argv;
const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(path)}?branch=${branch}&commit_message=${encodeURIComponent(message)}`;
const res = await fetch(url, {
  method: "DELETE",
  headers: { "PRIVATE-TOKEN": token },
});
if (!res.ok) {
  console.error(`DELETE failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
```

Same shape as v0.10.0's `report-failure-to-root` curl
(post-I-057 with `-g` not needed for DELETE — no `[]` in the
delete URL). Lives at `.m/providers/scm/gitlab/delete-file.mjs`.
Agent invokes via Bash; failure surfaces in the bundle assembly's
already-existing error path.

**6. compile-story-pats SKILL update.** Existing REMOVE bundle
assembly subsection ("Structural REMOVE stories only") already
documents the delete contract:

> "the SCM provider's `delete_file` action is used (or, for the
> GitLab interim N-call implementation, a per-file delete API
> call)"

Update to reflect v0.14.0 reality: the contract is now
`scm.push_files` with an `actions[]` array; the GitLab provider
selects atomic-or-N-call based on the project's MCP wrapper
capability.

**7. Backward compatibility — `scm.push_or_update_files` callers.**
The existing `scm.push_or_update_files` shape (v0.5.1) is renamed
to `scm.push_files`. Callers update at the same time. Two callers
in v0.13.0:

- `decompose-story` Phase B (S-2 topology artefact regeneration —
  pure `update` + `create` actions; no behaviour change beyond
  rename).
- `compile-story-pats` Step 3 (gate MR push — gains a `delete`
  action shape; previously pushed `update` actions only).

Update is mechanical: rename the call, restructure the per-file
shape from `{ action, file_path, content }` already used in v0.5.1
to the same shape (no change beyond the addition of `delete`).

### Worked example (RENAME bundle from the v0.14.0 RENAME design)

For TODOM-S04 (rename `metrics` to `telemetry`), the
`compile-story-pats` bundle is:

```js
scm.push_files({
  project: "methodology-m/todo-m-workshop/todo-m-root",
  branch: "feat/TODOM-S04d-integration-gate",
  start_branch: "main",
  commit_message: "TODOM-S04: rename metrics to telemetry",
  actions: [
    { action: "update", file_path: "project.yaml", content: "..." },
    { action: "update", file_path: "docker-compose.yml", content: "..." },
    { action: "update", file_path: ".gitlab-ci.yml", content: "..." },
    { action: "update", file_path: "scripts/integration-test.sh", content: "..." },
    { action: "update", file_path: "scripts/report-shadow-status.sh", content: "..." },
    { action: "update", file_path: "scripts/detect-story-trigger.sh", content: "..." },
    { action: "create", file_path: "stories/TODOM-S04.yaml", content: "..." },
    { action: "create", file_path: "pats/TODOM-S04.pat.yaml", content: "..." },
    { action: "create", file_path: "pats/TODOM-S04.cy.js", content: "..." },
    { action: "update", file_path: "pats/TODOM-S02.cy.js", content: "..." },  // rewritten by historical-cat-scan
  ],
})
```

For a REMOVE bundle (TODOM-S03 retroactive — once v0.14.0 ships,
re-run the workshop REMOVE without the stub):

```js
scm.push_files({
  ...
  actions: [
    { action: "update", file_path: "project.yaml", content: "..." },
    ...regenerated-topology-files,
    { action: "create", file_path: "stories/TODOM-S03.yaml", content: "..." },
    { action: "create", file_path: "pats/TODOM-S03.pat.yaml", content: "..." },
    { action: "create", file_path: "pats/TODOM-S03.cy.js", content: "..." },
    { action: "delete", file_path: "pats/TODOM-S02.cy.js" },  // real delete now, not a stub
  ],
})
```

### Implementation deltas

| File | Change |
|---|---|
| `.m/providers/provider-interface.md` | Rename `scm.push_or_update_files` → `scm.push_files`. Update the action enum to include `delete`. Update return shape (success per action, atomic-or-partial-fallback) |
| `.m/providers/scm/gitlab.md` | Spec the two paths (atomic commits API, interim per-file curl). Document `delete-file.mjs` helper. Update existing `push_or_update_files` section accordingly |
| `.m/providers/scm/gitlab/delete-file.mjs` | **NEW** — small node script for the curl fallback. ~15 LOC, zero deps |
| `.m/providers/scm/log-only.md` | Update mock provider to log `delete` actions alongside `create` / `update` |
| `.m/capabilities/decompose-story/SKILL.md` | Update Phase B S-2 reference from `scm.push_or_update_files` → `scm.push_files` |
| `.m/capabilities/compile-story-pats/SKILL.md` | Update Step 2 (push bundle assembly) to use `actions[]` shape; update REMOVE subsection to drop the stub-describe workaround language and use real `delete` actions |

### Dependencies + follow-ups

- The actual MCP wrapper change (adding `mcp__gitlab__delete_file`
  or extending `mcp__gitlab__create_or_update_file`) is filed
  upstream in the MCP gitlab server's repo — separate codebase,
  not in scope here. Once it lands, the gitlab provider's
  selection logic prefers the wrapper over the curl fallback.
- **I-068** filed as follow-up: extend the same `actions[]`
  contract to support `move` (atomic rename of a path) for use
  cases where the methodology wants to relocate a file rather
  than delete-then-create. Pull-driven.

### Sizing

**S.** Mostly contract + documentation. The new helper script is
small. The breaking-rename of the provider function name touches
two callers, both mechanical. The v0.13.0 stub-describe
workaround in `compile-story-pats` retires cleanly.


---

## I-064: Self-update prompt on operational `m` commands

**Status:** ✅ Resolved 2026-05-06 — shipped in v0.13.0.

**Category:** M CLI / distribution UX
**Priority:** Low (papercut — `npm view methodology-m version` was
the manual workaround)
**Discovered:** 2026-05-06, while preparing the v0.13.0 release

### Problem

There was no signal to the user when a newer `methodology-m` was
published. Users had to remember to `npm view methodology-m version`
periodically and `npm i -g methodology-m@latest` themselves.
Practically, that meant pinned-old installs drifting silently and the
agent-side steering being out of sync with what the methodology
currently does.

### Resolution

Added `cli/src/lib/update-check.mjs`. On entry to operational commands
(`init`, `clone`, `update`, `diff`), the CLI:

1. Polls `https://registry.npmjs.org/methodology-m/latest` with a 2s
   `AbortController` timeout. Failure (network, non-2xx, JSON shape)
   silently falls through.
2. If the registry version is newer than the installed one, prints
   `▲ methodology-m vX.Y.Z is available — you have vA.B.C.` and
   prompts `Update now? (y/N)`.
3. On yes, runs `npm i -g methodology-m@latest` (inherit stdio so the
   user sees npm output) and re-execs with the original argv.
4. On no, continues with the current version.

### Gating

- **Meta commands** (`help`, `version`, `changelog`) — skipped, so
  they always print clean output without an interrupting prompt.
- **Non-TTY** — skipped (CI, piped output, programmatic invocation).
- **`M_NO_UPDATE_CHECK=1`** — env-var opt-out for users who don't
  want any registry calls.

Pattern adapted from `textologylabs/hex` (`src/update.ts`).

### Limits

- `runInstall` shells out to `npm` — pnpm/yarn/bun-installed users
  should set `M_NO_UPDATE_CHECK=1` to avoid a parallel npm-global
  install.
- `compareVersions` is a 3-tuple numeric compare; pre-release tags
  on the npm `latest` dist-tag would over-prompt, but Methodology M
  doesn't ship pre-releases on `latest`.


---

## I-066: Merge transaction execution + gating

**Category:** M capability / orchestration completeness
**Priority:** Medium (deferred from I-004 — post-MVP)
**Discovered:** 2026-05-06, locking the v0.14.0 I-004 post-merge
slice

### Problem

The merge-transaction job in the root repo currently sits at
`when: manual` with a placeholder script. v0.14.0's I-004 ship
covers the *post-merge* lifecycle (auto-tag, auto-bump,
project-level CHANGELOG) but does not cover:

1. **Cross-repo atomic merge** — when a tech lead clicks the
   merge-transaction button, all managed-repo MRs for the story
   should merge atomically. Currently nothing happens; the dev
   merges each MR by hand.
2. **Button-light-up gating** — the merge-transaction button is
   always available, even when shadow status on managed MRs is
   red. The dev gets no signal that the system is *ready* to
   merge.

Both are real value, but bundling with the v0.14.0 post-merge
slice would inflate risk for no incremental gain. The post-merge
flow works without atomic merge — devs merge story MRs
individually in any order, and the auto-tag-and-bump cycle fans
out from each merge.

### Why deferred

- Cross-repo atomicity has rollback semantics (what if 2 of 3
  merges succeed and the third fails?) — non-trivial design
  surface.
- Gating logic depends on commit-status aggregation across
  managed MRs, which is itself a design decision (how stale
  before re-checking, how to handle MRs added mid-flight, etc.).
- v0.14.0's post-merge automation removes the *most painful*
  manual bookkeeping (yaml bumps + CHANGELOG entries). The
  remaining manual step (clicking N merge buttons in sequence)
  is annoying but not error-prone in the same way.

### Proposal

Pull-driven — re-evaluate after v0.14.0 ships and I-004's
post-merge slice has been exercised on a real project. Likely
shape: GitLab Merge When Pipeline Succeeds + a coordinator job
on root that watches managed-MR commit statuses.


---

## I-067: Auto-merge of topology bump MRs

**Category:** M capability / automation polish
**Priority:** Low (human-clicked merge is fine for v0.14.0)
**Discovered:** 2026-05-06, locking the v0.14.0 I-004 post-merge
slice

### Problem

v0.14.0's I-004 ship opens a `chore/bump-<component>-<tag>` MR
on the root repo for every managed-repo tag event. The MR's
diff is one yaml line + one CHANGELOG line, the pipeline runs
`validate:compose` against the new tag and proves it reaches the
component, and a human clicks merge.

The human click is not strictly necessary — the bump MR's
content is mechanical and the pipeline already gates the safety
of the new tag. Auto-merging green bump MRs would close the
auto-bump loop end-to-end.

### Why deferred

- Bump MRs interleave with story MRs and (eventually)
  merge-transaction MRs. Auto-merging changes the baseline for
  in-flight stories.
- "Always auto-merge if green" is a footgun if a future bump
  pulls in a managed-repo version that introduces a behaviour
  change (the `validate:compose` gate is aliveness, not
  behaviour).
- v0.14.0 keeps the human in the loop deliberately while the
  auto-tag-and-bump flow is new. Once it has been exercised on
  real projects, opt-in auto-merge becomes a safer default.

### Proposal

Pull-driven — wait for a real project to ask. When implemented,
likely behind an opt-in flag in `project.yaml.providers.ci`
(e.g. `auto_merge_topology_bumps: true`).


---

## I-068: `scm.move_file` action — atomic file relocation

**Category:** SCM provider tooling
**Priority:** Low (delete + create works today; move is a
hygiene improvement)
**Discovered:** 2026-05-06, locking the v0.14.0 I-063 design

### Problem

I-063's locked design extends `scm.push_files` with `create` /
`update` / `delete` action kinds. GitLab's commits API also
supports `move` (an atomic rename of a path), but the
methodology hasn't surfaced a use case yet.

A future use case: if the methodology decides to relocate
artefacts (e.g. `pats/<story>.cy.js` → `pats/compiled/<story>.cy.js`
during a layout reorganisation), `move` would do it atomically
in one commit; the alternative is `delete` + `create`, which
loses the git rename detection and produces a worse `git log
--follow` experience for downstream readers.

### Why low priority

No call site today. Premature without a concrete need; the
contract from I-063 (`actions[]` with create/update/delete)
covers everything in v0.14.0 + foreseeable v0.14.x scope.

Pull-driven — extend `scm.push_files` `actions[]` to accept
`{ action: "move", file_path: <new>, previous_path: <old> }`
when a real call site appears.
