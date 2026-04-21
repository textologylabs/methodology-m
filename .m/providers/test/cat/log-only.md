# Test CAT Provider: log-only

Trace stub for the `test.cat.*` namespace. Does no real compilation —
emits a single text file recording what was dispatched and with what
top-level PAT inputs. Used to verify the `compile-story-pats`
orchestrator's resolution and dispatch logic without exercising a real
Cypress render path.

Select by setting `providers.test.cat: log-only` in `project.yaml`.

## Function: `test.cat.compile_story_pat(pat)`

Returns one `{path, content}` entry:

- `pats/<story-id>.trace.txt` — plain-text record with the provider
  name, story id, schema version, and acceptance criterion ids.

**Implementation:** see [`./log-only.mjs`](./log-only.mjs). The code
is the source of truth for behaviour.

## Invariants

- Pure function of `pat` — same input produces byte-identical
  output.
- Emits exactly one file.
- Never touches the filesystem or network — file I/O is the
  orchestrator's responsibility.
- `spec_extension` is `.trace.txt` (not `.cy.js`) so orchestrator
  output collisions with a real provider are impossible.
