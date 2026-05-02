# Changelog

All notable changes to Methodology M are documented in this file.

## [Unreleased]

## [0.12.0] — 2026-05-02

### Added

- **I-040 — Topology changes (ADD).** A project's component set can
  evolve mid-project via the standard story flow. Adding a component
  is a structural-ADD story whose `decompose-story` runs in two
  phases: Phase A authors the sub-task markdown + readiness tracker
  (no SCM mutation, no `project.yaml` write); the new managed repo is
  then scaffolded via the existing `scaffold-repo` capability; Phase
  B mutates `project.yaml` and re-renders all topology artefacts
  deterministically. `generate-pats` produces a one-AC story PAT
  whose check is `GET http://<new-component>:<port>/health` →
  status 200 + body contains 'ok' (direct chain from v0.11.0's HTTP
  step types into v0.12.0's structural assertion). `compile-story-pats`
  compiles it through the cypress provider via single-provider
  absorption (v0.11.0). The gate MR carries the compiled CAT, the
  readiness tracker, and the regenerated topology files
  (`docker-compose.yml`, `.gitlab-ci.yml`, `scripts/integration-test.sh`,
  `scripts/report-shadow-status.sh`, `scripts/detect-story-trigger.sh`,
  plus the mutated `project.yaml`).

  **Scope.** v0.12.0 ships ADD only. REMOVE / RENAME / MERGE / SPLIT
  / PORT-CHANGE follow as separate v0.12.x items per the locked
  design (filed in #18). Each has materially different complexity
  (in-flight story policy for REMOVE; cross-repo rewire for RENAME;
  combinations for MERGE/SPLIT) — bundling them inflated risk for no
  shared gain.

  **No new code in this release.** The capability composition was
  already in place: `decompose-story` Phase A/B (#18), `generate-pats`,
  `compile-story-pats` + `test.cat.cypress` (v0.6.0), HTTP step types
  in PAT yaml + cypress absorption (v0.11.0), pure-function topology
  renderer (v0.5.1), `scm.push_or_update_files` (v0.5.1). v0.12.0
  ships I-040 because the end-to-end ADD flow is now demonstrated
  against a real workshop testbed.

  **L4 evidence (2026-05-02).** TODOM-S02 — add a `metrics`
  component (port 3004) — executed end-to-end against the live
  `todo-m-workshop` testbed (`/tmp/m-i040/todo-m-root`). Phase A
  produced `workshop/jira/TODOM-S02/TODOM-S02a.md` and
  `stories/TODOM-S02.yaml`. `scaffold-repo` seeded
  `methodology-m/todo-m-workshop/todo-m-metrics` on GitLab. Phase B
  mutated `project.yaml` (new `metrics` component + new health
  endpoint) and the renderer regenerated all five topology artefacts
  byte-deterministically. `generate-pats` produced
  `pats/TODOM-S02.pat.yaml` (single AC, HTTP probe shape).
  `compile-story-pats` compiled it to `pats/TODOM-S02.cy.js` via the
  cypress provider and pushed the bundle to root MR
  `feat/TODOM-S02d-integration-gate` (!35).

  Local execution: topology aliveness probes 5/5 pass (shell, mfe,
  api-read, api-write, **metrics**). `pats/TODOM-S02.cy.js` 1/1 pass
  via `cypress/included:14.5.4` on the `todo-m-root_default` compose
  network. `pats/TODOM-000.cy.js` regression 6/6 pass — adding
  metrics did not perturb the existing browser-level ACs.

  **L5 evidence (2026-05-02).** Root MR !35 on
  `methodology-m/todo-m-workshop/todo-m-root` carries the bundled
  structural change (9 files: project.yaml, docker-compose.yml,
  three regenerated scripts, .gitlab-ci.yml, the readiness tracker,
  the PAT yaml, and the compiled CAT). GitLab pipeline **2495405820**
  — install / build / test / `validate:compose` /
  `validate:integration-test` — all 5 jobs **success**.
  `validate:compose` (113s on a real saas-linux runner) cloned all
  five sibling repos including `todo-m-metrics` from main, built
  and started the docker-compose stack, and ran the regenerated
  `scripts/integration-test.sh` — all 5 aliveness probes pass
  including the new metrics probe. The `pats/TODOM-S02.cy.js` spec
  itself is not currently executed by `validate:integration-test`
  on root (the script is a placeholder echoing
  `'integration-test: validated locally — CI integration requires
  Docker (see I-014)'`); cypress-in-CI for the root pipeline is
  pre-existing I-014 territory and is orthogonal to I-040 scope.
  L5 of the cypress spec is the L4 local run above.

  Changes:
  - `CHANGELOG.md` — this entry.
  - `docs/roadmap.md` — v0.12.0 row marked shipped.
  - `docs/improvements-and-ideas.md` — I-040 status flipped to
    Resolved + Resolved-table entry. I-059 and I-060 filed (see
    below).
  - `workshop/jira/TODOM-S02/` — story prose, enriched form, and
    sub-task TODOM-S02a authored by Phase A and used as the live
    evidence input.
  - `.gitignore` — covers the project-root `hemingway-bridge.md`
    location formalised in steering on 2026-04-26.

- **I-059 / I-060 — filed during v0.12.0 evidence run.** Two
  low-priority papercuts surfaced and were filed for follow-up,
  neither blocks I-040. **I-059:** `cli/src/lib/topology.mjs`
  uses a hand-rolled YAML scanner that overwrites
  `currentComponent.type` from later top-level blocks like
  `persistence:`, silently undercounting referenced repos in
  `m clone`. Fix direction: replace with `js-yaml` (already
  vendored). **I-060:** `pats/TODOM-000.pat.yaml` copies in the
  pass1 snapshot and live workshop predate the current schema and
  fail `js-yaml.load` — runtime is unaffected (compiled `.cy.js`
  is what cypress runs) but re-compilation is broken. Both
  documented in `docs/improvements-and-ideas.md`.

## [0.11.0] — 2026-04-26

### Added

- **I-045 — HTTP step types in PAT yaml.** Three new step verbs —
  `http:`, `expect-status:`, `expect-body-contains:` — extend the
  `pat.schema.json` step grammar with HTTP-level assertions,
  unblocking structural stories (TODOM-S01) whose natural check is
  "does the new component respond at /health?". The cypress provider
  absorbs them via `cy.request(...).as('lastResponse')`; subsequent
  `expect-status`/`expect-body-contains` steps assert against the
  `@lastResponse` alias. Mixed PATs (browser AC + HTTP AC, or both
  verbs in the same AC) compile to a single `.cy.js` — no
  multi-framework coordination, no AC-level kind tag.

  **Methodology stance.** This release deliberately departs from the
  earlier roadmap plan of "add `curl`/`supertest` providers and a
  framework selector". Instead: PAT step types stay framework-agnostic
  at the schema layer, and the cypress provider absorbs HTTP via
  `cy.request`. A standalone backend-only provider remains deferred
  until a real backend-only project demands one. Rationale: one
  runner, one CI invocation, no framework-selection logic in
  `compile-story-pats`, and `cy.request` is genuinely capable for
  every HTTP shape we need at MVP.

  Changes:
  - `.m/schemas/pat.schema.json` — three new entries in the `step`
    `oneOf`, three new `$defs` (`step-http`, `step-expect-status`,
    `step-expect-body-contains`). Existing browser step types are
    untouched; existing PATs still validate without modification.
  - `.m/providers/test/cat/cypress.mjs` — three new cases in the
    `compileStep` switch and three matching helpers (`compileHttp`,
    `compileExpectStatus`, `compileExpectBodyContains`). `compileHttp`
    embeds the JSON body literal directly (JSON ⊂ JS) so request
    options stay readable; `compileExpectBodyContains` coerces
    object bodies via `JSON.stringify` before substring match.
  - `.m/providers/test/cat/cypress.test.mjs` — new file. Closes the
    pre-existing gap where `cypress.md` referenced a regression
    suite that did not exist. 29 tests covering all browser steps
    (regression net), the three new HTTP steps, mixed PATs, and
    determinism.
  - `.m/providers/test/cat/cypress.md` — provider doc grows an HTTP
    steps table, grammar notes, and the methodology-stance callout.
  - `docs/improvements-and-ideas.md` — I-045 marked Resolved with a
    "Changes in v0.11.0" subsection and a note explaining the
    single-provider absorption stance.
  - `docs/roadmap.md` — v0.11.0 row marked shipped; v0.11.0 entry
    rewritten to reflect the absorption stance; remaining
    critical-path estimate updated.

  Migration note: none. Existing PATs (`navigate`/`click`/`type`/`assert`/`wait`/`render`)
  validate and compile byte-identically. Authors who want HTTP
  assertions add the new step verbs to new ACs.

  **L4 evidence (2026-04-26).** Validated against the live
  `todo-m-workshop` testbed (`/tmp/m-l1/todo-m-root`). A
  three-AC PAT (two HTTP-only ACs against `api-read:3002/health`
  and `api-write:3003/health`, one mixed AC combining `navigate:`
  with an HTTP probe) compiled cleanly through the v0.11.0
  cypress provider and was executed via the
  `cypress/included:14.5.4` container on the
  `todo-m-root_default` compose network.

  Initial run: 2/3 pass. Both pure-HTTP ACs evaluated correctly
  against the running services
  (`cy.request(...).as('lastResponse')`, `expect-status: 200`,
  and `expect-body-contains: 'ok'`). The mixed AC failed at
  `cy.visit('/')` with a `ScriptExternalLoadError` on the shell's
  `main.js` — reproduced on the existing TODOM-000 spec on the
  same stack. Pre-existing workshop runtime issue (filed and
  resolved same-day as **I-058**, see backlog).

  Post-I-058 run: **TODOM-000 6/6 pass + TODOM-L4 3/3 pass.**
  v0.11.0 HTTP step types are functionally validated, including
  the mixed-AC case (browser + HTTP in one `it()` block). Full
  structural-ADD-flow exit criterion still requires I-040 to
  land in v0.12.0.

## [0.10.1] — 2026-04-25

### Fixed

- **I-057 — `report-failure-to-root` curl fails with "bad range in
  URL".** v0.10.0's `report-failure-to-root` job constructs a URL
  with `variables[KEY]=VAL` form syntax (GitLab's pipeline trigger
  endpoint expects this form). curl interprets the `[` and `]` as
  numeric-range glob syntax and exits code 3 with
  `bad range in URL position 114` before sending any request, so
  no fan-out happens. Caught immediately in L5 validation
  (workshop api-write MR #9, pipeline 2479189751).

  Fix: add `-g` (`--globoff`) to the curl invocation in
  `.m/capabilities/scaffold-repo/SKILL.md`'s managed-repo
  pipeline template. With globoff, brackets are treated literally
  and the request goes through.

  Migration note: existing M-type projects on v0.10.0 need to
  re-render or hand-patch `.gitlab-ci.yml` on each managed repo
  to add `-g` to the curl call. One-line surgical edit.

## [0.10.0] — 2026-04-25

### Fixed

- **I-056 — pipeline-failure fan-out delivery on GitLab.com.** v0.8.0
  shipped I-032's renderer-side correctly, but the delivery mechanism
  it assumed (a `pipeline_events` webhook on each managed repo whose
  URL is root's trigger endpoint) is 403-blocked on GitLab.com. The
  trigger endpoint specifically rejects any request carrying
  `X-Gitlab-Event: Pipeline Hook` (loop-prevention guard). The MR
  webhook (identical URL, `Merge Request Hook` header) passes
  through cleanly. Repeated 403s also caused GitLab to auto-disable
  the webhook. Discovered 2026-04-24 during L4 workshop E2E.

  Fix: replace the pipeline-events webhook with a
  `report-failure-to-root` CI job in scaffold-repo's managed-repo
  pipeline template. The job runs in the implicit `.post` stage
  with `when: on_failure` on MR pipelines and main pushes,
  curl-POSTs root's trigger endpoint with `EVENT_KIND=pipeline`,
  `SOURCE_PROJECT_ID`, `SOURCE_PROJECT_PATH`, and
  `SOURCE_PIPELINE_ID`. Running under CI job context strips the
  `X-Gitlab-Event` header and the request goes through.

  Changes:
  - `.m/capabilities/scaffold-repo/SKILL.md` — managed-repo pipeline
    template gains the `report-failure-to-root` job; lifecycle phase
    contract table extended with the `.post` row.
  - `.m/capabilities/wire-orchestration/SKILL.md` — Step 3 collapses
    to one MR webhook per managed repo (push + pipeline events
    explicitly disabled). Step 4 adds a new subsection wiring
    `M_TRIGGER_TOKEN` and `ROOT_PROJECT_ID` as CI variables on each
    managed repo so the new job can authenticate against root.
    Detect-stage description updated to describe the dual delivery
    (MR webhook for `mr` events, CI-job for `pipeline` events).
  - `.m/providers/ci/gitlab.mjs` — comment touch-ups on the detect
    script and `shadow:detect-trigger` job naming both delivery
    paths. No code change to the rendered root pipeline.
  - `docs/improvements-and-ideas.md` — I-056 marked Resolved with
    a "Changes in v0.10.0" subsection and migration note. I-032's
    Resolved-table entry consolidated to span both halves of the
    fix (renderer in v0.8.0, delivery in v0.10.0).
  - `docs/roadmap.md` — v0.10.0 row marked shipped; remaining
    critical-path estimate updated.

  Migration note: existing M-type projects on v0.8.x or v0.9.x
  need to (1) re-scaffold or re-render `.gitlab-ci.yml` on each
  managed repo so it gets the new `report-failure-to-root` job,
  (2) delete the `pipeline_events` webhook on each managed repo
  (keep the `merge_request_events` one), (3) set `M_TRIGGER_TOKEN`
  and `ROOT_PROJECT_ID` as CI variables on each managed repo
  (re-running `wire-orchestration` does this idempotently).

## [0.9.0] — 2026-04-23

### Fixed

- **I-055 — bootstrap paradox in shadow:detect-trigger.** Pre-v0.9.0
  classification treated "no readiness tracker on main" as a skip
  signal, but during a story's active lifetime the tracker lives
  exclusively on the gate MR's branch — never on main until the gate
  MR merges at story completion. Story MRs were therefore
  permanently classified as `standalone`, and AOT never ran.

  Fix (Option Y): classification now uses **live open-MR enumeration**
  as the authority for active-story state. The readiness tracker on
  main is consulted ONLY to filter out follow-up MRs targeting
  already-completed stories (e.g. `hotfix/TODOM-001-x` on a merged
  story's ID). A tracker absent from main no longer disqualifies a
  story — that's the normal state during development.

  Same fix applied symmetrically to the `EVENT_KIND=pipeline` branch:
  a failing pipeline whose ref encodes a story ID triggers the
  `pipeline-failure` fan-out unless the story is already marked
  complete on main.

  Changes:
  - `.m/providers/ci/gitlab.mjs` — `renderDetectStoryTrigger`
    rewritten with Option Y semantics. Classification-semantics
    comment block added to the generated script.
  - `.m/capabilities/wire-orchestration/SKILL.md` — "Detect stage"
    section expanded with an explicit Option Y paragraph.
  - `.m/providers/ci/gitlab.test.mjs` — new regression suite `I-055
    Option Y classification semantics` (5 tests) locking the new
    contract and guarding the intent-narrating comment against silent
    reversion.

  Discovered during L4 story-E2E testing on the todo-m-workshop
  testbed — the first sub-task MR of TODOM-001 triggered AOT but
  detect-trigger classified it as standalone, leaving the entire
  story unwatchable.

### Methodology

- `decompose-story` and `compile-story-pats` SKILLs unchanged.
  Tracker continues to be staged locally by decompose-story and
  bundled onto the gate MR branch by compile-story-pats —
  `merge-transaction` reads it from there at completion time.
  Separating classification (live MR state) from orchestration
  metadata (the tracker) is the v0.9.0 reconceptualisation.

### Migration

- Any M-type project on v0.8.x must re-render
  `scripts/detect-story-trigger.sh` from the v0.9.0 provider and push
  it to root repo main before opening further story MRs. The workshop
  retrofit accompanying this release is the reference procedure.

### Docs

- **`wire-orchestration` SKILL — CI variable protection prerequisite**
  (I-053). Step 4 now documents that `protected: true` CI variables
  are only exposed to pipelines on protected refs; `shadow:detect-trigger`
  silently fails if the root repo's main branch is unprotected and
  `M_GROUP_TOKEN` is marked protected. Adds a carve-out for testbed
  projects (use `protected: false, masked: true`) and a "do not mix"
  warning — all shadow-pipeline variables must agree on the protected
  flag. Surfaced during L3 standalone-MR smoke test on the
  todo-m-workshop testbed.

- **Backlog entries for two L3 findings:**
  - **I-053** — CI variable protection prerequisite (resolved in this
    release as a SKILL note).
  - **I-054** — standalone trigger pipelines hang in `manual` state
    (GitLab rules can't gate `when: manual` on dotenv variables) and
    burn ~2–3 min of CI on skip-only containers. Cosmetic + cost
    concern, not functional. Tier 4 / deferred.

## [0.8.0] — 2026-04-22

### Added

- **I-031 — pre-AOT invalidation restored.** `ci/gitlab` now emits a
  new `shadow:invalidate-status` job on the `detect` stage, gated on
  `TRIGGER_MODE=story`. It runs `report-shadow-status.sh pending` to
  push `pending` to every open story MR (root + managed) before
  `shadow:compose` starts. `shadow:compose` declares
  `needs: [shadow:invalidate-status]` so invalidation always lands
  first — stale green can no longer race the gate while compose +
  integration-test run. Closes the regression the v0.5.0 I-036
  extraction introduced by silently dropping this job from the
  renderer.

- **I-032 — managed-repo pipeline-failure fan-out restored.** Two
  surface changes:

  1. **`wire-orchestration` Step 3** now installs **two webhooks per
     managed repo** — one `merge_request`-only webhook with
     `variables[EVENT_KIND]=mr` and one `pipeline`-only webhook with
     `variables[EVENT_KIND]=pipeline`. GitLab pipeline triggers
     (`/trigger/pipeline`) do not forward webhook payloads into
     triggered pipelines — only URL query variables become CI
     variables — so `EVENT_KIND` is the only way for
     `shadow:detect-trigger` to know which event fired.

  2. **`shadow:detect-trigger` branches on `$EVENT_KIND`.** On
     pipeline events it queries the source project's recent pipelines
     (`GET /projects/:id/pipelines?per_page=10`), filters
     `status=failed`, extracts any `[A-Z]+-\d+` story ID from the
     failing pipeline's ref, validates it against the root repo's
     readiness tracker, and emits `TRIGGER_MODE=pipeline-failure` +
     `STORY_ID`. Non-failure pipeline events, failures on non-story
     branches, and failures against completed stories all fall through
     to `TRIGGER_MODE=standalone` (no shadow work runs).

  A new `shadow:fanout-failure` job on the `report-status` stage gates
  on `TRIGGER_MODE=pipeline-failure`, skips compose + integration-test
  entirely, and calls `report-shadow-status.sh failed` to fan out
  `failed` to every sibling story MR. Closes the regression where
  managed-repo pipeline failures left sibling MRs with stale green
  status until the next MR event.

### Changed

- **`shadow:detect-trigger` emits both `STORY_ID` and `TRIGGER_MODE`**
  to `detect.env`. Downstream jobs no longer skip on empty `STORY_ID`
  — they skip unless `TRIGGER_MODE` matches their expected mode
  (`story` for compose/integration-test/report/merge-transaction;
  `pipeline-failure` for `shadow:fanout-failure`). The tri-state
  classification (`story` | `pipeline-failure` | `standalone`) is
  explicit at the dotenv boundary rather than inferred from a single
  flag.

- **`wire-orchestration` SKILL updated** to document the two-webhook
  topology, the new `shadow:invalidate-status` and
  `shadow:fanout-failure` jobs, and the `TRIGGER_MODE` gating
  discipline. The "Known regressions scheduled for v0.8.0" callout is
  retired.

### Regression coverage

- `ci/gitlab.test.mjs` adds two new test suites — `I-031 pre-AOT
  invalidation` and `I-032 pipeline-failure fan-out` — so the v0.5.0
  silent-simplification pattern cannot drop either behaviour again
  without the test suite failing.

## [0.7.0] — 2026-04-22

### Added

- **I-030 — story vs standalone MR classification.** Every managed-repo
  MR used to fire the root pipeline's shadow stages unconditionally.
  Hotfixes, dependency bumps, refactors, and follow-up MRs to merged
  stories all burned through compose + integration-test for nothing.
  v0.7.0 adds a `detect` stage with a new `shadow:detect-trigger` job
  that classifies each trigger as either **story MR** or **standalone
  MR** using **authority-based detection**:

  1. Query the GitLab API for all open MRs across root + managed repos
  2. Extract any `[A-Z]+-\d+` pattern from each source branch
  3. Cross-check against the root repo's `stories/<story-id>.yaml`
     readiness tracker
  4. If any match has `status != completed` → story MR; emit
     `STORY_ID=<id>` to `detect.env`
  5. Otherwise → standalone; emit empty `STORY_ID`

  No branch-name convention is imposed. The readiness tracker is the
  single source of truth for "is this story active?" — which covers
  branches with no story ID, branches referencing non-existent stories,
  and follow-up MRs to completed stories as a single rule.

  Each downstream `shadow:*` and `merge-transaction` job consumes the
  dotenv artifact via `needs: … artifacts: true` and early-exits when
  `$STORY_ID` is empty. Standalone MRs' triggers now run `detect-trigger`
  only (a single curl loop, ~10s) and stop cleanly.

- **New `scripts/detect-story-trigger.sh`** emitted by `ci/gitlab`
  alongside `scripts/report-shadow-status.sh`. Pure function of
  `project.yaml`; same determinism guarantees as the rest of the
  provider's output.

### Changed

- **`wire-orchestration` Step 3 — webhook URL construction.** The
  capability now builds webhook URLs that encode per-repo context as
  static pipeline-trigger variables in the query string:

        https://<host>/api/v4/projects/<root>/ref/main/trigger/pipeline
              ?token=<token>
              &variables[SOURCE_PROJECT_ID]=<managed-id>
              &variables[SOURCE_PROJECT_PATH]=<url-encoded-path>

  GitLab webhooks preserve URL query strings verbatim when POSTing, and
  the trigger endpoint accepts `variables[KEY]=value` pairs natively.
  No middleman service, no Premium features — pure webhook wiring on
  Free tier. Closes the silent gap where `$SOURCE_PROJECT_ID` /
  `$SOURCE_PROJECT_PATH` referenced by the shadow pipeline were never
  actually set.

- **`.gitlab-ci.yml` stages** now include `detect` between `test` and
  `compose`: `install → build → test → detect → compose →
  integration-test → report-status → merge-transaction`.

- **`wire-orchestration` SKILL** aligned to what `ci/gitlab.mjs`
  actually renders. Removed aspirational references to pre-v0.5.0
  jobs (`shadow:invalidate-status`, `shadow:integration`, and the old
  `detect-trigger` with `aot_integration`/`cascade_merge`/`pipeline_failure`
  classification) that were dropped during the I-036 extraction but
  still appeared in the doc.

### Deferred

- **I-031 + I-032 reopened as regressed and scheduled for v0.8.0.**
  Both were marked ✅ Resolved in the backlog but their behaviours
  (pre-AOT invalidation; pipeline-failure detect-trigger branch) were
  silently dropped during the v0.5.0 I-036 CI extraction. Now tracked
  as `⚠️ Regressed 2026-04-22` in `docs/improvements-and-ideas.md` and
  bundled as v0.8.0 in the roadmap. They piggyback on the
  `shadow:detect-trigger` machinery this release introduces — same
  touchpoint, one dotenv, minimal additional surface.

## [0.6.0] — 2026-04-21

### Added

- **I-042 — story lifecycle reshuffle.** `decompose-story` now runs
  BEFORE `generate-pats`. Sub-task PAT authoring finally works with
  the parent story in scope. The old order (generate-pats first,
  then decompose-story) left sub-task PAT generation stranded — no
  capability was positioned to produce them cleanly. The new order
  is:

      decompose-story → generate-pats → compile-story-pats

  `decompose-story` now reads story prose alone (no `pat-file`
  parameter) and produces sub-task markdown + readiness tracker.
  `generate-pats` reads the decomposition output and produces the
  story-level PAT **plus** one `<sub-task-id>.pat.yaml` per sub-task
  with `parent-story:` / `component:` anchoring. Closes I-042 and
  retires the PAT-stub-in-markdown workaround that I-038 flagged
  (the sub-task branch of `pat.schema.json` was already in place
  from prior work — this release wires it up).

- **`compile-story-pats` capability.** Extracted from the pre-v0.6.0
  `decompose-story` Step 4. Takes a story-level PAT, dispatches
  through the active `test.cat.*` provider for CAT compilation,
  bundles the compiled spec with any staged topology artefacts and
  the readiness tracker, and raises the root-repo integration-gate
  MR. Invoked by the agent as:

        node .m/capabilities/compile-story-pats/compile.mjs \
          --pat <path> --project-yaml <path> --target-dir <path>

  The `decompose-story` capability now makes zero SCM calls —
  structural stories stage topology artefacts locally for
  `compile-story-pats` to pick up.

- **New `test.cat.*` provider namespace.** Following the same
  pattern v0.5.1 introduced for `compose.*` and `ci.*`, CAT
  compilation is now provider-based. Projects select a compilation
  strategy via `project.yaml`:

        providers:
          test:
            cat: cypress

  Reference providers shipped:
  - `test/cat/cypress.{md,mjs}` — reference implementation. The
    PAT-step-to-Cypress mapping that previously lived as an
    interpretive table in `decompose-story` is now pure-function
    code. Byte-identical output to the pre-extraction flow for the
    reference TODOM fixtures (after the schema fix below).
  - `test/cat/log-only.{md,mjs}` — trace stub matching the
    `compose/log-only` and `ci/log-only` pattern. Emits a
    `pats/<story-id>.trace.txt` file recording what was dispatched.

  I-045 (v0.8.0) will extend this namespace with `curl` and
  `supertest` providers for HTTP step types, without touching
  `compile-story-pats` itself — that is the architectural win
  that motivated pulling the extraction forward.

- **New `.claude/skills/compile-story-pats/SKILL.md` wrapper** and
  matching `cli/templates/claude/skills/compile-story-pats/`
  template so `m init` distributes the new capability.

### Changed

- **PAT yaml step grammar is now valid YAML.** The previous step
  format (`- assert: "[data-testid='X']" is visible`) parsed
  correctly in no standard YAML parser — the outer `"` closed on
  `]` and the trailing predicate was a syntax error. It only
  "worked" because nothing programmatic had ever parsed PAT yaml;
  I-042's first parse path uncovered the gap. The grammar now
  wraps each step value in a single pair of outer double quotes
  and uses single-quoted inner string literals:

        # Before — invalid yaml
        - assert: "[data-testid='todo-list']" contains "Buy milk"

        # After — parses
        - assert: "[data-testid='todo-list'] contains 'Buy milk'"

  `pat.schema.json` step patterns updated accordingly. Existing
  workshop PATs (`workshop/jira/TODOM-000`, `workshop/jira/TODOM-001`)
  rewritten to the new format. Inner text values may not contain a
  single quote (enforced by schema regex).

- **Provider interface doc** (`.m/providers/provider-interface.md`)
  adds the `test.cat.*` namespace section with function contracts
  and updates the `scm.*` caller references from `decompose-story`
  to `compile-story-pats`.

- **Methodology docs** (`docs/methodology.md`, `README.md`,
  `.m/m.md`) updated to reflect the new lifecycle order and the
  `compile-story-pats` capability.

- **`bootstrap-root-repo` Step 8** now offers `decompose-story` as
  the post-bootstrap delegation target, not `generate-pats`.
  Matches the new lifecycle.

- **`scaffold-repo`** now takes a `sub-task-pat` parameter and
  writes `pats/<sub-task-id>.pat.yaml` into the managed repo
  instead of the retired `pats/<sub-task-id>.stub` pseudocode file.

- **`generate-acceptance-tests`** reads sub-task PAT yaml directly
  (not the retired stub). The PAT-to-Cypress mapping is delegated
  to the `test.cat.cypress` provider's contract doc — authoritative
  reference. Full provider-backed sub-task compilation is deferred
  to a follow-up after I-045.

### Deferred / forward-looking

- **I-045 (multi-framework PAT yaml) pulled into MVP scope** as
  v0.8.0, landing BEFORE I-040 (topology changes). Reason: I-045
  collapses the integration-test.sh aliveness-probe workaround
  into the standard CAT compilation flow, which cleans up I-040's
  structural-story implementation. Roadmap re-sequenced to:
  v0.6.0 I-042 → v0.7.0 I-030 → v0.8.0 I-045 → v0.9.0 I-040 →
  v0.10.0 I-004 → v1.0.0 MVP.

- **`generate-acceptance-tests` full provider-backed rewrite**
  deferred to a follow-up after I-045 — the capability's
  repo-specific concerns (test deps, CI wiring, API stubs, mock
  data) are not pure mapping and remain SKILL-shaped for now.

## [0.5.1] — 2026-04-18

### Added

- **I-049 scoped to topology rendering — deterministic capabilities as
  code.** The `render-topology-artefacts` capability and both of its
  reference providers (`compose/docker-compose`, `ci/gitlab`) are now
  executable Node modules co-located with their SKILL contracts under
  `.m/`. No `m` CLI command is added; the orchestrator is invoked by
  the agent via:

        node .m/capabilities/render-topology-artefacts/render.mjs \
          --project-yaml <path> --target-dir <path>

  Resolves the gap called out in v0.5.0: byte-identical output is no
  longer an agent-discipline claim, it's mechanically enforced by
  pure-function provider code + orchestrator dispatch. `.md` files
  shrink to thin contracts (purpose, signature, invocation, invariants,
  implementation pointer); rendering rules move to JSDoc in the code
  and to the co-located test suite.

- **Log-only providers for the `compose.*` and `ci.*` namespaces** —
  `compose/log-only.mjs` and `ci/log-only.mjs`. Trace stubs that emit
  a single file recording what was dispatched and with what
  top-level inputs. Useful for exercising the orchestrator's
  resolution + dispatch without running a real render.

- **`scm.push_or_update_files` function** in the `scm.*` provider
  interface. Implementations in `scm/gitlab.md` (with both the
  preferred atomic `POST /repository/commits` path and the current
  interim `N × create_or_update_file` fallback) and `scm/log-only.md`.
  Closes I-051 — decompose-story S-4 no longer requires a
  `git commit + git push` shell fallback because the topology files
  already exist on the branch from bootstrap-root-repo. The
  function contract does not mandate atomicity; providers may
  implement as a single bulk commit or as per-file updates.

- **`scripts/e2e-harness.mjs` — I-050 thin.** A Node script
  (development-only, not distributed) that scripts the v0.5.0
  live-validation flow programmatically: render TODOM-S01 → create
  scratch branch → push via interim `push_or_update_files` → raise
  MR → poll pipeline → assert green → teardown. Zero-dep beyond
  Node ≥18 (uses global `fetch`). Seed for the full I-050 capability
  regression harness (bootstrap + scaffold + wire + all structural
  operations), which remains a separate arc.

- **Vendored `js-yaml` 4.1.1** at `.m/vendor/js-yaml.mjs`. Single-file
  ESM vendored from upstream MIT release so the orchestrator can
  parse `project.yaml` without user projects having to install any
  dependency. Refresh procedure documented at
  `.m/vendor/README.md`.

- **Co-located test suite under `.m/`.** 80 tests across
  `docker-compose.test.mjs`, `gitlab.test.mjs`, and `render.test.mjs`
  cover every provider branch and orchestrator path. Fixtures live at
  `.m/test-fixtures/`. Run via `node --test .m/`. Distributed package
  excludes `*.test.mjs` and `test-fixtures/` via a snapshot-dist
  filter.

### Changed

- **`decompose-story` SKILL S-4** now calls
  `scm.push_or_update_files` instead of `scm.push_files`. The
  topology files (`docker-compose.yml`, `.gitlab-ci.yml`,
  `scripts/integration-test.sh`, `scripts/report-shadow-status.sh`)
  exist on the branch from bootstrap, so the old `push_files` call
  would have failed on every structural story.

- **`decompose-story` S-2 and `bootstrap-root-repo` Step 6** now
  describe the orchestrator invocation as a real shell command (the
  `node .m/capabilities/...` pattern above) rather than a pseudo-
  function call. The distinction matters — the orchestrator is
  executable code that produces byte-deterministic output, not a
  SKILL the agent interprets.

- **`.m/providers/compose/docker-compose.md`** shrunk from 382 → 94
  lines. Rendering rules moved to JSDoc in the `.mjs` + the test
  suite.

- **`.m/providers/ci/gitlab.md`** shrunk from 486 → 112 lines. Same
  treatment.

- **`.m/capabilities/render-topology-artefacts/SKILL.md`** restructured
  as a thin contract + invocation specification (exit codes,
  provider resolution rules, stdout/stderr convention) pointing at
  `render.mjs` and `render.test.mjs`.

### Fixed

- **snapshot-dist.mjs** now bundles `.m/providers/compose/`,
  `.m/providers/ci/`, and `.m/vendor/` into `cli/dist-m/`. Latent
  v0.5.0 bug where the compose and CI provider SKILL docs were not
  included in the published npm package is now closed. snapshot-dist
  also filters out `*.test.mjs` files and `test-fixtures/` so tests
  never ship to user projects.

### Live end-to-end validation (2026-04-18)

The `scripts/e2e-harness.mjs` harness ran against
`methodology-m/todo-m-workshop` and completed green:

- **MR !29** on `todo-m-root` (closed + branch deleted by the
  harness teardown). Pipeline **2462335312**.
- All 5 jobs green in 302.6s walltime: `install`, `build`, `test`,
  `validate:compose`, `validate:integration-test`.
- Pipeline ran on the output of the new Node orchestrator + Node
  provider modules. Byte determinism verified mechanically (same
  fixture → same output across runs) by the co-located tests;
  end-to-end pipeline green demonstrates those bytes are valid at
  the integration layer.

### Known gaps and scope honesty

Remaining work after v0.5.1 — filed, sized, and scheduled:

- **I-049 full.** This release migrates the topology renderer only.
  Other deterministic units (PAT→CAT compilation, readiness tracker
  ops, schema validation as a standalone module, parts of `scm/*`
  that are pure dispatch) are still SKILL-interpreted. Migrate per
  capability per future arc.

- **`scm.push_or_update_files` atomicity.** The v0.5.1 gitlab
  implementation uses N per-file `create_or_update_file` calls
  because no MCP wrapper exists for `POST /repository/commits` with
  mixed actions. Functionally correct but N commits instead of one.
  Atomic single-commit path is documented in the provider SKILL for
  future MCP tooling work.

- **I-050 full.** The thin harness shipped here exercises the renderer
  + push path only. Extending to bootstrap + scaffold + wire + all
  structural operations (REMOVE, RENAME, MERGE, SPLIT, PORT-CHANGE)
  is a separate arc.

- **I-047 (project.yaml AI-generated from Story Zero)** is now clean
  to build on. The renderer is real code; I-047's output has a
  verifiable target.

## [0.5.0] — 2026-04-15

### Added

- **`render-topology-artefacts` capability** — new orchestrator at
  `.m/capabilities/render-topology-artefacts/` that is the single
  chokepoint for regenerating all topology-derived files from
  `project.yaml`. Reads + validates the manifest, resolves the active
  compose and CI providers, dispatches through their render functions,
  and writes the returned file set to disk. Pure function of
  `project.yaml` — same input produces byte-identical output. Called
  by `bootstrap-root-repo` (initial seed) and `decompose-story`
  (structural regeneration). Closes I-036.

- **`compose.*` provider namespace** — new namespace for compose
  orchestration and aliveness. Single function
  `compose.render_topology(project)` returns a pure `{path, content}[]`
  file set. Ships with `compose/docker-compose` reference provider
  emitting `docker-compose.yml` and `scripts/integration-test.sh`
  (POSIX sh, pinned `check()` framework, `DOCKER_GATEWAY` default,
  topology-derived probe blocks + story integrity gate).

- **`ci.*` provider namespace** — new namespace for CI pipeline and
  status reporting. Single function
  `ci.render_pipeline(project, scm)` returns a pure `{path, content}[]`
  file set. Ships with `ci/gitlab` reference provider emitting
  `.gitlab-ci.yml` (stages + shell-lifecycle-conditional-on-embedded-shell
  + orchestration jobs delegating to scripts) and
  `scripts/report-shadow-status.sh` (curl+REST-based single-arg state
  reporter, REPOS and GROUP substituted at render time — matches
  pass1's proven pattern, no additional alpine install step required).

- **TODOM-S01 committed structural fixture** — first committed
  regression fixture at `workshop/jira/TODOM-S01/TODOM-S01.md`. Minimal
  ADD-type structural story (add `analytics` backend on port 3004)
  exercises every line of decompose-story's S-1 through S-4. CHANGELOG
  and docs have referenced this fixture since v0.4.0 but the actual
  file was never committed — it was an ad-hoc test artefact that got
  lost. Now permanent.

- **Schema: `providers.compose` and `providers.ci` fields** formally
  declared in `.m/schemas/project.schema.json`. Both optional with
  fall-back resolution rules (compose from `compose.integration.strategy`;
  ci from `providers.scm`).

- **I-047** improvement item — project.yaml should be AI-generated
  from Story Zero. Filed in Tier 1 as the natural follow-up to I-036:
  the renderer is meaningless if its input is still human-typed.

- **I-048** improvement item — switch `report-shadow-status.sh` from
  curl+REST to the `glab` CLI. Filed in Tier 4 (polish). Purely a
  QoL improvement; blocked on alpine apk install story for `glab`.
  No functional change.

- **I-049** improvement item (Tier 1, High) — **Deterministic
  capabilities as code, interpretive as SKILLs.** Flips M's execution
  model: pure-function operations (renderer, PAT→CAT compilation,
  schema validation, integrity checks) should live as Node functions
  exposed via the M CLI, not as SKILL documents an agent interprets
  by hand. Agents call them. This is the conceptual fix for the
  determinism gap I-036's live validation exposed — "byte-identical
  output" cannot be enforced when the renderer is a SKILL.md.

- **I-050** improvement item (Tier 2, High) — **Capability regression
  test harness.** Formalise the rewind-replay-diff pattern into a
  repeatable `m test e2e` command covering bootstrap + scaffold + all
  structural operations (ADD/REMOVE/RENAME/MERGE/SPLIT/PORT-CHANGE) +
  business decomposition. Currently the only live coverage is ad-hoc
  and only exercises the ADD path. Needed before any further capability
  refactor to avoid regression-by-accident.

- **I-051** improvement item (Tier 2, Medium) — **`scm.push_files`
  lifecycle gap.** S-4 of decompose-story SKILL shows
  `scm.push_files(files=[...])` but that call fails when files already
  exist, which is ALWAYS the case for structural stories touching
  project.yaml/docker-compose.yml/.gitlab-ci.yml. Discovered during
  I-036 live validation; worked around by using `git commit + git push`
  directly. Fix: add `scm.push_or_update_files` to the provider
  interface, or update S-4 to call `create_or_update_file` per file.

### Changed

- **`bootstrap-root-repo` — emits topology-derived artefacts via
  `render-topology-artefacts` in new Step 6.** Previously only seeded
  `pats/`, `stories/`, `packages/shell/`, and `.m/` placeholders,
  leaving `docker-compose.yml`, `.gitlab-ci.yml`,
  `scripts/integration-test.sh`, and `scripts/report-shadow-status.sh`
  unaddressed — a fresh bootstrap followed by a structural decompose
  had nothing to overwrite. Now all four files are rendered from the
  bootstrap-generated `project.yaml` and included in the seed commit.

- **`bootstrap-root-repo` — Step 3 `project.yaml` generation** now
  emits a complete manifest including the `providers:` block (scm,
  compose, ci derived from Story Zero's `## Project` section), the
  `compose:` block (derived from deployment-model), and sequential
  port allocation starting at 3001 for non-shell components. The
  `persistence:` block is deliberately NOT auto-emitted — interpretation
  of persistence intent from story prose is tracked as I-047.

- **`bootstrap-root-repo` — Story Zero is NOT committed to the root
  repo.** The story file lives in the project's story source of truth
  (Jira for production, a project-local markdown directory for
  file-based projects). The location of the local directory is a
  project-level convention and is NOT prescribed by M. Closes I-002's
  intent for the bootstrap path.

- **`bootstrap-root-repo` — `packages/shell/` seeded with a minimal
  `package.json` + `README.md`** rather than just a `.gitkeep`, so
  the managed-repo CI install step works from the first commit.

- **`decompose-story` — S-2 and S-3 delegate to the renderer.**
  S-2 calls `render-topology-artefacts` against the post-S-1
  `project.yaml`; S-3 is now a removed numbering placeholder. All
  inline build.context, role rendering, persistence handling,
  probe templates, and `REPOS=` logic moved to the compose and CI
  providers. The SKILL explicitly forbids inline rendering in this
  capability — the renderer is the single source.

- **`decompose-story` — S-4 CAT file is conditional.** For pure
  structural ADD, the `pats/<story-id>.<ext>` push is SKIPPED because
  the aliveness probe in `scripts/integration-test.sh` IS the CAT
  (per the existing "CAT compilation for structural stories" section).
  For REMOVE, RENAME, MERGE, SPLIT, and mixed stories, the CAT file
  is retained for regression coverage.

- **`decompose-story` — sub-task markdown destination pinned.**
  Sub-task files and enriched stories are written to the project's
  story source of truth (Jira or the project-local markdown directory),
  NEVER to any SCM repo. Closes I-002 — the jira/ folder pattern had
  drifted back in via unclear "workspace folder" language. The word
  "workshop" has been scrubbed from this SKILL — it was a demo
  project name that had leaked into methodology docs.

- **`decompose-story` — integration-test path conflict resolved.**
  The singular `scripts/integration-test.sh` is the ONLY integration
  test script. Topology-wide, renderer-owned. The legacy plural path
  `scripts/integration-tests/<story-id>.sh` is not used; per-story
  assertions are the compiled CAT at `pats/<story-id>.cy.js` (or
  other framework-appropriate file). All references to the plural
  path scrubbed except the two "legacy path, not used" clarifications.

- **Provider interface extended with `compose.*` and `ci.*`
  namespaces.** See `.m/providers/provider-interface.md`.

### Pre-flight corrections (applied after initial sub-agent simulation)

A pre-flight review of the `.work/` rendered trees surfaced three
targeted fixes, all in provider specs (no capability changes):

- **`ci/gitlab` — `report-shadow-status.sh` reverted from `glab` CLI
  to curl+REST.** The glab version would have failed at the first
  real shadow:compose run — glab isn't in alpine's default apk repo
  and the shadow:compose before_script only adds `git curl`. Rolled
  back to pass1's proven curl+REST pattern. Kept the cleaner single-
  arg state interface and render-time substitution of REPOS/GROUP/API.
  `M_GROUP_TOKEN` is now explicitly validated at the top of the script.
  Switch back to glab deferred to I-048.

- **`compose/docker-compose` — `integration-test.sh` dropped the story
  integrity gate block.** The original design conflated aliveness
  probes ("is the system running?") with integrity ("does the story
  cover every repo?") in one script. Worse, the integrity gate used
  filesystem existence of sibling directories as the signal, which
  is fundamentally wrong — integrity is an SCM-state concern, not a
  disk-layout one. The script now contains ONLY the pinned framework,
  aliveness probes, and a fixed epilogue. Integrity is wire-
  orchestration's responsibility and operates against the SCM API.

- **`compose/docker-compose` — cosmetic double-echo in epilogue fixed.**

### Live end-to-end validation (2026-04-15)

Full validation against real GitLab runners on
`methodology-m/todo-m-workshop`. Two MRs exercised the refactored
capabilities:

- **MR !27** — TODOM-001 (business story). Exercises
  `decompose-story` Step 4 (compile PAT → Cypress + readiness tracker).
  Sub-tasks explicitly NOT committed to any SCM repo — they live in
  the project's story source of truth. Pipeline green.

- **MR !28** — TODOM-S01 (structural ADD story). Exercises the full
  refactor: S-1 project.yaml mutation → S-2 renderer dispatch through
  both compose and CI providers → S-4 commit + push + MR. Precondition
  `todo-m-analytics` repo created and seeded with `/health` endpoint.

  **MR !28 pipeline log shows all 5 topology aliveness probes
  succeeded via the new POSIX `scripts/integration-test.sh`:**

  ```
  $ sh scripts/integration-test.sh
  Infrastructure baseline — topology aliveness probes:
  ✓ shell renders
  ✓ mfe remoteEntry.js served
  ✓ api-read health
  ✓ api-write health
  ✓ analytics health
  All topology aliveness probes passed.
  Job succeeded
  ```

  validate:compose built all 5 containers (including the new
  analytics service), started them, executed the POSIX-sh check()
  polling helper, and tore down cleanly. End-to-end walltime: 131
  seconds.

Every job in the MR pipeline ran green: install → build → test →
validate:compose → validate:integration-test.

### Known gaps and scope honesty

The live validation is real but bounded. What's proven vs. unproven:

**Proven:**

- Structural ADD path (decompose-story + renderer + both providers)
  works end-to-end on real GitLab.
- POSIX-sh `integration-test.sh` with check() polling works in
  alpine DinD with the documented DOCKER_GATEWAY default.
- New rendered `.gitlab-ci.yml` jobs (with clone lines for analytics
  and delegation to `sh scripts/integration-test.sh`) are syntactically
  valid and runtime-correct.
- Business decompose path (MR !27) still works post-refactor.
- The "sub-tasks never committed to SCM" rule (I-002 closure) holds.

**NOT proven — filed as I-050 coverage targets:**

- **`bootstrap-root-repo` was SKIPPED in the live test.** The rewind
  restored post-bootstrap state, so the refactored Step 6 renderer
  call, persistence handling, and shell stub were validated only by
  SKILL reading, not by execution.
- **`scaffold-repo` was mocked.** `todo-m-analytics` was seeded with
  a minimal express app, not through the full scaffold-repo flow
  (CI pipeline, access tokens, webhooks).
- **`report-shadow-status.sh` never executed.** It only fires on
  trigger pipelines, which validate:compose doesn't use. The
  curl+REST rollback is syntactically present but runtime-untested.
- **Only the ADD structural operation was exercised.** REMOVE,
  RENAME, MERGE, SPLIT, PORT-CHANGE share most of the renderer
  codepath but are untested end-to-end.
- **Only one provider per dimension exists** (docker-compose for
  compose, gitlab for ci). "The plugin architecture is portable" is
  credible but unverified.

**Determinism caveat — filed as I-049:**

The renderer is a SKILL document read and executed by an agent, not
an executable function. The "pure function, byte-identical output"
guarantee is enforceable only by agent discipline. Two agents
reading the same SKILL may produce slightly different bytes. I-049
proposes flipping deterministic capabilities into executable code
(Node functions in the M CLI) so determinism becomes mechanical.

### Fixed

- **I-036** — topology-derived files are live derivatives of
  `project.yaml`, not hand-authored artefacts. Closed.

- **I-014** — compose strategy as plugin. The `compose.*` provider
  namespace with `docker-compose` as the reference implementation is
  the plugin boundary. Further providers (kubernetes, podman) can be
  added without touching the renderer or any capability. Closed.

- **I-018** — compose strategy boundary in wire-orchestration. CI
  pipeline config no longer inlines compose-specific health check
  logic; it calls `sh scripts/integration-test.sh` (compose-provider-
  owned) and `sh scripts/report-shadow-status.sh` (CI-provider-owned).
  Closed.

- **I-002 (round 2)** — sub-task markdown no longer lands in SCM
  repos under `todo-m-root/jira/`. The pattern had drifted back in
  via under-specified SKILL language. Now pinned. The demo project
  name "workshop" scrubbed from methodology docs.

### Marked complete in backlog (shipped earlier, tracked late)

- I-006 (API stubs for frontend repos), I-022 (shadow → AOT rename),
  I-028 (repo reorganisation), I-029 (npm package + CLI). All shipped
  in prior releases but missing from the Resolved table. Added in
  this release's backlog hygiene pass.

- I-009 (plugin architecture umbrella) — annotated "1/4 done" in Tier 3
  (scm dimension delivered; CI, test, compose, deploy still open).
  After this release, it is effectively 3/4 done — compose and ci
  dimensions are also delivered via the new provider namespaces.

## [0.4.0] — 2026-04-14

### Added
- **`decompose-story` — Preconditions and CAT compilation guidance for structural stories.** New "Preconditions" section makes the order-of-operations explicit: for ADD/RENAME/MERGE/SPLIT, the new repo MUST exist on the SCM platform before decomposing the structural story (run `scaffold-repo` first). For REMOVE, no precondition. New "CAT compilation for structural stories" section codifies that CAT framework follows the assertion type — Cypress for browser-level, curl for HTTP-level, topology aliveness probe for structural — and that pure REMOVE needs no story-level CAT beyond regression. Findings surfaced by the TODOM-S01 structural test.
- **I-045** improvement item — extend PAT yaml to support multi-framework assertions (HTTP step types compiling to curl/supertest), so structural stories can declare component-level health assertions natively.

### Changed
- **`decompose-story` S-2 — `build.context` derivation rule made explicit.** Embedded components use `location` as-is (relative local path); referenced components use `../<basename of location>` (sibling on disk). Previously the rule said only "`build.context` from `location`" which was ambiguous because referenced components have SCM paths in `location`, not local paths.
- **`decompose-story` S-2 — persistence drift caveat documented.** If `project.yaml` does not declare a `persistence:` block but the existing `docker-compose.yml` uses persistence, regen will drop persistence from existing backends — a regression. Fix is to bring `project.yaml` in line with reality before running a structural story.
- **`decompose-story` S-3 — frontend-host probe description fixed.** Was `<name> shell renders`, which produced doubled words like `shell shell renders` when the component was literally named `shell`. Now `<name> renders`.
- **`decompose-story` S-3 — frontend MFE probe expected substring fixed.** Was `<camelName>Mfe`, which assumed the federation name matches the component name (incorrect for the workshop where the federation name is `todoMfe` derived from the project, not from the component name `mfe`). Now `webpackChunk`, a stable substring in any webpack-built `remoteEntry.js`. Skill notes that non-webpack bundlers should override appropriately.
- **`decompose-story` S-3 — `REPOS=` line scope made explicit.** Only `type: referenced` components are included; embedded components live inside the root repo and don't have their own GitLab repos.
- **`decompose-story` S-3 — header text pinned for byte-stability.** The exact comment + echo line is specified so regen output is deterministic.

### Added
- **`scm/log-only` provider.** Non-executing implementation of the `scm.*` namespace. Every function logs its call parameters to stdout and returns a stable mock response so the calling capability proceeds normally. Used for dry-run testing of capabilities without touching a real SCM platform. Select via `providers.scm: log-only` in `project.yaml`. Write-only (no read simulation) — sufficient for decompose-story and scaffold-repo, but capabilities that read SCM state cannot be tested under it. Mock values are stable across runs to enable trace-based regression testing.
- **`decompose-story` — structural stories handling.** New section teaches the capability to recognise stories that change topology (add/remove/merge/split components, port changes) and bundle `project.yaml`, regenerated `docker-compose.yml`, and regenerated `scripts/integration-test.sh` into the same auto-raised root MR alongside the compiled Cypress spec. Business stories are unaffected. Distinction is in the agent's reading of the story, not a tag or flag. Truth-preservation rule: regenerated artefacts are pure topology derivatives — no semantic changes allowed during a structural story; bugs discovered during migration are filed as follow-up business stories.
- Topology-aliveness probes in `scripts/integration-test.sh` are decoupled from any story ID — they reflect the current topology, not a historical Story Zero snapshot.

## [0.3.1] — 2026-04-11

### Added
- **M CLI** (`methodology-m` npm package) — zero-dependency Node.js CLI for distributing M into projects. Commands: `init`, `clone`, `update`, `diff`, `version`, `changelog`.
- **`m clone`** — clones root repo + all managed repos from `project.yaml` topology, generates IDE workspace file (VS Code by default, configurable via `--ide`).
- **JSON Schemas** — formal contracts at `.m/schemas/pat.schema.json` (PAT.yaml) and `.m/schemas/project.schema.json` (project.yaml). Agent rule in `m.md` requires validation against schemas before committing generated artefacts.
- **Backlog prioritisation** — all 41 improvement items tiered by impact (Tier 1: structural integrity, Tier 2: delivery loop, Tier 3: extensibility, Tier 4: polish). TOC added to `docs/improvements-and-ideas.md`.
- **I-041** improvement item — pessimistic invalidation (push `pending` to all story MRs when any constituent pipeline starts).

### Changed
- **Agent Skills standard** — all capabilities migrated from `.m/capabilities/<name>.md` to `.m/capabilities/<name>/SKILL.md` per the [agentskills.io](https://agentskills.io) standard. Claude wrappers migrated from one monolithic skill to 8 individual skills in `.claude/skills/<name>/SKILL.md`.
- **README.md** — rewritten to reflect current state: `.m/` layer, CLI, capabilities, provider model.
- **`.m/m.md`** — schemas added to Key Files and Directory Structure. "Schemas — Mandatory Validation" section with agent enforcement rule. Removed empty `steering/`, `roles/` from directory listing.

## [0.3.0] — 2026-04-11

### Added
- **Agent-neutral `.m/` layer** — capabilities, steering, and provider interface extracted from Kiro powers into a canonical, agent-agnostic directory. Any AI agent can execute M capabilities by reading `.m/`.
- **Provider interface** — formal `scm.*` namespace with 14 function contracts (`create_repo`, `protect_branch`, `create_webhook`, etc.). Provider resolution via `project.yaml` → `.m/providers/<category>/<provider>.md`.
- **GitLab SCM provider** — reference implementation at `.m/providers/scm/gitlab.md` mapping all `scm.*` functions to GitLab MCP tools with full gotcha documentation.
- **Claude adapter** — thin wrapper skill (`.claude/skills/m-capabilities/SKILL.md`) and steering (`.claude/steering/m-steering.md`) pointing to canonical `.m/` content.
- **`decompose-story` Step 4** — auto-compile story PAT into Cypress spec and raise root MR at decomposition time (I-039). Integration gate exists from the moment a story is decomposed.
- **`scm.create_branch`** and **`scm.create_merge_request`** functions added to provider interface.
- **Pipeline failure propagation (I-032)** — managed repo webhooks now include `pipeline_events: true`. `detect-trigger-event.sh` handles `pipeline_failure` event type, skipping compose and going straight to failure fan-out.
- **Completeness failure mode** — integrity gate now checks ALL repos (managed + root) for open story MRs.
- **I-040** improvement item — topology changes (adding/removing components in a live project).

### Changed
- **`wire-orchestration` capability** — updated with pipeline events on webhooks, `pipeline_failure` detection, fan-out to all repos including root, and inline `after_script` pattern for validate:integration status reporting.
- **`report-shadow-status.sh`** — `REPOS` includes root repo alongside managed repos.
- **`integration-test.sh`** — `REPOS` replaces `MANAGED_REPOS`, includes root repo.
- **Path convention** — all paths in M documents are relative to repo root (pinned in `.m/m.md`).

### Fixed
- Root repo MR missing from story integrity gate (I-039 partial).
- Cypress image pinning (`cypress/included:latest` → `cypress/included:15.13.0`) on MFE repo.
- `validate:integration` CI pipeline failure caused by `when: on_failure` inside `rules:` block — replaced with inline `after_script` fan-out pattern.

## [0.2.0] — 2026-04-07

Initial M Power capabilities under `.kiro/powers/m-power/`. Workshop reference implementation with GitLab CI orchestration.
