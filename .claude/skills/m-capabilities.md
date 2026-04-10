# Methodology M — Claude Skills

This project uses Methodology M. The canonical capability definitions
live in `.m/capabilities/`. This file maps them for Claude's skill
discovery.

## Activation

When the user requests any M capability (by name or by describing the
intent), follow this protocol:

1. Read `.m/m.md` for orientation (capability index and execution protocol)
2. Read the specific capability file at `.m/capabilities/<name>.md` — in full
3. Read the SCM provider file at `.m/providers/scm/gitlab.md` to resolve
   `scm.*` function calls to concrete API operations
4. Execute the steps exactly as documented
5. Produce the report described in the capability file

## Available Capabilities

| Trigger phrases | Capability file |
|---|---|
| "setup workspace", "create project workspace" | `.m/capabilities/setup-workspace.md` |
| "bootstrap root repo", "create root repo" | `.m/capabilities/bootstrap-root-repo.md` |
| "generate PATs", "create PATs from story" | `.m/capabilities/generate-pats.md` |
| "decompose story", "break down story" | `.m/capabilities/decompose-story.md` |
| "scaffold repo", "create managed repo" | `.m/capabilities/scaffold-repo.md` |
| "wire orchestration", "connect repos" | `.m/capabilities/wire-orchestration.md` |
| "generate acceptance tests", "compile CATs" | `.m/capabilities/generate-acceptance-tests.md` |
| "tag release", "tag and bump topology" | `.m/capabilities/tag-release.md` |

## Provider Resolution

Capabilities call platform operations via namespaced functions (e.g.
`scm.create_repo(...)`). The active provider per namespace is declared
in `project.yaml`:

```yaml
providers:
  scm: gitlab
```

When you encounter a namespaced function call:

1. Read `.m/providers/provider-interface.md` for the function contract
2. Read `.m/providers/<namespace>/<provider>.md` for the concrete
   implementation (API calls, MCP tools, gotchas)

## Configuration Hierarchy

Capabilities that produce artefacts (CI configs, test setups) resolve
choices through:

```
Repo-level override → Project-level (project.yaml) → Org Config → M Core Config
```

## Key Rule

Do NOT improvise capability execution from this summary. Each capability
file contains critical sequences, ordering constraints, and gotchas.
Read the full file before executing. Every time.
