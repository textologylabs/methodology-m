# Changelog

All notable changes to Methodology M are documented in this file.

## [Unreleased]

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
