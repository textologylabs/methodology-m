# Compose Provider: docker-compose

Reference implementation of the `compose.*` namespace using Docker Compose
as the orchestration strategy. Emits a `docker-compose.yml` describing the
services and a `scripts/integration-test.sh` that reaches them through the
docker network for aliveness verification.

Select by setting `providers.compose: docker-compose` in `project.yaml`.
If the field is absent, this is the default provider when
`compose.integration.strategy` is `docker-compose`.

## Function: `compose.render_topology(project)`

Returns a list of `{path, content}` entries:

1. `docker-compose.yml` — services block, one entry per component in
   `project.components`, rendered in declaration order.
2. `scripts/integration-test.sh` — topology aliveness probes (one `check`
   call per component). This script verifies the running system is
   alive. It does NOT contain a story integrity gate — that concern
   belongs to `wire-orchestration` and operates against the SCM API,
   not the filesystem.

Both files are pure functions of `project`. No filesystem reads, no
timestamps, no randomness.

### `docker-compose.yml` rendering rules

Top-level structure:

```yaml
services:
  <per-component blocks>
volumes:
  <persistence volume, if declared>
```

#### Per-component service blocks

Iterate `project.components[]` in declaration order. Each component gets
one top-level entry keyed by `component.name`. All service blocks contain
at minimum `build.context` and `ports`. Role-specific fields are appended.

**`build.context` derivation** — depends on `component.type`:

- `type: embedded` → use `component.location` as-is. It is already a
  repo-relative local path (e.g. `./packages/shell`).
- `type: referenced` → derive `../<basename of component.location>`
  where `component.location` is the SCM group path. Example:
  `methodology-m/todo-m-workshop/todo-m-mfe` → basename `todo-m-mfe` →
  context `../todo-m-mfe`. This places the build context as a sibling
  on disk, matching the layout produced by `m clone` and the
  `git clone` statements emitted by `ci/gitlab`.

**Port mapping** — `"<component.port>:<component.port>"` (string literal
in YAML, matching pass1 convention for consistency with `docker compose`
port parsing).

**Role-specific additions:**

| Role | Additional keys |
|---|---|
| `frontend-host` | `depends_on`: list of all other components in declaration order, by name. No environment. |
| `frontend` | (nothing beyond context + ports) |
| `backend` | `environment`: `["PORT=<component.port>"]`. If `project.persistence` is declared, append `DB_PATH=/data/<project.name>.db` (or the persistence-specific path — see persistence section below) and mount the persistence volume via `volumes: ["<project.persistence.volume>:/data"]`. |

**Persistence block** — if `project.persistence` is present and valid
(has both `type` and `volume`), every backend service gets:
- `volumes: ["<volume>:/data"]`
- `environment` includes `DB_PATH=/data/<project.name>.db` for sqlite, or
  an appropriate path for other persistence types (document here as new
  types are supported).

The top-level `volumes:` block declares the shared volume:

```yaml
volumes:
  <volume-name>:
```

If `project.persistence` is absent, no `volumes:` block is emitted and
no persistence environment variables are added to backend services.

**Persistence rule (I-036 hardening):** this provider reads persistence
intent *only* from `project.yaml`. It never inspects existing files on
disk, and it never preserves persistence declarations that are present
in an existing `docker-compose.yml` but missing from `project.yaml`.
This is deliberate — `project.yaml` is the single source of truth, and
any drift between it and the rendered artefact is a project-authoring
bug (closed in due course by I-047, which automates `project.yaml`
generation from Story Zero).

#### Canonical example

Given this `project.components[]`:

```yaml
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    role: frontend-host
    port: 3000
  - name: mfe
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-mfe
    role: frontend
    port: 3001
  - name: api-read
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-api-read
    role: backend
    port: 3002
  - name: api-write
    type: referenced
    location: methodology-m/todo-m-workshop/todo-m-api-write
    role: backend
    port: 3003
persistence:
  type: sqlite
  volume: todo-data
```

Renders (byte-identical):

```yaml
services:
  shell:
    build:
      context: ./packages/shell
    ports:
      - "3000:3000"
    depends_on:
      - mfe
      - api-read
      - api-write

  mfe:
    build:
      context: ../todo-m-mfe
    ports:
      - "3001:3001"

  api-read:
    build:
      context: ../todo-m-api-read
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - DB_PATH=/data/todo-m.db
    volumes:
      - todo-data:/data

  api-write:
    build:
      context: ../todo-m-api-write
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - DB_PATH=/data/todo-m.db
    volumes:
      - todo-data:/data

volumes:
  todo-data:
```

#### Determinism notes

- **Component order = declaration order.** Never sort alphabetically.
  `project.yaml` is the authoritative order; reordering there is a
  deliberate authoring change and should show up in the rendered diff.
- **Trailing newline** — always present (standard POSIX text file).
- **Blank lines between services** — exactly one blank line between
  adjacent service blocks, no blank line after the last service, one
  blank line before the `volumes:` block if present.
- **Quoting** — port mappings are always double-quoted strings. Other
  scalars are unquoted unless YAML would misinterpret them.

### `scripts/integration-test.sh` rendering rules

A single POSIX shell script with one topology-derived block and a
fixed framework around it. The framework is pinned for byte-stability;
only the probe block changes when topology changes.

#### Fixed preamble

