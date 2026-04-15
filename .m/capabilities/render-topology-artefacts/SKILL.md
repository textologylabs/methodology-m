# render-topology-artefacts

**Capability:** Render all topology-derived artefacts from `project.yaml`
into the root repo, using the project's declared compose and CI providers.

## What it does

Reads `project.yaml`, schema-validates it, resolves the active `compose`
and `ci` providers, calls each provider's render function, and writes
the returned files to disk under the target directory.

This capability is the orchestrator for I-036: a single chokepoint for
"make the topology-derived files on disk match `project.yaml`". It is
called at bootstrap (initial seed), on structural changes
(by `decompose-story`), and anywhere else a topology edit needs to
propagate into filesystem artefacts.

**What this capability does NOT do:**

- Generate per-story files (sub-tasks, PATs, compiled CATs). That is
  `decompose-story`'s job. This capability only handles files that are
  pure functions of `project.yaml`.
- Interpret story prose. `project.yaml` is the input; how it got there
  is not this capability's concern.
- Read, merge, or preserve existing file content. Whatever exists on
  disk at the target paths is overwritten. Topology-derived artefacts
  are never hand-edited; any hand edits are drift and are deliberately
  dropped.

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| project-yaml | path | yes | Path to `project.yaml` — the only source of truth |
| target-dir | path | yes | Root repo directory; rendered file paths are relative to this |
| targets | list | no | Subset of artefact sets to render. Default: all. Values: `compose`, `ci`. |

## Execution

### Step 1 — Read and validate project.yaml

Read the file at `project-yaml`. Parse as YAML. Validate against
`.m/schemas/project.schema.json`. If validation fails, abort with the
schema error message and do not write anything.

Extract (for downstream dispatch):

- `project.project` — project name
- `project.group` — SCM group path
- `project.components[]` — declaration-ordered component list
- `project.providers.scm` — active SCM provider (default: `gitlab`)
- `project.providers.compose` — active compose provider (default
  resolution rule below)
- `project.providers.ci` — active CI provider (default: matches
  `providers.scm`)
- `project.persistence` — optional persistence block

### Step 2 — Resolve providers

**Compose provider resolution:**

1. If `project.providers.compose` is set, use it.
2. Else if `project.compose.integration.strategy` is set, use the
   provider matching that strategy (e.g. `docker-compose` strategy →
   `compose/docker-compose` provider).
3. Else error with message `"No compose provider declared and no
   compose.integration.strategy to infer from. Set providers.compose."`

**CI provider resolution:**

1. If `project.providers.ci` is set, use it.
2. Else use the value of `project.providers.scm`. Rationale: the CI
   pipeline format is almost always tied to the SCM platform, so
   defaulting CI to match SCM is the right default for 99% of projects.
3. Else error with message `"No CI provider declared and no SCM
   provider to infer from. Set providers.ci."`

Load the provider definition files:

- `.m/providers/compose/<compose-provider>.md`
- `.m/providers/ci/<ci-provider>.md`

If either file does not exist, abort with a clear `"Provider <name>
not found at <path>"` error.

### Step 3 — Filter by targets

If the `targets` parameter was provided, only dispatch to the requested
provider namespaces. If `targets` is omitted, dispatch to both `compose`
and `ci`.

Invalid `targets` values (anything outside `compose`, `ci`) fail fast
with a list of supported values.

### Step 4 — Dispatch

For each selected target:

**`compose` target:**

Call `compose.render_topology(project)` per the resolved compose
provider's contract. The provider returns a list of `{path, content}`
entries.

**`ci` target:**

Call `ci.render_pipeline(project, scm=<resolved scm provider>)` per the
resolved CI provider's contract. The provider returns a list of
`{path, content}` entries.

Collect all returned file entries into a single flat list. Note: paths
from `compose` and `ci` providers MUST NOT collide. If a collision
occurs, abort with `"Provider output collision at <path>: <compose
provider> and <ci provider> both claim this file"`.

### Step 5 — Write files

For each `{path, content}` entry in the combined list:

