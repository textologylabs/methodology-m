# Compose Provider: docker-compose

Reference implementation of the `compose.*` namespace using Docker
Compose as the orchestration strategy. Emits `docker-compose.yml` and
`scripts/integration-test.sh` derived from the project topology.

Select by setting `providers.compose: docker-compose` in `project.yaml`.
This is also the default when `compose.integration.strategy` is
`docker-compose` and `providers.compose` is omitted.

## Function: `compose.render_topology(project)`

**Parameters:** parsed `project` object (the full contents of
`project.yaml`, with `components[]`, `providers`, optional
`persistence`, etc.).

**Returns:** list of `{path, content, mode}` entries:

- `docker-compose.yml` (mode 0o644) — services block derived from
  `project.components[]`, with role-specific additions (depends_on for
  `frontend-host`, environment + volumes for `backend`), plus a
  top-level `volumes:` block when `project.persistence` is declared.
- `scripts/integration-test.sh` (mode 0o755) — POSIX sh aliveness
  probe script with a pinned framework and one `check` call per
  component in declaration order.

Both files are pure functions of `project`. No filesystem reads, no
timestamps, no randomness. Running the function twice with the same
input returns byte-identical output.

**Implementation:** see [`./docker-compose.mjs`](./docker-compose.mjs).
The code is the source of truth for rendering behaviour; this document
describes the contract only.

## Invariants

- **Declaration order preserved.** Components render in the order they
  appear in `project.components[]`. Never sorted alphabetically.
- **Embedded vs referenced build.context.**
  `embedded` → `component.location` as-is.
  `referenced` → `../<basename-of-location>` (sibling-on-disk layout
  matching `m clone` and the `git clone` lines emitted by `ci/*`).
- **Port mappings are double-quoted strings** (`"3000:3000"`), matching
  docker-compose's string-literal parsing convention.
- **Persistence is read from `project.yaml` only.** The provider never
  inspects the existing `docker-compose.yml`; any drift between
  `project.yaml` and an on-disk compose file is an authoring bug.
- **DOCKER_GATEWAY default is `docker`**, matching GitLab DinD. Local
  runs override via `DOCKER_GATEWAY=localhost`.
- **No story integrity gate in `integration-test.sh`.** That is
  `wire-orchestration`'s responsibility and operates against the SCM
  API, not the filesystem.
- **Script uses POSIX `sh`, not bash.** No arrays, no `[[ ]]`, no
  `${var,,}`. The script runs in the alpine-based CI image where bash
  is absent.

## Aliveness probe templates

The `check` line emitted for each component depends on `role`:

| Role | Template |
|---|---|
| `frontend-host` | `check "<name> renders" "http://${DOCKER_GATEWAY}:<port>" "app-shell"` |
| `frontend` | `check "<name> remoteEntry.js served" "http://${DOCKER_GATEWAY}:<port>/remoteEntry.js" "webpackChunk"` |
| `backend` | `check "<name> health" "http://${DOCKER_GATEWAY}:<port>/health" "ok"` |

The `webpackChunk` substring is stable across module-federation builds
produced by webpack. Non-webpack bundlers (Vite, Rollup) need an
override — tracked under I-009's test/probe plugin dimension.

## Regression coverage

Byte-level determinism and every branch above is exercised by
[`./docker-compose.test.mjs`](./docker-compose.test.mjs) against the
four shared fixtures in `.m/test-fixtures/`. Extending the provider
requires adding tests to that suite first.
