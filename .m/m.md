# Methodology M — Steering

**Version:** 0.2.0

Methodology M is an AI-driven delivery method for distributed software systems where a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment. The full specification lives in `methodology-m.md` at the repo root.

This directory (`.m/`) is the agent-neutral, machine-readable expression of the methodology. Any AI agent that can read markdown and call platform APIs can execute these capabilities. Agent-specific adapters (`.kiro/`, `.claude/`, etc.) provide thin wrappers for discovery — the intelligence lives here.

**Path convention:** All paths in M documents are relative to the repo root, not to the file they appear in.

## Key Files

- `methodology-m.md` — the full methodology specification (the paper)
- `.m/m.md` — this file: steering, capabilities, execution protocol
- `.m/capabilities/` — standalone playbooks for each M capability
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

Each capability is a standalone playbook. Read the full file before executing — summaries below are for orientation only.

| Capability | File | Description |
|---|---|---|
| `setup-workspace` | [setup-workspace.md](capabilities/setup-workspace.md) | Create a project workspace (group/org) on the SCM platform |
| `bootstrap-root-repo` | [bootstrap-root-repo.md](capabilities/bootstrap-root-repo.md) | Create and seed the root repo with topology manifest and Story Zero |
| `generate-pats` | [generate-pats.md](capabilities/generate-pats.md) | Transform story acceptance criteria into PAT.yaml format |
| `decompose-story` | [decompose-story.md](capabilities/decompose-story.md) | Map story-level PATs to components, generate sub-tasks and readiness tracker |
| `scaffold-repo` | [scaffold-repo.md](capabilities/scaffold-repo.md) | Create and configure a managed repo from a sub-task file |
| `wire-orchestration` | [wire-orchestration.md](capabilities/wire-orchestration.md) | Connect managed repos to root repo orchestration (webhooks, CI, tokens) |
| `generate-acceptance-tests` | [generate-acceptance-tests.md](capabilities/generate-acceptance-tests.md) | Compile PAT stubs into executable acceptance tests (CATs) |
| `tag-release` | [tag-release.md](capabilities/tag-release.md) | Tag a managed repo at a version and update root repo topology |

## Execution Protocol

1. User requests a capability (by name or by describing the intent)
2. Agent reads the corresponding `.m/capabilities/<name>.md` — the FULL file
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

New namespaces (e.g. `test.cat.*`, `compose.*`) are added as the
methodology evolves. See the provider interface doc for the full
function contracts and the protocol for adding new namespaces/providers.

## Directory Structure

```
.m/
  m.md                         ← this file
  capabilities/                ← standalone playbooks (the "how to do it")
  providers/
    provider-interface.md      ← namespace contracts and resolution protocol
    scm/gitlab.md              ← GitLab SCM provider (reference implementation)
  steering/                    ← persistent rules for agents working in M projects
  roles/                       ← specialist agent definitions
  schemas/                     ← PAT.yaml, readiness.yaml, project.yaml schemas
```

## Relationship to Agent Runtimes

This directory is the canonical source. Agent-specific directories contain thin wrappers:

- **Kiro** (`.kiro/powers/m-power/`) — a Power that bundles these capabilities with MCP servers and hooks
- **Claude** (`.claude/skills/`) — skill wrappers that point here for execution
- **Any SKILL.md-compatible agent** — can consume these files directly or via lightweight adapters
