# todo-root — PROJ-000d

## Sub-task
Scaffold todo-root shell with Module Federation host and Cypress

## This is the integration point

The root repo dev (Casey) does the work that ties everything together:
- Shell implementation (Module Federation host)
- Local composition (docker-compose)
- Story-level PAT validation (Playwright)
- Cypress generation from PATs
- Topology management (project.yaml)

## Implementation

### Project structure
```
todo-root/
  packages/
    shell/
      src/
        App.jsx         # Shell component, loads MFE
        bootstrap.js    # Module Federation bootstrap
        index.js        # Entry point
      webpack.config.js # Module Federation host config
      package.json
  cypress/
    integration/
      PROJ-000.cy.js    # Generated from story-level PAT
  pats/
    PROJ-000.pat.yaml   # Story-level PAT
  stories/
    PROJ-000.yaml       # Readiness tracker
  jira/
    PROJ-000.md         # Story ticket (local markdown)
  project.yaml          # Topology
  docker-compose.yml    # Local composition
  .gitlab-ci.yml        # Root repo CI
  .kiro/
    agents/             # Custom subagents
    hooks/              # Event triggers
    steering/           # Project conventions
```

### Shell (Module Federation host)
```
// packages/shell/webpack.config.js (relevant section)
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    todoMfe: 'todoMfe@http://localhost:3000/remoteEntry.js',
    // In production, URL comes from environment
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
})
```

```
// packages/shell/src/App.jsx
const TodoApp = React.lazy(() => import('todoMfe/App'));

function Shell() {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  
  return (
    <div data-testid="app-shell">
      <Suspense fallback={<div>Loading...</div>}>
        <TodoApp apiUrl={apiUrl} />
      </Suspense>
    </div>
  );
}
```

### Docker Compose (local composition)
```
# docker-compose.yml
services:
  todo-api-read:
    image: todo-api-read:v0.1.0
    ports:
      - "3001:3001"

  todo-api-write:
    image: todo-api-write:v0.1.0
    ports:
      - "3002:3002"

  todo-mfe:
    image: todo-mfe:v0.1.0
    ports:
      - "3000:80"

  shell:
    build: ./packages/shell
    ports:
      - "8080:80"
    environment:
      - API_URL=http://todo-api-read:3001
      - MFE_URL=http://todo-mfe:80
```

### Story-level PAT validation flow

1. **Compose the system locally**
   ```
   docker-compose up -d
   ```

2. **Run story-level PATs via Playwright**
   Casey uses Kiro to execute `pats/PROJ-000.pat.yaml` against the running system. Playwright navigates to `http://localhost:8080`, checks for the shell, MFE content, and API message.

3. **Generate Cypress from PATs**
   When Playwright validation passes, Casey asks Kiro to generate Cypress:
   ```
   "Generate Cypress tests from pats/PROJ-000.pat.yaml"
   ```
   
   Kiro transforms the PAT steps into deterministic Cypress:
   ```
   // cypress/integration/PROJ-000.cy.js
   describe('PROJ-000: System Bootstrap', () => {
     it('AC-001: shell loads and displays MFE content', () => {
       cy.visit('/');
       cy.get('[data-testid="app-shell"]').should('be.visible');
       cy.get('[data-testid="mfe-content"]').should('be.visible');
     });

     it('AC-002: MFE fetches from API and displays message', () => {
       cy.visit('/');
       cy.get('[data-testid="api-message"]').should('contain', 'Hello');
     });
   });
   ```

4. **Review and commit**
   Casey reviews the generated Cypress, ensures it matches intent, commits to the repo.

### Topology (project.yaml)
```
# project.yaml (after Story Zero)
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v0.1.0
    role: frontend-host
  - name: todo-mfe
    type: referenced
    location: gitlab.com/org/todo-mfe
    tag: v0.1.0
    role: frontend
  - name: todo-api-read
    type: referenced
    location: gitlab.com/org/todo-api-read
    tag: v0.1.0
    role: backend
  - name: todo-api-write
    type: referenced
    location: gitlab.com/org/todo-api-write
    tag: v0.1.0
    role: backend
```

### Root repo CI (.gitlab-ci.yml)
```
stages:
  - build
  - test
  - integration
  - release

build:
  stage: build
  script:
    - npm ci
    - npm run build

test:
  stage: test
  script:
    - npm test

integration:
  stage: integration
  services:
    - docker:dind
  script:
    - docker-compose up -d
    - npx wait-on http://localhost:8080
    - npx cypress run
    - docker-compose down

release:
  stage: release
  only:
    - main
  script:
    - VERSION=$(node -p "require('./package.json').version")
    - git tag "v$VERSION"
    - git push origin "v$VERSION"
```

## The Cypress generation clarification

This is the Part 1 flow, happening at the root repo level:

1. **PAT exists** — written during Idea phase, topology-agnostic
2. **Dev validates with Playwright** — AI-driven, flexible, intent-based
3. **Dev generates Cypress** — transformation happens locally, reviewed by human
4. **Cypress committed** — deterministic tests in the repo
5. **CI runs Cypress** — no AI, no PAT interpretation, just Cypress

The transformation from PAT to Cypress is a one-time act during development. The Cypress tests are the permanent artefact. If the PAT changes (story iteration), the Cypress gets regenerated.

## Release
Tag: `todo-root@v0.1.0` (also tagged as `v0.1.0-story-zero-complete` for workshop replay)
