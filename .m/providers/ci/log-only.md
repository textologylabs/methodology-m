# CI Provider: log-only

Trace stub for the `ci.*` namespace. Does no real rendering — emits a
single text file recording what was dispatched, which scm provider it
was paired with, and what top-level inputs it saw. Used to verify the
orchestrator's resolution and dispatch logic without exercising a real
pipeline render path.

Select by setting `providers.ci: log-only` in `project.yaml`.

## Function: `ci.render_pipeline(project, scm)`

Returns one `{path, content}` entry:

- `.m-trace/ci-log-only.txt` — plain-text record with the provider
  name, scm provider, project name, group, and component names.

**Implementation:** see [`./log-only.mjs`](./log-only.mjs). The code
is the source of truth for behaviour.

## Invariants

- Pure function of `(project, scm)` — same input produces byte-identical
  output.
- Emits exactly one file.
- Never touches the filesystem or network — file I/O is the orchestrator's
  responsibility.
