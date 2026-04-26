# Test CAT Provider: cypress

Reference implementation of the `test.cat.*` namespace. Compiles a
story-level PAT yaml into a Cypress spec (`pats/<story-id>.cy.js`)
covering both browser-level and HTTP-level assertions in a single
output.

Select by setting `providers.test.cat: cypress` in `project.yaml`.
This is the default choice for any project whose story PATs use the
browser step verbs (`navigate`, `click`, `type`, `assert`, `wait`)
and/or the HTTP step verbs (`http`, `expect-status`,
`expect-body-contains`). HTTP steps compile to `cy.request(...)`
within the same Cypress runner — no separate framework is needed.

> **Methodology stance (v0.11.0 / I-045):** PAT step types are
> framework-agnostic at the schema layer; the cypress provider
> absorbs HTTP via the host runner (`cy.request`) rather than
> splitting framework selection into a compiler dimension. A
> standalone `curl`/`supertest` provider is deferred until a
> backend-only project actually demands one.

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
parses cleanly. The tables below show the **parsed string value**
(what the provider sees) and the Cypress it emits.

### Browser steps

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

### HTTP steps (v0.11.0 / I-045)

| PAT step value | Cypress command |
|---|---|
| `http: GET /count` | `cy.request('GET', '/count').as('lastResponse')` |
| `http: GET http://api:3002/todos` | `cy.request('GET', 'http://api:3002/todos').as('lastResponse')` |
| `http: POST http://api:3002/todos body '{"text":"buy milk"}'` | `cy.request({ method: 'POST', url: 'http://api:3002/todos', body: {"text":"buy milk"} }).as('lastResponse')` |
| `expect-status: 200` | `cy.get('@lastResponse').its('status').should('equal', 200)` |
| `expect-body-contains: "\"count\":0"` | `cy.get('@lastResponse').its('body').then((b) => expect(typeof b === 'string' ? b : JSON.stringify(b)).to.include('"count":0'))` |

**HTTP grammar notes:**

- **Methods.** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. Other methods
  are a schema error — extend the schema and provider together if
  you need them.
- **URL forms.** Relative URLs (e.g. `/count`) resolve against the
  Cypress runner's `baseUrl`; absolute URLs (e.g. `http://api:3002/...`)
  are used as-is. Use absolute URLs for cross-service backend probes,
  relative for same-origin.
- **Body.** Optional. When present, must be valid JSON. The provider
  embeds the JSON literal directly into the spec source as a JS object
  (JSON ⊂ JS). The body string itself may not contain a single quote
  — use `'` if an apostrophe is genuinely needed inside a JSON
  value.
- **`expect-status` / `expect-body-contains` operate on `@lastResponse`,**
  the alias set by the most recent `http:` step. Order them
  immediately after their `http:` step. Interleaving an `http:` step
  re-aliases `@lastResponse` to the new response.
- **`expect-body-contains` is a literal substring match,** not a JSON
  path. Object bodies are stringified via `JSON.stringify` before
  matching, so authors include the JSON punctuation they expect
  (`"count":0`, including the inner double quotes). Use raw
  double-quote escapes in the yaml scalar: `"\"count\":0"`.

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
- **Mixed PATs are first-class.** Browser ACs and HTTP ACs (or both
  in the same AC) compile to a single `.cy.js` — the runner handles
  the whole spec end-to-end without provider-level coordination.
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
