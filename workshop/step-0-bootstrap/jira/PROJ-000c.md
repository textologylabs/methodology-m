# PROJ-000c: Scaffold todo-mfe with hello component

## Parent
PROJ-000 — System Bootstrap

## Component
todo-mfe

## Description
Create the todo-mfe repository with a React microfrontend that proves Module Federation and API integration work.

## Acceptance Criteria
- MFE exposes a component via Module Federation (`./App`)
- Component fetches from the API (GET /hello) and displays the message
- Component renders with `data-testid='mfe-content'` and `data-testid='api-message'`
- CI pipeline builds, tests, and auto-tags on merge to main

## Implementation Notes
- React + Webpack Module Federation plugin
- Exposes `./App` as the federated module
- API URL configured via environment variable
- Repo-level PAT uses mocked API response (isolated testing)
- `.gitlab-ci.yml` with build, test, release stages
- Auto-tag uses semantic versioning (v0.1.0 for initial release)
