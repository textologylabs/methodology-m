# generate-acceptance-tests

**Capability:** Transform PAT stubs into executable acceptance test code

## What it does

Reads the PAT stub file (`pats/<sub-task-id>.stub.js`) and the sub-task
file, then generates real, executable acceptance tests (CATs) using the
appropriate framework for the component type. After this step, `npm test`
proves the implementation meets its contract.

The stub is the specification. The spec is the compiled proof. This
capability bridges the two.

**Scope:** This capability produces CATs — compiled acceptance tests that
prove the PAT contract is met. Unit tests (vitest, Testing Library, etc.)
are a separate developer-level concern created during implementation, not
by this capability. Both layers coexist in the repo but serve different
purposes and are authored at different times.

## Parameters

| Parameter     | Type   | Required | Description                                        |
|---------------|--------|----------|----------------------------------------------------|
| sub-task-id   | string | Yes      | Sub-task identifier (e.g. TODOM-000c)              |
| repo-path     | path   | No       | Local path to the managed repo (inferred from CWD if omitted) |

## Prerequisites

- Managed repo is scaffolded (`scaffold-repo`)
- Implementation exists (`implement-component` has been run)
- PAT stub exists at `pats/<sub-task-id>.stub.js`
- Sub-task file exists at `jira/<sub-task-id>.md`

## Execution

### Step 1 — Read the contract and implementation

Read `pats/<sub-task-id>.stub.js` — this is the test specification
in pseudocode form. Each `it()` block contains comments describing
what to assert.

Read `jira/<sub-task-id>.md` — for acceptance criteria context and
component role.

Read the implementation source files (`src/`) — to understand the
API surface, exports, and how to import the component under test.

### Step 2 — Determine test framework

Based on the component role:

| Role | CAT Framework | Test Runner | Why |
|------|--------------|-------------|-----|
| backend (API) | supertest | vitest | HTTP contract testing without starting a server |
| frontend (MFE) | Cypress | cypress | PATs are user-level criteria — must validate through the real UI in a browser |
| frontend-host (shell) | Cypress | cypress | Story-level, composed system, browser required |

**Why Cypress for MFEs?** PATs are acceptance criteria written from the
user's perspective. For any UI component, that means verifying behaviour
through the rendered UI in a real browser — not through jsdom unit tests.
Unit tests (vitest + Testing Library) are valuable during implementation
for fast feedback on component logic, but they are NOT PAT compilations.
Only browser-based tests satisfy the PAT contract for frontend components.

### Step 3 — Add test dependencies

Add the required devDependencies to `package.json`:

**For backend API repos:**
- `vitest` — test runner
- `supertest` — HTTP assertion library

**For frontend repos (MFE, shell):**
- `cypress` — browser-based acceptance testing

Also add runtime helpers needed by the Cypress test job:
- `express` — for API stubs (if not already present)
- `cors` — for API stubs (if not already present)
- `serve` — static file server for the built frontend
- `wait-on` — wait for services to be ready before running tests

### Step 4 — Create test config

**For backend API repos:** If the repo doesn't already have a
`vitest.config.js`, create one:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

**For frontend repos (MFE, shell):** If the repo doesn't already have a
`cypress.config.js`, create one:

```
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    supportFile: false,
    specPattern: 'pats/**/*.cy.js',
  },
})
```

The `baseUrl` should match the port the built frontend is served on.
The `specPattern` points to the PAT directory where CATs live.

### Step 5 — Transform stubs into specs

Create `pats/<sub-task-id>.spec.js` (backend) or
`pats/<sub-task-id>.cy.js` (frontend) alongside the stub file.

**Transformation rules:**
- Keep the same `describe()` and `it()` structure from the stub
- Replace comment placeholders with real assertions
- Import the component under test (app, component, etc.)
- For API tests: use supertest to make HTTP requests against the
  imported app (not a running server)
- For frontend tests (MFE, shell): use Cypress to visit the page,
  interact with elements via `data-testid` attributes, and assert
  on visible UI state

### Step 5a — Handle PAT supersession (replaces/removes)

Before writing the new spec, check the sub-task file for `replaces`
or `removes` declarations in the acceptance criteria.

**For `replaces`:** Find the existing test file for the superseded AC
(e.g. `pats/TODOM-000b.cy.js` if replacing `TODOM-000b/AC-001`).
Update or rewrite the affected test(s) in that file to match the new
behaviour. Do NOT leave old assertions that test superseded behaviour
— they will fail in CI.

**For `removes`:** Find the existing test file and delete the test(s)
for the removed AC. If the entire file becomes empty, delete the file.

**This is not optional.** If the sub-task declares supersession and
you skip this step, old tests will fail in CI. The test suite must
always reflect the current active PAT set — not the historical one.

**For backend API repos (supertest pattern):**
```
import request from 'supertest'
import app from '../src/app.js'

describe('...', () => {
  it('...', async () => {
    const res = await request(app).get('/endpoint')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('expectedField')
  })
})
```

