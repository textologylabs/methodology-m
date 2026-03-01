# PROJ-000d: Scaffold todo-root shell with Module Federation host and Cypress

## Parent
PROJ-000 — System Bootstrap

## Component
todo-root (shell — embedded)

## Description
Complete the root repo setup: implement the shell as a Module Federation host, configure it to load the MFE, wire up the API URL, and generate story-level Cypress tests from the PATs.

## Acceptance Criteria
- Shell loads as Module Federation host with `data-testid='app-shell'`
- Shell successfully loads todo-mfe from its published URL
- MFE receives API URL configuration and can call the API
- Story-level Cypress tests pass against the composed system
- `project.yaml` pins all components at v0.1.0
- `docker-compose.yml` allows local composition of all services

## Implementation Notes

### Shell implementation
- Lightweight SPA host (React or vanilla)
- Webpack Module Federation host configuration
- Loads `todo-mfe` remote, renders its `./App` component
- Passes API URL to MFE via props or context

### Cypress generation flow
1. Compose system locally (`docker-compose up`)
2. Run story-level PATs via Playwright to validate integration
3. Generate Cypress from PATs: `pats/PROJ-000.pat.yaml` → `cypress/integration/PROJ-000.cy.js`
4. Review generated Cypress, commit to repo
5. CI runs committed Cypress tests (no AI in pipeline)

### Topology update
After all managed repos have tagged v0.1.0, update `project.yaml`:
```
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v0.1.0
  - name: todo-mfe
    type: referenced
    location: gitlab.com/org/todo-mfe
    tag: v0.1.0
  - name: todo-api-read
    type: referenced
    location: gitlab.com/org/todo-api-read
    tag: v0.1.0
  - name: todo-api-write
    type: referenced
    location: gitlab.com/org/todo-api-write
    tag: v0.1.0
```

### CI pipeline
- Stages: build, test (unit), integration (Cypress), release
- Integration stage composes system via docker-compose, runs Cypress
- Release stage tags the root repo on success
