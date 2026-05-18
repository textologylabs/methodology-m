# Methodology M — Steering

**Version:** 0.3.2

Methodology M is an AI-driven delivery method for distributed software systems where a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment. The full specification lives in `methodology-m.md` at the repo root.

This directory (`.m/`) is the agent-neutral, machine-readable expression of the methodology. Any AI agent that can read markdown and call platform APIs can execute these capabilities. Agent-specific adapters (`.kiro/`, `.claude/`, etc.) provide thin wrappers for discovery — the intelligence lives here.

**Path convention:** All paths in M documents are relative to the repo root, not to the file they appear in.

## Key Files

- `methodology-m.md` — the full methodology specification (the paper)
- `.m/m.md` — this file: steering, capabilities, execution protocol
- `.m/capabilities/` — standalone playbooks for each M capability
- `.m/schemas/pat.schema.json` — JSON Schema for PAT.yaml files (story and sub-task)
- `.m/schemas/project.schema.json` — JSON Schema for project.yaml topology manifest
- `.m/providers/provider-interface.md` — namespace contracts and resolution protocol
- `.m/providers/scm/gitlab.md` — GitLab SCM provider (reference implementation)

## When Working in This Repo

This is the methodology repo itself — not an M-type project. You are
editing the methodology, its capabilities, and its provider implementations.

When the user asks you to:
- **Execute a capability** (e.g. "scaffold a repo") — read the capability
  file and provider file, then execute
- **Edit a capability** — modify `.m/capabilities/<name>.md`
- **Edit a provider** — modify `.m/providers/scm/<provider>.md`
- **Discuss methodology concepts** — refer to `methodology-m.md`

## Capabilities

