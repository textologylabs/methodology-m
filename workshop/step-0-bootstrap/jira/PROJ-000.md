# PROJ-000: System Bootstrap — Hello World Through the Full Stack

## Type
Technical / Infrastructure

## Description
As a development team, we need to prove the M-type project infrastructure works before building real features, so that we have confidence in the distributed plumbing from day one.

This is Story Zero — the bootstrapping story that validates:
- Module Federation loads the MFE into the shell
- The MFE can call the API and display the response
- CI pipelines build, test, and auto-tag on merge
- The root repo can orchestrate topology and run story-level tests

## Acceptance Criteria
- AC-001: When the user navigates to `/`, the shell loads and displays content rendered by the MFE
- AC-002: The MFE fetches from the API and displays the response message
- AC-003: All four repos have CI pipelines that auto-tag on merge to main
- AC-004: The root repo's story-level Cypress tests pass against the composed system

## Sub-tasks
- PROJ-000a: Scaffold todo-api-read with hello endpoint
- PROJ-000b: Scaffold todo-api-write with placeholder endpoint
- PROJ-000c: Scaffold todo-mfe with hello component
- PROJ-000d: Scaffold todo-root shell, Module Federation host, Cypress tests

## Notes
This story uses the same PAT-driven flow as all subsequent stories. The "implementation" is the scaffolding itself — creating repos, configuring Module Federation, wiring APIs, setting up CI. The PAT validates that it all works end-to-end.

The output is `project.yaml` at `v0.1.0` — the baseline for all future stories.
