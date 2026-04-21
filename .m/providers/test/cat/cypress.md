# Test CAT Provider: cypress

Reference implementation of the `test.cat.*` namespace for browser-level
acceptance tests. Compiles a story-level PAT yaml into a Cypress spec
(`pats/<story-id>.cy.js`).

Select by setting `providers.test.cat: cypress` in `project.yaml`. This
is the default choice for projects whose story PATs use the browser
step verbs (`navigate`, `click`, `type`, `assert`, `wait`).

## Function: `test.cat.compile_story_pat(pat)`

**Parameters:** parsed story-level PAT object (must have `story`,
`version`, `acceptance[]`).

**Returns:** `{ path, content, mode }`

- `path` — `pats/<story-id>.cy.js`
- `content` — Cypress spec as UTF-8 text
- `mode` — `0o644`

Pure function of `pat`. Same input produces byte-identical output.
No filesystem reads, no timestamps, no randomness.

**Implementation:** see [`./cypress.mjs`](./cypress.mjs). The code is
the source of truth for compilation behaviour; this document describes
the contract only.

## Step → Cypress mapping

Step values are authored as yaml double-quoted scalars so the yaml
parses cleanly. The table below shows the **parsed string value**
(what the provider sees) and the Cypress it emits.

| PAT step value | Cypress command |
|---|---|
| `navigate: /path` | `cy.visit('/path')` |
| `click: [data-testid='X']` | `cy.get('[data-testid="X"]').click()` |
| `type: [data-testid='X'] value 'Y'` | `cy.get('[data-testid="X"]').type('Y')` |
| `assert: [data-testid='X'] is visible` | `cy.get('[data-testid="X"]').should('be.visible')` |
| `assert: [data-testid='X'] is disabled` | `cy.get('[data-testid="X"]').should('be.disabled')` |
| `assert: [data-testid='X'] contains 'Y'` | `cy.get('[data-testid="X"]').should('contain', 'Y')` |
| `assert: [data-testid='X'] count > N` | `cy.get('[data-testid="X"]').should('have.length.greaterThan', N)` |
| `wait: [data-testid='X'] is visible` | `cy.get('[data-testid="X"]').should('be.visible')` |
| `wait: [data-testid='X'] contains 'Y'` | `cy.get('[data-testid="X"]').should('contain', 'Y')` |

**Yaml authoring form** — because the parsed value may contain `[`,
`'`, and spaces, authors wrap the whole value in outer double quotes:

```yaml
- type: "[data-testid='todo-input'] value 'Buy milk'"
```

Inner text values use single quotes and may not themselves contain a
single quote (a constraint enforced by `pat.schema.json`). This keeps
the yaml trivially parseable with no escaping gymnastics.

## Invariants

- **One `it()` per acceptance criterion.** Title is `<id>: <when> → <then>`.
- **Step order is preserved.** ACs and steps within ACs render in the
  order declared in the PAT. Never sorted.
- **`render:` steps are rejected.** They are sub-task-only (component
  test with mocks) and have no browser-level compilation. Attempting
  to compile them raises an error — use `generate-acceptance-tests`
  for repo-level PATs, not this provider.
- **No filesystem or network I/O.** File I/O is the caller's
  responsibility (the `compile-story-pats` orchestrator writes the
  returned `{path, content}`).
- **Output extension is `.cy.js`** via the exported `spec_extension`
  constant, consumed by the orchestrator for filename resolution.

## Regression coverage

Byte-level determinism and every step variant above is exercised by
[`./cypress.test.mjs`](./cypress.test.mjs) against fixture PATs in
`.m/test-fixtures/`. Extending the mapping requires adding tests
first.