**Key:** Import `app.js` directly, not `server.js`. Supertest
binds to the app internally — no port needed, no server to clean up.

**For frontend repos (Cypress pattern):**
```
describe('<sub-task-id>: <description>', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('<acceptance criterion>', () => {
    cy.get('[data-testid="<element>"]').should('be.visible')
    // ... assertions matching the PAT stub
  })
})
```

**Key:** Cypress tests run against the built frontend served statically.
API stubs provide the backend. The test validates the full user-facing
behaviour described in the PAT.

### Step 6 — Update test script and CI pipeline

**For backend API repos:**

Ensure `package.json` has:
```
"test": "vitest run"
```

The `run` flag ensures vitest executes once and exits (no watch mode).
This is critical for CI — watch mode would hang the pipeline.

**For frontend repos (MFE, shell):**

Ensure `package.json` has:
```
"test": "cypress run"
```

Then update `.gitlab-ci.yml` to handle the Cypress test job properly.
The test job needs a Cypress Docker image, stub startup, a static
server for the built frontend, and health checks before running tests.

**CI image pinning rule:** The `cypress/included` image tag MUST match
the Cypress version in `package.json`. Read the Cypress version from
`devDependencies` and use that exact version as the image tag. Never
use `:latest` — it drifts independently of the npm package and causes
"binary not found" failures when the versions diverge.

Updated test job for frontend repos:

```
test:
  stage: test
  image:
    name: cypress/included:<cypress-version-from-package.json>
    entrypoint: [""]
  script:
    - node pats/stubs/api-read.js &
    - node pats/stubs/api-write.js &
    - npm run build --if-present
    - npx serve dist -l 3001 &
    - npx wait-on http://localhost:3002/health http://localhost:3003/health http://localhost:3001
    - npx cypress run
  needs: [install]
```

**Stub startup:** Start all API stubs in `pats/stubs/api-*.js` as
background processes. Each stub exposes a `/health` endpoint.

**Build and serve:** Build the frontend, then serve the `dist/` folder
on the component's port (e.g. 3001 for MFE).

**Wait-on:** Wait for all stub health endpoints and the static server
before running Cypress. Without this, tests hit connection refused.

**Image entrypoint:** The `cypress/included` image has a default
entrypoint that runs `cypress run` immediately. Setting
`entrypoint: [""]` overrides this so the CI script controls execution.

### Step 7 — Install dependencies and run tests

Run `npm install` to install the new devDependencies and update
`package-lock.json`.

Run `npm test` to verify the generated tests pass against the
implementation.

**If tests fail:** Review the spec, fix the assertions or the
implementation, and re-run. The goal is green tests before moving on.

### Step 8 — Present for review

Show the user:
- The stub file (what was specified)
- The spec file (what was generated)
- The test output (passing/failing)

Ask the user to review and confirm. They may want to adjust
assertions, add edge cases, or rename test descriptions.

### Step 9 — Report

Output:
- Spec file created (`pats/<sub-task-id>.spec.js` or `pats/<sub-task-id>.cy.js`)
- Test framework and dependencies added
- CI pipeline updated (for frontend repos: pinned Cypress image, stub startup)
- Test results (pass/fail count)
- Reminder: do NOT delete the stub file — it's the human-readable
  contract. The spec is the machine-readable proof. Both live in `pats/`.

## Notes

- The stub file is never deleted or modified. It remains as the
  human-readable specification alongside the executable spec.
- Tests must import the app/component directly, not via a running
  server. This is why `implement-component` separates app from server.
- For API repos, supertest + vitest is the standard. Supertest handles
  the HTTP layer; vitest provides the test runner and assertions.
- For frontend repos (MFE, shell), Cypress is the CAT framework.
  It validates the real UI in a real browser — the only way to prove
  user-facing acceptance criteria are met.
- **Unit tests vs CATs:** Frontend repos will typically have BOTH
  vitest unit tests (created during implementation for fast feedback)
  and Cypress CATs (created by this capability to prove the PAT
  contract). They coexist. Unit tests run via `npm run test:unit`,
  CATs run via `npm test` (which maps to `cypress run`). CI runs
  `npm test` — the CATs are what gate the MR.
- The `vitest run` flag is essential for backend repos. Without it,
  vitest starts in watch mode, which hangs CI pipelines indefinitely.
- PAT stubs use `describe`/`it` syntax even though they're pseudocode.
  This makes the transformation mechanical — same structure, real
  assertions replacing comments.
- **CI image pinning:** Always pin `cypress/included` to the exact
  version from `package.json`. The `:latest` tag drifts independently
  of the npm package — when they diverge, the Cypress binary path
  doesn't match and CI fails with "binary not found." This is a
  silent, intermittent failure that's hard to debug in a live demo.
- **Stub/CI coupling:** Every stub in `pats/stubs/api-*.js` must be
  started in the CI test job and its `/health` endpoint must be in
  the `wait-on` list. If you add or modify a stub, update the CI
  config to match.
