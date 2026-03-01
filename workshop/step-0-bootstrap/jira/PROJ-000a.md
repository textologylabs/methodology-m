# PROJ-000a: Scaffold todo-api-read with hello endpoint

## Parent
PROJ-000 — System Bootstrap

## Component
todo-api-read

## Description
Create the todo-api-read repository with a minimal Node.js/Express service that proves the API layer works.

## Acceptance Criteria
- GET /hello returns 200 with JSON body containing a `message` field
- The response message is "Hello from API Read"
- CI pipeline builds, tests, and auto-tags on merge to main

## Implementation Notes
- Node.js + Express (minimal)
- Single endpoint for now — real endpoints come in PROJ-001
- `.gitlab-ci.yml` with build, test, release stages
- Auto-tag uses semantic versioning (v0.1.0 for initial release)
