# Compose Provider: log-only

Trace stub for the `compose.*` namespace. Does no real rendering —
emits a single text file recording what was dispatched and with what
top-level inputs. Used to verify the orchestrator's resolution and
dispatch logic without exercising a real compose render path.

Select by setting `providers.compose: log-only` in `project.yaml`.

## Function: `compose.render_topology(project)`

Returns one `{path, content}` entry:

- `.m-trace/compose-log-only.txt` — plain-text record with the provider
  name, project name, group, and component names.

**Implementation:** see [`./log-only.mjs`](./log-only.mjs). The code
is the source of truth for behaviour.

## Invariants

- Pure function of `project` — same input produces byte-identical
  output.
- Emits exactly one file.
- Never touches the filesystem or network — file I/O is the orchestrator's
  responsibility.
