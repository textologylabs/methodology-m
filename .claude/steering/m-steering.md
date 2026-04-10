# Methodology M — Steering

This workspace contains Methodology M, an AI-driven delivery method for
distributed multi-repo software systems.

## Key Files

- `methodology-m.md` — the full methodology specification (the paper)
- `.m/m.md` — capability index and execution protocol
- `.m/capabilities/` — standalone playbooks for each M capability
- `.m/providers/scm/gitlab.md` — GitLab SCM provider (resolves `scm.*` calls)
- `.claude/skills/m-capabilities.md` — skill discovery and activation rules

## When Working in This Repo

This is the methodology repo itself — not an M-type project. You are
editing the methodology, its capabilities, and its provider implementations.

When the user asks you to:
- **Execute a capability** (e.g. "scaffold a repo") — read the capability
  file and provider file, then execute
- **Edit a capability** — modify `.m/capabilities/<name>.md`
- **Edit a provider** — modify `.m/providers/scm/<provider>.md`
- **Discuss methodology concepts** — refer to `methodology-m.md`

## Provider Function Convention

Capabilities reference SCM operations as `scm.<function>(...)` calls.
These are abstract — the concrete implementation lives in the active
provider file. Always resolve function calls through the provider before
executing.
