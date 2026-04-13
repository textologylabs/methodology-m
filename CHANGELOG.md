# Changelog

All notable changes to Methodology M are documented in this file.

## [Unreleased]

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
