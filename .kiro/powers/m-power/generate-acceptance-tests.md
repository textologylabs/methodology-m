# M Power: generate-acceptance-tests

**Capability:** Transform PAT stubs into executable acceptance test code

## What it does

Reads the PAT stub file (`pats/<sub-task-id>.stub.js`) and the sub-task
file, then generates real, executable acceptance tests using the
appropriate framework for the component type. After this step, `npm test`
proves the implementation meets its contract.

The stub is the specification. The spec is the compiled proof. This
capability bridges the two.

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

| Role | Test Framework | Test Runner | Why |
|------|---------------|-------------|-----|
| backend (API) | supertest | vitest | HTTP contract testing without starting a server |
| frontend (MFE) | Testing Library | vitest | Component rendering with mocked API |
| frontend-host (shell) | Cypress | cypress | Story-level, composed system, browser required |

### Step 3 — Add test dependencies

Add the required devDependencies to `package.json`:

**For backend API repos:**
- `vitest` — test runner
- `supertest` — HTTP assertion library

**For MFE repos:**
- `vitest` — test runner
- `@testing-library/react` — component testing
- `@testing-library/jest-dom` — DOM matchers
- `jsdom` — browser environment for vitest

**For shell/root repos:**
- `cypress` — end-to-end testing

### Step 4 — Create vitest config (if needed)

If the repo doesn't already have a `vitest.config.js`, create one:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

For MFE repos, add the jsdom environment:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

### Step 5 — Transform stubs into specs

Create `pats/<sub-task-id>.spec.js` alongside the stub file.

**Transformation rules:**
- Keep the same `describe()` and `it()` structure from the stub
- Replace comment placeholders with real assertions
- Import the component under test (app, component, etc.)
- For API tests: use supertest to make HTTP requests against the
  imported app (not a running server)
- For MFE tests: render the component and assert on DOM output
- For shell tests: use Cypress to navigate and assert

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

### Step 6 — Update test script in package.json

Ensure `package.json` has the correct test script:

```
"test": "vitest run"
```

The `run` flag ensures vitest executes once and exits (no watch mode).
This is critical for CI — watch mode would hang the pipeline.

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
- Spec file created (`pats/<sub-task-id>.spec.js`)
- Test framework and dependencies added
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
- For MFE repos, Testing Library + vitest tests the component in
  isolation with a mocked API. No real backend needed.
- For the root repo (shell), Cypress tests the composed system
  end-to-end. This is a Stage 2 concern — not part of Stage 1.
- The `vitest run` flag is essential. Without it, vitest starts in
  watch mode, which hangs CI pipelines indefinitely.
- PAT stubs use `describe`/`it` syntax even though they're pseudocode.
  This makes the transformation mechanical — same structure, real
  assertions replacing comments.
