# TODOM-S03: Remove the metrics backend component

**Type:** Structural Story (REMOVE)
**Status:** Pending
**Created:** 2026-05-02

## Summary

Remove the `metrics` referenced backend component (port 3004) from
the todo-m topology. The component was added in TODOM-S02 (v0.12.0
ADD evidence) and has never accumulated any active callers — no
managed-repo source code references `http://metrics:3004/...`, and
no PAT outside of TODOM-S02's own gate spec probes the metrics
endpoint. This story is purely structural: no business behaviour
changes for any other component, only the topology shrinks.

This is the first **live** REMOVE-type structural story driven
through the v0.12.x orchestration:

```
decompose-story (unphased)   → caller pre-flight (must pass), readiness
                                tracker (empty components), mutate
                                project.yaml, regenerate topology artefacts
generate-pats                → one-AC story PAT using expect-unreachable
compile-story-pats           → compile + bundle (incl. historical-CAT
                                delete for pats/TODOM-S02.cy.js) + raise
                                root MR
```

## Why now

Closes the v0.12.x REMOVE leg of I-040 against a real workshop
testbed. Demonstrates: (a) the verifiability invariant holds — the
pre-flight passes because metrics has no active callers; (b) the
expect-unreachable step verb compiles and runs cleanly; (c) the
historical-CAT delete keeps the cypress spec set in sync with the
shrunken topology; (d) the source-repo guard on the regenerated
detect-story-trigger.sh prevents spurious shadow runs from the
orphan todo-m-metrics webhook after merge.

## Acceptance criteria (story prose)

1. After this story merges, the composed system stands up with four
   services instead of five — shell, mfe, api-read, api-write — and
   the regenerated topology aliveness probes pass for those four.

2. The metrics endpoint that was previously available at
   `http://metrics:3004/health` no longer responds. A request from
   inside the docker-compose network either fails at the network
   layer (DNS lookup fails because there's no `metrics` service) or
   times out. Cypress's `expect-unreachable` verb captures this
   negative-existence assertion.

3. The historical compiled CAT for TODOM-S02 (`pats/TODOM-S02.cy.js`)
   is removed from the root repo's `pats/` directory so cypress's
   `**/*.cy.js` glob no longer surfaces it. The PAT yaml
   (`pats/TODOM-S02.pat.yaml`) and readiness tracker
   (`stories/TODOM-S02.yaml`) stay on main as audit trail.

4. The orphan `todo-m-metrics` repo on GitLab is left untouched by
   M (managed-repo decommission is the user's decision, see I-061).
   Future MR webhooks from that orphan classify as standalone
   thanks to the source-repo guard added to `detect-story-trigger.sh`.

## Components

- **none** — pure REMOVE has zero managed-repo sub-tasks. The
  change is entirely in the root repo's `project.yaml` + the
  renderer regenerating topology artefacts.

## Out of scope

- Decommissioning the `todo-m-metrics` managed repo on GitLab.
- Removing the webhook + CI variables on the orphan repo.
- Changing any other component's behaviour (verifiability invariant
  — see decompose-story SKILL Step 2 REMOVE pre-flight).
