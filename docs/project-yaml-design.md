# project.yaml — Design Document

**Status:** Draft (captured during I-005/I-014/I-015 design session)

This document describes the target schema for `project.yaml`, the topology
manifest that lives in the root repo. It consolidates decisions made across
multiple improvement items and will feed into the methodology paper overhaul.

## Current State

The existing `project.yaml` is minimal — just project name, group, topology,
deployment mode, and a component list with tags. Everything else (ports,
templates, compose strategies, test frameworks) is either hardcoded in
capability docs or discovered at runtime.

## Target Schema

```yaml
# project.yaml — topology manifest

project: todo-m
group: methodology-m/todo-m-workshop
topology: distributed

# Org-level M config repo — template catalogue, shared conventions
config: https://gitlab.com/acme/m-config.git

# --- Component catalogue ---
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    role: frontend-host
    tag: v0.1.0
    port: 3000

  - name: mfe
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-mfe
    role: frontend
    tag: v0.1.0
    port: 3001

  - name: api-read
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-api-read
    role: backend
    tag: v0.1.0
    port: 3002

  - name: api-write
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-api-write
    role: backend
    tag: v0.1.0
    port: 3003

# --- Templates (resolved via config repo catalogue) ---
# key@version — key maps to a git URL in the config repo's templates.yaml
# Version pins to a tag in the template repo. Unpinned = default branch.
templates:
  backend: node-api@1.0.0
  frontend: react-mfe@2.0.0
  frontend-host: react-shell@1.0.0

# --- PAT compilation (per I-003) ---
# Declares which test framework to use when compiling PAT stubs into
# executable CATs, per component role. Used by generate-acceptance-tests.
pat-compilation:
  backend: supertest + vitest
  frontend: testing-library + vitest

# --- Compose (shadow integration + local dev) ---
# System-level assembly strategies. Root repo owns these.
# "local" is for developer machines. "integration" is for CI shadow.
compose:
  local:
    strategy: process
    script: scripts/start-all.sh
    stop: scripts/stop-all.sh

  integration:
    strategy: docker-compose
    file: docker-compose.yml
    build: true
    health:
      timeout: 30
      endpoints:
        - http://shell:3000
        - http://mfe:3001/remoteEntry.js
        - http://api-read:3002/hello
        - http://api-write:3003/placeholder
    tests:
      - type: cypress
        spec: pats/**/*.cy.js
        base-url: http://shell:3000

# --- Environments (post-merge deployment pipeline) ---
# Each environment has a strategy, tests, and a gate.
# This section is optional — projects without deployment automation
# skip it entirely.
environments:
  staging:
    strategy: per-component    # each repo owns deploy:staging script
    tests:
      - type: cypress
        spec: pats/**/*.cy.js
        base-url: https://staging.todo-m.acme.com
      - type: k6
        script: perf/load-test.js
    gate: manual

  production:
    strategy: blue-green
    deploy:
      script: scripts/deploy-production.sh
      rollback: scripts/rollback-production.sh
    tests:
      - type: cypress
        spec: smoke/**/*.cy.js
        base-url: https://todo-m.acme.com
    gate: manual
```

## Design Decisions

### compose vs environments

- **compose** = assemble the system and prove it works together. This is
  shadow integration (pre-merge gate). Not a deployment.
- **environments** = deploy the validated system to real infrastructure.
  Post-merge, post-tag. Optional — not every project has staging/prod
  automation from day one.

### per-component vs system-level

- Compose is always system-level — the root repo orchestrates assembly.
- Deploy can be either:
  - `per-component` — each repo has `deploy:<env>` scripts, root repo
    calls them in sequence
  - System-level (e.g. `blue-green`) — root repo runs a single deploy
    script that handles everything

### Ports in component catalogue

Ports are declared once in the component catalogue and derived everywhere:
compose scripts, docker-compose.yml, health checks, API_URL defaults.
No more hardcoding ports in multiple places.

### Templates via config repo

The M config repo is an org-level registry. It maps short keys to git
URLs. Projects reference keys with optional version pins (`node-api@1.0.0`).
This keeps the catalogue centralised and projects decoupled from template
locations.

### pat-compilation

Declares the test framework per component role for PAT→CAT transformation.
Only covers repo-level component testing. Story-level test runners (Cypress
for integration, k6 for performance) are declared where they're used — in
compose.tests and environments.tests.

## Relationship to Improvement Items

| Section | Related items |
|---------|--------------|
| components.port | I-005 |
| templates | I-015, I-009 |
| pat-compilation | I-003 |
| compose | I-014, I-009 |
| environments | I-014 (extended) |
| config | I-015 |

## What's NOT in project.yaml

- Story files, sub-tasks, PATs — those live in Jira (or emulation)
- CI pipeline templates — those are generated by scaffold-repo
- Readiness trackers — those are per-story in `stories/`
- Orchestration wiring (webhooks, tokens) — that's wire-orchestration state

## Next Steps

- Implement for the reference implementation (minimal: just components + compose.local)
- Update the methodology paper with the full schema
- Update M Power capabilities to read from project.yaml instead of hardcoding
