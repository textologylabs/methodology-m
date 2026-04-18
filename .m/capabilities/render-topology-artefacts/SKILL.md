# render-topology-artefacts

**Capability:** Regenerate all topology-derived artefacts from
`project.yaml`, using the project's declared `compose` and `ci`
providers.

## What it does

The single chokepoint for "make the topology-derived files on disk
match `project.yaml`". Reads the manifest, validates it, resolves the
active compose and CI providers, dispatches through their pure-function
render entry points, detects cross-provider output collisions, and
writes the resulting files to the target directory.

This is I-036's orchestrator. It is called at:

- **Bootstrap** — `bootstrap-root-repo` invokes it once during initial
  project seeding (with no `--targets` filter, so both compose and ci
  artefacts are rendered).
- **Structural changes** — `decompose-story` invokes it on any
  structural story, AFTER S-1 has mutated `project.yaml`. Replaces
  the inline rendering that `decompose-story` used to perform itself.

**What this capability does NOT do:**

- Generate per-story files (sub-tasks, PATs, compiled CATs). That is
  `decompose-story`'s job.
- Interpret story prose. `project.yaml` is the input; how it got there
  is not this capability's concern.
- Read, merge, or preserve existing file content. Whatever exists at
  the target paths is overwritten. Topology-derived artefacts are
  never hand-edited.

## Invocation

```
node .m/capabilities/render-topology-artefacts/render.mjs \
  --project-yaml <path> \
  --target-dir <path> \
  [--targets compose,ci] \
  [--dry-run]
```

**Parameters:**

| Flag | Required | Description |
|---|---|---|
| `--project-yaml <path>` | yes | Path to `project.yaml` |
| `--target-dir <path>` | yes | Root-repo directory; rendered paths are relative |
| `--targets <list>` | no | Subset of `compose`, `ci`. Default: both. |
| `--dry-run` | no | Print files that would be written; do not write |

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Schema/validation error in project.yaml |
| 2 | Provider not found |
| 3 | Write error |
| 4 | Output path collision between providers |

**Stdout:** one line per file written (or would-write under `--dry-run`).
**Stderr:** diagnostics and error messages.

**Implementation:** see [`./render.mjs`](./render.mjs). The code is the
source of truth for orchestrator behaviour; this document describes
the contract only.

## Provider resolution rules

**Compose:**

1. If `project.providers.compose` is set, use it.
2. Else if `project.compose.integration.strategy` is set, use the
   provider matching that strategy (`docker-compose` → `compose/docker-compose`).
3. Else error with exit code 1.

**CI:**

1. If `project.providers.ci` is set, use it.
2. Else use the value of `project.providers.scm` (CI and SCM are
   paired by default).
3. Else error with exit code 1.

Unknown provider names exit with code 2.

## Determinism guarantee

Same `project.yaml` → byte-identical output tree, always. This is
enforceable by running the capability twice against the same input
and diffing the output — the diff MUST be empty. The regression
harness at
[`./render.test.mjs`](./render.test.mjs) and the co-located provider
tests enforce this mechanically.

## Callers

- [`bootstrap-root-repo`](../bootstrap-root-repo/SKILL.md) Step 6 —
  initial seed with no `--targets` filter.
- [`decompose-story`](../decompose-story/SKILL.md) S-2 — structural
  story regeneration with no `--targets` filter.
- Future `m rebuild-topology` CLI escape hatch — out of scope for
  v0.5.1.

## Provider interface dependencies

- [`.m/providers/provider-interface.md`](../../providers/provider-interface.md)
  — namespace declarations for `compose.*` and `ci.*`.
- `.m/providers/compose/<provider>.{md,mjs}` — one of the compose
  provider implementations. Ships with `compose/docker-compose` and
  `compose/log-only`.
- `.m/providers/ci/<provider>.{md,mjs}` — one of the CI provider
  implementations. Ships with `ci/gitlab` and `ci/log-only`.
- `.m/schemas/project.schema.json` — canonical project.yaml shape.
  The orchestrator enforces its key constraints at runtime.
- `.m/vendor/js-yaml.mjs` — vendored YAML parser (see
  `.m/vendor/README.md`).
