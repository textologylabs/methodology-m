# TODOM-S02: Add metrics backend component

**Type:** Structural Story
**Status:** Decomposed
**Created:** 2026-05-02
**Decomposed:** 2026-05-02 (Phase A)

## Summary

Add a new referenced backend component `metrics` to the todo-m
topology. Pure structural ADD — no feature logic, no business
behaviour change, only the topology mutation and its derived
artefacts.

Live evidence vehicle for v0.12.0's phase-split decompose-story
contract.

## Component AC Mapping

| Component | Sub-task | ACs |
|---|---|---|
| metrics (new) | TODOM-S02a | AC-1 (story-level health probe — also lifts to story PAT) |

ACs 2–5 of the source story (project.yaml shape, docker-compose
shape, integration-test.sh shape, internal consistency) are
**derived consequences of the topology mutation**, not
component-level work. They are validated by:

- `project.schema.json` (after Phase B mutates `project.yaml`)
- `render-topology-artefacts` byte-determinism (Phase B)
- The compiled story CAT's `/health` probe going green (L4 + L5)

There is no root sub-task. Per the v0.12.0 locked design, the root
repo's per-story contribution (compiled CAT, readiness tracker,
mutated `project.yaml`, regenerated topology artefacts) is fully
automated by `compile-story-pats` plus Phase B of decompose-story.

## Sub-Tasks

| ID | Component | Repo |
|---|---|---|
| TODOM-S02a | metrics | todo-m-metrics |

## Acceptance Criteria (verbatim from source)

1. `metrics` is a live composed component
   - `GET http://metrics:3004/health` returns HTTP 200 with body
     containing `"ok"` when the topology is composed and the
     `metrics` service is healthy.

2. `project.yaml` declares the new component
   - `name: metrics`, `type: referenced`, `role: backend`,
     `port: 3004`

3. `docker-compose.yml` includes a `metrics` service
   - `build.context: ../todo-m-metrics`, `3004:3004`, backend env
     vars

4. `scripts/integration-test.sh` probes the new component
   - `/health → "ok"`; `REPOS=` includes `todo-m-metrics`

5. The regenerated artefacts are internally consistent
   - Every component represented exactly once across yaml,
     compose, integration-test.sh

## Phase split note

Phase A (this artefact + TODOM-S02a.md + readiness tracker) ran
2026-05-02 with no SCM calls and no `project.yaml` mutations.
Phase B will run after `scaffold-repo` has created
`todo-m-metrics` on GitLab.
