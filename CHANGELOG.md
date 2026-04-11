# Changelog

All notable changes to Methodology M are documented in this file.

## [0.3.0] — 2026-04-11

### Added
- **Agent-neutral `.m/` layer** — capabilities, steering, and provider interface extracted from Kiro powers into a canonical, agent-agnostic directory. Any AI agent can execute M capabilities by reading `.m/`.
- **Provider interface** — formal `scm.*` namespace with 14 function contracts (`create_repo`, `protect_branch`, `create_webhook`, etc.). Provider resolution via `project.yaml` → `.m/providers/<category>/<provider>.md`.
- **GitLab SCM provider** — reference implementation at `.m/providers/scm/gitlab.md` mapping all `scm.*` functions to GitLab MCP tools with full gotcha documentation.
- **Claude adapter** — thin wrapper skills (`.claude/skills/m-capabilities.md`) and steering (`.claude/steering/m-steering.md`) pointing to canonical `.m/` content.
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