1. Resolve the final path: `<target-dir>/<path>`.
2. Create parent directories if they do not exist.
3. Write `content` to the final path, overwriting any existing file.
4. For files under `scripts/`, set executable bit (`chmod +x`). The
   provider MAY signal non-executability via a future extension but
   the default assumption is that `scripts/*.sh` is executable.

Do not write atomically (no temp-file + rename dance). The expectation
is that this capability is called from a capability flow that commits
the resulting files to git — git's own staging and checkout provide
transactional semantics.

### Step 6 — Report

Return a summary:

```yaml
rendered:
  compose:
    - <path>
    - <path>
  ci:
    - <path>
    - <path>
providers:
  compose: <name>
  ci: <name>
  scm: <name>
```

## Error modes

Every error must be fail-fast with a clear message. No silent defaults,
no partial writes.

| Condition | Error message |
|---|---|
| `project.yaml` not found | `project.yaml not found at <path>` |
| YAML parse error | `project.yaml parse error: <detail>` |
| Schema validation fails | `project.yaml schema validation failed: <schema error>` |
| Unknown `targets` value | `Unknown target: <value>. Supported: compose, ci` |
| Compose provider cannot be resolved | `No compose provider declared and no compose.integration.strategy to infer from. Set providers.compose.` |
| CI provider cannot be resolved | `No CI provider declared and no SCM provider to infer from. Set providers.ci.` |
| Provider definition file missing | `Provider <name> not found at <path>` |
| Output path collision between providers | `Provider output collision at <path>: <compose provider> and <ci provider> both claim this file` |
| Port collision in components | `Port collision: <port> claimed by <component-a> and <component-b>` (reported by schema validation) |
| Persistence has `type` but no `volume` | `Invalid persistence block: <detail>` (reported by schema validation) |

## Determinism guarantee

Same `project.yaml` → byte-identical output tree, always. This is
enforceable by running the capability twice against the same input
and diffing the output — the diff MUST be empty. The I-036 regression
harness (TODOM-S01 fixture under `.work/i-036/before-*/` vs `after-*/`)
does exactly this diff as the refactor safety net.

## Callers

- `bootstrap-root-repo` — called once during initial project seeding,
  with `targets` unset (render everything). Produces the initial
  topology-derived files that the bootstrap commit pushes alongside
  `project.yaml` itself, seed `packages/shell/`, and the `pats/`,
  `stories/`, `.m/` skeletons.

- `decompose-story` (structural branch, S-2/S-3) — called once on each
  structural-story run, AFTER `project.yaml` has been mutated by S-1.
  Replaces the inline compose + integration-test rendering that
  decompose-story used to do by itself. The renderer is the single
  topology chokepoint for structural changes.

- `m rebuild-topology` (future CLI command, not in v0.5.0 scope) — a
  manual escape hatch for regenerating artefacts when something has
  drifted or been damaged.

## Provider interface dependencies

This capability depends on:

- `.m/providers/provider-interface.md` — namespace declarations for
  `compose.*` and `ci.*`.
- `.m/providers/compose/<provider>.md` — one of the compose provider
  implementations. Ships with `compose/docker-compose`.
- `.m/providers/ci/<provider>.md` — one of the CI provider implementations.
  Ships with `ci/gitlab`.
- `.m/schemas/project.schema.json` — schema for validation (must include
  `providers.compose` and `providers.ci` fields — updated as part of
  I-036).

## Refactor compatibility note

This capability exists specifically to move topology-artefact rendering
out of `decompose-story`. Before I-036, `decompose-story` S-2 and S-3
contained inline rendering logic for `docker-compose.yml` and
`scripts/integration-test.sh`. That logic is now a pure function
behind the compose provider boundary. Calling code in `decompose-story`
becomes a one-liner:

    render-topology-artefacts(
      project-yaml: "project.yaml",
      target-dir:   "."
    )

The renderer produces byte-identical output to the prior inline logic
for the reference (docker-compose + gitlab) stack on the TODOM-S01
fixture — verified by the I-036 baseline diff.
