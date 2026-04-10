# Methodology M — Steering

This workspace contains Methodology M, an AI-driven delivery method for
distributed multi-repo software systems.

## Key Files

- `methodology-m.md` — the full methodology specification (the paper)
- `.m/m.md` — capability index and execution protocol
- `.m/capabilities/` — standalone playbooks for each M capability
- `.m/providers/provider-interface.md` — namespace contracts and resolution protocol
- `.m/providers/scm/gitlab.md` — GitLab SCM provider (reference implementation)
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

## Provider Resolution Protocol

Capabilities call platform operations via namespaced functions (e.g.
`scm.create_repo(...)`). When you encounter one:

1. The namespace prefix (`scm`) identifies the provider category
2. Check `project.yaml` → `providers` for the active provider (e.g. `scm: gitlab`)
3. Read `.m/providers/<category>/<provider>.md` for the concrete implementation
4. Execute the platform-specific operation documented there

The formal function contracts — parameters, return values, invariants —
live in `.m/providers/provider-interface.md`. Read this file to understand
what namespaces exist and what each function promises.

Current namespaces:
- `scm.*` — source code management (repos, branches, webhooks, secrets)
