# TODOM-S02a: metrics

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-S02
**Component:** metrics
**Repo:** todo-m-metrics

## Summary

Stand up `todo-m-metrics` as a baseline backend managed repo: a
single `/health` endpoint returning HTTP 200 + `"ok"`, the
standard backend Dockerfile + CI scaffold, and a sub-task PAT
that pins the seed contract.

This sub-task represents the **scaffold-repo** lever in the ADD
orchestration. After `scaffold-repo` runs against this file,
Phase B of `decompose-story` will mutate `project.yaml` to thread
the new component into the topology.

## Acceptance Criteria

1. `GET /health` on the running `metrics` container returns
   HTTP 200 with body containing `"ok"`
   - Same shape as the other backends (`api-read`, `api-write`)
     so the topology aliveness probe and the story-level CAT can
     hit the same contract
   - Listens on port 3004 (the next free port after `api-write`
     at 3003)

## Out of scope

- Any actual metrics behaviour (counter collection endpoints,
  read endpoints, persistence wiring, dashboards). Filed as
  follow-up business stories after the topology mutation lands.
- Any change to existing components.

## Notes

This sub-task is the **only** sub-task for TODOM-S02. Per v0.12.0
locked design, ADD stories produce a sub-task PAT for the new
component only — existing components are unchanged by an ADD and
get no "no-behavior-change" PATs.

The sub-task PAT (`<repo>/pats/TODOM-S02a.pat.yaml`) is authored
by `generate-pats` next in the lifecycle, parented to TODOM-S02.