```sh
#!/bin/sh
# Topology aliveness probes.
# Generated by compose.render_topology — do not edit by hand.
# Source of truth: project.yaml.

set -eu

# In GitLab DinD, published ports bind on the 'docker' host, not localhost.
# Locally, override by exporting DOCKER_GATEWAY (e.g. DOCKER_GATEWAY=localhost).
DOCKER_GATEWAY="${DOCKER_GATEWAY:-docker}"
TIMEOUT="${TIMEOUT:-60}"

check() {
  name="$1"
  url="$2"
  expected="$3"
  elapsed=0
  until response=$(curl -sf "$url" 2>/dev/null) && echo "$response" | grep -q "$expected"; do
    elapsed=$((elapsed + 2))
    if [ "$elapsed" -ge "$TIMEOUT" ]; then
      echo "FAIL: $name — $url did not contain '$expected' within ${TIMEOUT}s"
      return 1
    fi
    sleep 2
  done
  echo "✓ $name"
}
```

#### Aliveness probe block

Header (pinned for byte-stability):

```sh
# Infrastructure baseline — topology aliveness probes
echo "Infrastructure baseline — topology aliveness probes:"
```

Followed by one `check` call per component in declaration order.
Templates by role:

| Role | Emitted check |
|---|---|
| `frontend-host` | `check "<name> renders" "http://${DOCKER_GATEWAY}:<port>" "app-shell"` |
| `frontend` | `check "<name> remoteEntry.js served" "http://${DOCKER_GATEWAY}:<port>/remoteEntry.js" "webpackChunk"` |
| `backend` | `check "<name> health" "http://${DOCKER_GATEWAY}:<port>/health" "ok"` |

Notes:

- **`webpackChunk`** is a stable substring in any webpack-built
  `remoteEntry.js` (part of the module federation bootstrap code emitted
  by webpack). It is more reliable than guessing the federation name
  from the project or component name. Non-webpack bundlers (Vite,
  Rollup) should override this via an extension point — tracked under
  I-009's test/probe plugin dimension.
- **`<name> renders`** for `frontend-host` (not `<name> shell renders`)
  — avoids awkward doubled words when the component is literally named
  `shell`.
- **`ok` substring for backends** — the baseline `/health` endpoint from
  `scaffold-repo` returns a JSON body containing `"status": "ok"`. Any
  backend must preserve this invariant or the probe fails.

After the last component probe, emit the fixed epilogue:

```sh
echo ""
echo "All topology aliveness probes passed."
```

#### Scope note — no story integrity gate here

The rendered `integration-test.sh` contains **only** the pinned
framework, the aliveness probes, and the epilogue. It does NOT
contain a story integrity gate (the check that every referenced repo
has an open story MR). That gate is `wire-orchestration`'s
responsibility and lives in its own CI job against the SCM API —
filesystem existence of sibling directories is the wrong signal for
an integrity check that is fundamentally about SCM state.

An earlier iteration of this provider spec emitted a `REPOS=` block
and a directory-existence loop inside `integration-test.sh`. That
was dropped: the topology probe has one job (is the running system
alive?) and the integrity gate has another (does the story cover
every repo?). Conflating them produced a confusing script with
two unrelated failure modes.

The `REPOS=` list is still derived from `project.yaml` in one place
— the CI provider's status-reporting script (`report-shadow-status.sh`)
— because that script genuinely needs to iterate referenced repos
to fan out commit statuses. See `.m/providers/ci/<provider>.md`.

#### Canonical example

Given the 4-component topology in the docker-compose example above
(shell, mfe, api-read, api-write) with `project: todo-m`, the
topology-derived block renders as:

```sh
# Infrastructure baseline — topology aliveness probes
echo "Infrastructure baseline — topology aliveness probes:"
check "shell renders" "http://${DOCKER_GATEWAY}:3000" "app-shell"
check "mfe remoteEntry.js served" "http://${DOCKER_GATEWAY}:3001/remoteEntry.js" "webpackChunk"
check "api-read health" "http://${DOCKER_GATEWAY}:3002/health" "ok"
check "api-write health" "http://${DOCKER_GATEWAY}:3003/health" "ok"

echo ""
echo "All topology aliveness probes passed."
```

After TODOM-S01 (add `analytics` backend on port 3004), the regen
produces exactly one delta and nothing else:

```diff
 check "api-write health" "http://${DOCKER_GATEWAY}:3003/health" "ok"
+check "analytics health" "http://${DOCKER_GATEWAY}:3004/health" "ok"
```

If a regen diff shows anything else, the provider has a determinism
bug and must be fixed before accepting the change.

## Invariants enforced by this provider

- **Pure function of `project.yaml`.** No reads of existing files.
  Running the renderer twice with the same input produces byte-identical
  output.
- **Declaration order is preserved.** Never sort components alphabetically.
- **Embedded ≠ referenced** in the compose build.context rule.
  Getting this wrong produces a compose that references a
  non-existent sibling directory and fails at `docker compose build`.
- **Persistence is read from `project.yaml` only.** No "look at existing
  compose and preserve" logic.
- **No project-name hardcoding.** Every reference to the project name
  reads from `project.project`. Every reference to repo names constructs
  them from `project.project` and `component.name`.

## Gotchas

- **`DOCKER_GATEWAY` default is `docker`, not `localhost`.** This matches
  GitLab DinD CI behaviour. For local dev runs, override by exporting
  `DOCKER_GATEWAY=localhost` before invoking the script.
- **The script uses POSIX `sh`, not bash.** Intentional — the script runs
  in the alpine-based CI image which has no bash. Do not introduce
  bash-isms (arrays, `[[ ]]`, `${var,,}`, etc.).
- **Script is executable.** The calling capability must `chmod +x` after
  writing it. The provider does not handle mode bits — paths/contents
  only.
- **Volume name collision.** If a component is named `data` or similar
  and persistence declares a volume with the same name, docker-compose
  will error at parse time. The renderer does not detect this; rely on
  schema validation (future: cross-field validator in the schema).
