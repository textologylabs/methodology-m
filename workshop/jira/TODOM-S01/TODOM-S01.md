# TODOM-S01: Add analytics backend component

**Type:** Structural Story
**Status:** Fixture (regression test)
**Created:** 2026-04-15

## Summary

Add a new referenced backend component `analytics` to the todo-m
topology. The analytics service will eventually collect usage metrics
from the frontend and expose them via a read endpoint — but **this
story is purely structural**. No feature logic, no new business
behaviour. Only the topology changes: a fourth managed repo joins the
composition, a fourth port is allocated, and all topology-derived
artefacts (`project.yaml`, `docker-compose.yml`,
`scripts/integration-test.sh`, CI, shadow status) must regenerate
consistently to reflect the new shape.

This is the ADD-type structural case. Per `decompose-story` preconditions,
the `todo-m-analytics` repo is scaffolded first via `scaffold-repo`,
which seeds the baseline `/health` endpoint. This story then threads
the new component through the topology.

## Scope

- Add `analytics` to `project.yaml` as `type: referenced`, `role: backend`,
  port 3004 (the next free port after api-write at 3003).
- Regenerate all topology-derived artefacts from the new manifest.
- No semantic changes to any existing component.

## Out of scope

- Any actual analytics behaviour (metric collection, dashboards, UI).
  Those are follow-up business stories that can only be authored once
  the component exists in the topology.
- Any change to existing components' behaviour or APIs.

## Acceptance Criteria

1. `project.yaml` declares the new component
   - `name: analytics`, `type: referenced`, `role: backend`, `port: 3004`
   - `location: methodology-m/todo-m-workshop/todo-m-analytics`
   - `tag` may be null until first release
   - The rest of the file is unchanged byte-for-byte apart from the new entry

2. `docker-compose.yml` includes an `analytics` service
   - `build.context: ../todo-m-analytics` (sibling-on-disk convention)
   - Port mapping `3004:3004`
   - Backend environment variables consistent with other backends
     (`PORT=3004`, persistence vars if persistence is declared)
   - Existing services are unchanged

3. `scripts/integration-test.sh` probes the new component
   - Infrastructure baseline block contains
     `check "analytics health" "http://${DOCKER_GATEWAY}:3004/health" "ok"`
   - `REPOS=` line includes `todo-m-analytics` in the managed-repo list
   - Existing probes and repo entries are unchanged

4. Topology aliveness is the only verification layer
   - No new Cypress spec is required at the story-PAT level
   - The curl-based `/health` probe in integration-test.sh IS the
     structural CAT for this story (per decompose-story's CAT rule
     for pure structural ADDs)

5. The regenerated artefacts are internally consistent
   - Every component in `project.yaml` appears in `docker-compose.yml`
   - Every referenced component in `project.yaml` appears in the
     `REPOS=` line
   - Every component in `project.yaml` has exactly one aliveness probe
   - No stale references to removed or renamed components

## Notes

This story exists as a **committed regression fixture** for the
capability test harness. Running `decompose-story` against this story
via the `scm/log-only` provider is the canonical structural-path
regression check for M itself. Do not modify without updating the
captured baseline.

See `docs/improvements-and-ideas.md` I-036 and the v0.5.0 CHANGELOG
entry for the refactor this fixture was introduced to protect.
