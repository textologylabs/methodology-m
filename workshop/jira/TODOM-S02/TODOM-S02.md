# TODOM-S02: Add metrics backend component

**Type:** Structural Story
**Status:** Pending
**Created:** 2026-05-02

## Summary

Add a new referenced backend component `metrics` to the todo-m
topology. The metrics service will eventually expose runtime
counters from the composed system — but **this story is purely
structural**. No feature logic, no new business behaviour. Only the
topology changes: a fourth managed repo joins the composition, a
fourth port is allocated, and all topology-derived artefacts
(`project.yaml`, `docker-compose.yml`,
`scripts/integration-test.sh`, `.gitlab-ci.yml`,
`scripts/report-shadow-status.sh`) regenerate consistently to
reflect the new shape.

This is the first **live** ADD-type structural story driven through
the v0.12.0 phase-split orchestration:

```
decompose-story --phase=a   → sub-task markdown, readiness tracker
generate-pats                → story PAT + sub-task PAT
scaffold-repo (metrics)      → todo-m-metrics seeded with /health
decompose-story --phase=b   → mutate project.yaml + render artefacts
compile-story-pats           → integration-gate MR
```

TODOM-S01 is the frozen capability-test fixture that surfaced
I-045's HTTP step types; TODOM-S02 is its live counterpart, used
as the v0.12.0 L4/L5 evidence vehicle.

## Scope

- Add `metrics` to `project.yaml` as `type: referenced`,
  `role: backend`, port 3004 (the next free port after `api-write`
  at 3003).
- Regenerate all topology-derived artefacts from the new manifest.
- Scaffold `todo-m-metrics` with the standard backend seed —
  `/health` returning 200 + `"ok"`, baseline CI, sub-task PAT
  validating the seed.
- No semantic changes to any existing component.

## Out of scope

- Any actual metrics behaviour (counter collection, dashboards,
  read endpoints, persistence wiring). Those are follow-up business
  stories that can only be authored once the component exists in
  the topology.
- Any change to existing components' behaviour or APIs.

## Acceptance Criteria

1. `metrics` is a live composed component
   - `GET http://metrics:3004/health` returns HTTP 200 with body
     containing `"ok"` when the topology is composed and the
     `metrics` service is healthy.
   - This is the story-level AC. It compiles to a single HTTP-step
     PAT (v0.11.0 step types) and from there to a one-spec
     compiled CAT.

2. `project.yaml` declares the new component
   - `name: metrics`, `type: referenced`, `role: backend`,
     `port: 3004`
   - `location: methodology-m/todo-m-workshop/todo-m-metrics`
   - `tag: ~` until the first release
   - The rest of the file is unchanged byte-for-byte apart from
     the new entry and the `health.endpoints` list

3. `docker-compose.yml` includes a `metrics` service
   - `build.context: ../todo-m-metrics` (sibling-on-disk
     convention)
   - Port mapping `3004:3004`
   - Backend environment variables consistent with other backends
     (`PORT=3004`, `DB_PATH` if persistence is mounted at the
     standard path)
   - Existing services are unchanged

4. `scripts/integration-test.sh` probes the new component
   - Aliveness probe targeting
     `http://${DOCKER_GATEWAY}:3004/health` expecting `"ok"`
   - `REPOS=` line includes `todo-m-metrics` in the managed-repo
     list
   - Existing probes and repo entries are unchanged

5. The regenerated artefacts are internally consistent
   - Every component in `project.yaml` appears in
     `docker-compose.yml`
   - Every referenced component in `project.yaml` appears in the
     `REPOS=` line
   - Every component in `project.yaml` has exactly one aliveness
     probe
   - No stale references to removed or renamed components

## Notes

This story is the **live evidence vehicle** for v0.12.0 ADD. It is
intentionally minimal so the orchestration itself — not domain
behaviour — is what's being demonstrated. Successful merge of the
integration-gate MR plus a green AOT pipeline is the L5 evidence
that the locked phase-split contract works end-to-end against a
real GitLab project.

See `docs/improvements-and-ideas.md` I-040 *Locked design (v0.12.0
ADD)* and `.m/capabilities/decompose-story/SKILL.md` *Phase
boundary* for the contract this story exercises.
