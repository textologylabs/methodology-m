# PROJ-000b: Scaffold todo-api-write with placeholder endpoint

## Parent
PROJ-000 — System Bootstrap

## Component
todo-api-write

## Description
Create the todo-api-write repository with a minimal Node.js/Express service. This service handles write operations but for Story Zero only needs a placeholder to prove the repo and CI work.

## Acceptance Criteria
- POST /placeholder returns 200 OK
- CI pipeline builds, tests, and auto-tags on merge to main

## Implementation Notes
- Node.js + Express (minimal)
- Placeholder endpoint only — real write endpoints come in PROJ-002 ("add a todo")
- `.gitlab-ci.yml` with build, test, release stages
- Auto-tag uses semantic versioning (v0.1.0 for initial release)