Each capability follows the [Agent Skills](https://agentskills.io) standard (`<name>/SKILL.md`). Read the full file before executing — summaries below are for orientation only.

| Capability | File | Description |
|---|---|---|
| `setup-workspace` | [SKILL.md](capabilities/setup-workspace/SKILL.md) | Create a project workspace (group/org) on the SCM platform |
| `bootstrap-root-repo` | [SKILL.md](capabilities/bootstrap-root-repo/SKILL.md) | Create and seed the root repo with topology manifest and Story Zero |
| `decompose-story` | [SKILL.md](capabilities/decompose-story/SKILL.md) | Map story prose onto components, generate sub-task markdown + readiness tracker |
| `generate-pats` | [SKILL.md](capabilities/generate-pats/SKILL.md) | Produce the story-level PAT yaml and one sub-task PAT yaml per sub-task (parent in scope) |
| `compile-story-pats` | [SKILL.md](capabilities/compile-story-pats/SKILL.md) | Compile the story-level PAT into an integration CAT and raise the root-repo gate MR |
| `scaffold-repo` | [SKILL.md](capabilities/scaffold-repo/SKILL.md) | Create and configure a managed repo from a sub-task file |
| `wire-orchestration` | [SKILL.md](capabilities/wire-orchestration/SKILL.md) | Connect managed repos to root repo orchestration (webhooks, CI, tokens) |
| `unwire-orchestration` | [SKILL.md](capabilities/unwire-orchestration/SKILL.md) | Decommission one managed repo from root orchestration (REMOVE / TYPE-CHANGE fold-in) |
| `generate-acceptance-tests` | [SKILL.md](capabilities/generate-acceptance-tests/SKILL.md) | Compile sub-task PATs into repo-level executable acceptance tests (CATs) |
| `extract-component` | [SKILL.md](capabilities/extract-component/SKILL.md) | TYPE-CHANGE `embedded → referenced` — extract an embedded component into its own managed repo |
| `embed-component` | [SKILL.md](capabilities/embed-component/SKILL.md) | TYPE-CHANGE `referenced → embedded` — fold a referenced component back into the root repo |
| `tag-release` | [SKILL.md](capabilities/tag-release/SKILL.md) | Tag a managed repo at a version and update root repo topology |

## Execution Protocol

1. User requests a capability (by name or by describing the intent)
2. Agent reads the corresponding `.m/capabilities/<name>/SKILL.md` — the FULL file
3. For any namespaced function call (e.g. `scm.create_repo(...)`):
   a. Check `project.yaml` → `providers` to find the active provider
   b. Read `.m/providers/<category>/<provider>.md` for the concrete implementation
   c. Execute the platform-specific operation
4. Agent produces the report described in the capability file

No shortcuts. The capability files contain critical sequences (branch protection ordering, webhook flags, CI image requirements) that cannot be skipped.

## Configuration Resolution

Capabilities that generate artefacts (CI configs, test setups, templates) resolve their choices through a four-tier hierarchy:

```
Repo-level override  →  Project-level (project.yaml)  →  Org Config  →  M Core Config
```

See `methodology-m.md` Section 6a for the full strategy/plugin architecture. The capabilities define the *what*. The configuration hierarchy determines the *with what tools*.

## Provider Namespaces

Capabilities call platform operations via namespaced functions. Each
namespace is backed by a provider selected in `project.yaml`.

| Namespace | Category | Provider interface |
|---|---|---|
| `scm.*` | Source code management | [provider-interface.md](providers/provider-interface.md) |
| `compose.*` | Compose orchestration + aliveness | [provider-interface.md](providers/provider-interface.md) |
| `ci.*` | CI pipeline + status reporting | [provider-interface.md](providers/provider-interface.md) |
| `test.cat.*` | Compiled Acceptance Test generation | [provider-interface.md](providers/provider-interface.md) |

New namespaces (e.g. `deploy.*`) are added as the methodology evolves.
See the provider interface doc for the full function contracts and the
protocol for adding new namespaces/providers.

## Directory Structure

```
.m/
  m.md                              ← this file
  capabilities/
    <name>/SKILL.md                 ← one per capability (Agent Skills standard)
    <name>/*.mjs                    ← executable orchestrator (deterministic capabilities only)
  schemas/
    pat.schema.json                 ← JSON Schema for PAT.yaml files (story + sub-task)
    project.schema.json             ← JSON Schema for project.yaml
  providers/
    provider-interface.md           ← namespace contracts and resolution protocol
    scm/gitlab.md                   ← GitLab SCM provider (reference implementation)
    compose/docker-compose.{md,mjs} ← Docker Compose provider (pure-function render)
    ci/gitlab.{md,mjs}              ← GitLab CI provider (pure-function render)
    test/cat/cypress.{md,mjs}       ← Cypress test.cat provider (pure-function compile)
```

Agent-specific steering (how to behave) lives in agent directories
(`.claude/steering/`, `.kiro/steering/`). Steering templates for
managed repos are embedded in the `scaffold-repo` capability doc.

## Schemas — Mandatory Validation

The `.m/schemas/` directory contains JSON Schema definitions for M
artefacts. These are the formal contracts — capability docs describe
*when* and *why* to generate an artefact, schemas define *what it must
look like*.

| Schema | Validates | Used by |
|---|---|---|
| `pat.schema.json` | `*.pat.yaml` files (story-level and sub-task) | generate-pats, decompose-story, generate-acceptance-tests |
| `project.schema.json` | `project.yaml` topology manifest | bootstrap-root-repo, scaffold-repo, wire-orchestration |

**Agent rule:** When generating or modifying a PAT.yaml or project.yaml
file, read the corresponding schema FIRST. Validate your output against
the schema before committing. If a field is marked `required` in the
schema, it must be present. If a value has an `enum` constraint or
`pattern`, use only valid values. Do not invent fields not in the schema.

## Relationship to Agent Runtimes

This directory is the canonical source. Agent-specific directories contain thin wrappers:

- **Kiro** (`.kiro/powers/m-power/`) — a Power that bundles these capabilities with MCP servers and hooks
- **Claude** (`.claude/skills/<name>/SKILL.md`) — thin skill wrappers pointing to `.m/capabilities/<name>/SKILL.md`
- **Any SKILL.md-compatible agent** — can consume these files directly or via lightweight adapters
