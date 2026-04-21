# Methodology M

**AI-Driven Managed Multi-Team Delivery Method**

Copyright (C) 2026 Textology Labs Ltd.

---

Methodology M is a delivery method for distributed software systems where a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment.

It builds on the AI-first SDLC concept of PATs (Provable Acceptance Tests) — change encapsulated with its validation — and extends it to the multi-repo, multi-team reality.

## Quick start

```bash
# Install M into your root repo
npx methodology-m init

# Or clone an existing M project (root + all managed repos)
npx methodology-m clone git@gitlab.com:acme/my-project-root.git
```

After `init`, tell your AI agent: *"Read `.m/m.md` and bootstrap this project."*

## What it covers

- **The Root Repo Model** — one orchestrating repo that manages all components. A single `project.yaml` is the source of truth for topology.
- **PAT Topology** — two levels of tests. Story-level PATs validate user outcomes against the composed system. Repo-level PATs validate component contracts in isolation.
- **Ahead-of-Time (AOT) Integration** — speculative integration testing triggered when a managed repo MR is raised. The full system is composed and tested before anything merges.
- **The Merge Transaction** — a deterministic CI pipeline that atomically merges all managed repo MRs for a story, updates the topology, and lands the validated combination on main.
- **Agent-Neutral Architecture** — the `.m/` directory contains capabilities, schemas, and provider contracts readable by any AI agent. Agent-specific wrappers (`.claude/`, `.kiro/`) are thin pointers.

## Architecture

```
.m/                          Agent-neutral methodology layer
  m.md                       Steering, capabilities index, execution protocol
  capabilities/*.md          Standalone playbooks (setup, scaffold, wire, etc.)
  schemas/*.json             JSON Schema for PAT.yaml and project.yaml
  providers/                 Provider interface + implementations (GitLab, etc.)

cli/                         M CLI (npm: methodology-m)
  bin/m.mjs                  Entry point
  src/                       Commands: init, clone, update, diff, version, changelog
```

## CLI commands

| Command | Purpose |
|---------|---------|
| `m init` | Inject M into a project, detect agent runtime, generate wrappers |
| `m clone <url>` | Clone root + all managed repos into an IDE workspace |
| `m update` | Upgrade M to a new version with diff preview |
| `m diff` | Compare installed M against available version |
| `m version` | Show installed, bundled, and latest (npm) versions |
| `m changelog [version]` | Print changelog, optionally for a specific version |

## Capabilities

| Capability | What it does |
|---|---|
| `setup-workspace` | Create a project workspace (group/org) on the SCM platform |
| `bootstrap-root-repo` | Create and seed the root repo with topology and Story Zero |
| `decompose-story` | Map story prose onto components, generate sub-task markdown + readiness tracker |
| `generate-pats` | Produce story-level + sub-task PAT yaml (parent story in scope) |
| `compile-story-pats` | Compile the story PAT into an integration CAT and raise the root-repo gate MR |
| `scaffold-repo` | Create and configure a managed repo from a sub-task |
| `wire-orchestration` | Connect managed repos to root repo (webhooks, CI, tokens) |
| `generate-acceptance-tests` | Compile sub-task PATs into repo-level executable tests (CATs) |
| `tag-release` | Tag a managed repo and update root repo topology |

## Provider model

Capabilities call platform operations via namespaced functions (e.g. `scm.create_repo(...)`). Concrete implementations live in provider files. Active provider is selected in `project.yaml`:

```yaml
providers:
  scm: gitlab
```

Currently ships with a GitLab SCM provider. The provider interface is documented in `.m/providers/provider-interface.md`.

## Reference implementation

The `ref-projects/todo-m-workshop/` directory contains a reference implementation — a todo app with four components (shell, MFE, API read, API write) orchestrated via GitLab CI with Docker Compose.

## Read the full methodology

[methodology-m.md](methodology-m.md)

## Licence

This work is licensed under the [Creative Commons Attribution 4.0 International Licence (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt this material for any purpose, including commercially, as long as you give appropriate credit.
