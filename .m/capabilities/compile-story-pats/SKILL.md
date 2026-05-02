# compile-story-pats

**Capability:** Compile a story-level PAT yaml into an executable
acceptance-test spec (CAT) and raise the root-repo integration MR.

## What it does

The single chokepoint for "turn a story-level PAT into the CAT that
gates shadow integration for this story, and raise the root MR that
carries it." Reads the story PAT, resolves the active `test.cat.*`
provider, dispatches through its pure-function compile entry point,
writes the spec file to the root repo working directory, then pushes
the spec (bundled with any structural artefacts staged earlier by
`decompose-story`) to the root repo on a story branch, and opens the
integration-gate MR.

This is the home of what used to live as Step 4 of `decompose-story`
pre-v0.6.0. Splitting it out lets CAT compilation be
**provider-based**: a project chooses its compilation strategy via
`project.yaml` just as it chooses its SCM, compose, and CI providers.

**What this capability does NOT do:**

- Generate the PAT yaml. That is `generate-pats`'s job.
- Compile sub-task PATs. Those compile to repo-level CATs via
  `generate-acceptance-tests`, which uses the same `test.cat.*`
  providers but with a different entry point.
- Decide which framework to use. The project's `providers.test.cat`
  setting does. This capability only orchestrates the dispatch.

## When it runs

After `decompose-story` has produced the sub-task markdown files and
any structural topology artefacts, AND after `generate-pats` has
produced the story-level PAT + sub-task PATs. The lifecycle is:

1. `decompose-story` — structural mapping; no PATs; stages any
   structural topology files in the working directory.
2. `generate-pats` — produces `<story-id>.pat.yaml` and one
   `<sub-task-id>.pat.yaml` per sub-task, parent story in scope.
3. **`compile-story-pats`** — this capability. Reads the story PAT,
   compiles to CAT, pushes + MRs on the root repo.

`generate-acceptance-tests` runs later, per managed repo, to compile
the sub-task PATs into repo-level CATs.

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `story-id` | string | Yes | Story identifier (e.g. `TODOM-001`) |
| `root-repo` | string | Yes | Root-repo slug (e.g. `methodology-m/todo-m-root`) |
| `root-repo-dir` | path | Yes | Local working directory of the root repo |

The PAT path is derived: `<root-repo-dir>/pats/<story-id>.pat.yaml`.
The project manifest path is derived: `<root-repo-dir>/project.yaml`.

## Execution

### Step 1 — Compile the story PAT

Invoke the orchestrator:

```
node .m/capabilities/compile-story-pats/compile.mjs \
  --pat <root-repo-dir>/pats/<story-id>.pat.yaml \
  --project-yaml <root-repo-dir>/project.yaml \
  --target-dir <root-repo-dir>
```

The orchestrator:

1. Parses the PAT and validates it is a **story-level** PAT (has
   `story:`, rejects sub-task PATs — those compile elsewhere).
2. Parses `project.yaml` and resolves `providers.test.cat` to a
   provider name (`cypress`, `log-only`, ...).
3. Dynamic-imports the provider module from
   `.m/providers/test/cat/<provider>.mjs`.
4. Calls `provider.compile_story_pat(pat)` → `{ path, content, mode }`.
5. Writes the returned file under `--target-dir`.
6. Prints the written path on stdout (one line).

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Schema/validation error (missing field, malformed PAT, unknown CLI flag) |
| 2 | Provider not found (missing module or not in the allow-list) |
| 3 | Write error |

**Invocation contract:** this is a real CLI the agent shells out to
— not a SKILL the agent interprets. The orchestrator is executable
code that produces byte-deterministic output for the compile step.

### Step 2 — Assemble the push bundle

The push bundle carries whatever needs to be on the integration-gate
MR for this story:

- **Always:** the compiled spec file written in Step 1
  (e.g. `pats/<story-id>.cy.js` for the Cypress provider).
- **Always:** the readiness tracker at
  `stories/<story-id>.yaml` that `decompose-story` staged in the
  root repo working directory.
- **Structural stories only:** the regenerated topology artefacts
  that `decompose-story` staged via `render-topology-artefacts`
  (`project.yaml`, `docker-compose.yml`, `.gitlab-ci.yml`,
  `scripts/integration-test.sh`, `scripts/report-shadow-status.sh`,
  `scripts/detect-story-trigger.sh`).
- **Structural REMOVE stories only:** deletions of historical
  compiled CATs that probe the removed component (see "Historical
  CAT cleanup for REMOVE" below).

The agent reads each file's content from the working directory and
builds the `files[]` array for `scm.push_or_update_files`. For
deletions, the SCM provider's `delete_file` action is used (or, for
the GitLab interim N-call implementation, a per-file delete API
call alongside the create/update calls).

#### Historical CAT cleanup for REMOVE

When the story is a structural REMOVE, the gate MR bundle includes
**deletion** of historical compiled `.cy.js` files that probe the
removed component. Identified by a static `grep` over `pats/*.cy.js`
on root for references to the removed component's name OR any of
its declared ports (read from the pre-mutation `project.yaml`
captured before Phase B / decompose-story's S-1).

The corresponding PAT yaml (`pats/<story-id>.pat.yaml`) and
readiness tracker (`stories/<story-id>.yaml`) for those historical
stories STAY on main as audit trail — only the compiled `.cy.js`
files are removed. Cypress's default `pats/**/*.cy.js` glob would
otherwise keep running them and they would fail forever against
the smaller topology.

The scan is intentionally simple. False positives (a CAT that
mentions the component name in a comment but doesn't actually probe
it) are acceptable; the worst case is a reviewer adds the CAT back
in a follow-up PR. False negatives (a CAT that probes the component
via an indirect alias) are unlikely in practice because the cypress
provider compiles `http: GET http://<name>:<port>/...` to literal
strings in the `.cy.js` output.

For example: removing the `metrics` component on port 3004 deletes
any `pats/*.cy.js` whose content matches `/\bmetrics\b/` or `:3004`.
That includes `pats/TODOM-S02.cy.js` (the v0.12.0 ADD's gate spec).

### Step 3 — Create branch and push

```
scm.create_branch(
  repo: <root-repo>,
  branch: "feat/<story-id>d-integration-gate",
  ref: "main"
)

scm.push_or_update_files(
  repo: <root-repo>,
  branch: "feat/<story-id>d-integration-gate",
  files: <bundle from Step 2>,
  commit_message: "✅ compile story PAT into CAT for <story-id>"
)
```

**Use `scm.push_or_update_files`, NOT `scm.push_files`.** For
structural stories the topology files already exist on the branch
from `bootstrap-root-repo`; `scm.push_files` rejects existing files
and would fail. For pure business stories the call is still valid
— `push_or_update_files` handles both create and update.

For structural stories specifically, the commit message convention
is `"🏗️ <story-id>: structural change — <short description>"` to
distinguish the combined structural + gate push from a plain gate
push on a business story.

### Step 4 — Raise the root MR

```
scm.create_merge_request(
  repo: <root-repo>,
  source_branch: "feat/<story-id>d-integration-gate",
  target_branch: "main",
  title: "<story-id>d: Story-level integration tests"
)
```

The root MR exists from the moment the story is decomposed. Shadow
integration will see it in the completeness check. The compiled CAT
will fail until all components implement their parts — this is
correct behaviour. The gate is red until the story is genuinely
complete.

### Step 5 — Report

Output:

- Compiled spec path (from the orchestrator's stdout)
- Bundle contents (structural files, if any)
- Root MR URL
- Branch name
- `test.cat` provider used

## CAT compilation for structural stories

The provider invoked is whatever matches the assertions the story
PAT contains.

- **Pure structural ADD** (v0.12.0): one-AC story PAT using
  `http: GET http://<new-component>:<port>/health` +
  `expect-status: 200` + `expect-body-contains: "ok"`. Compiles
  through the cypress provider via single-provider absorption
  (v0.11.0). Topology aliveness probes from
  `scripts/integration-test.sh` provide a complementary infra-level
  check.

- **Pure structural REMOVE** (v0.12.x): one-AC story PAT using
  `http: GET http://<removed-component>:<port>/<old-path>` +
  `expect-unreachable: true` against the previously-existing
  endpoint. The cypress provider absorbs the new step verb via the
  fused fetch+catch block (cy.request would throw on network errors
  before chained `.then` runs, so the `http:` + `expect-unreachable`
  pair compiles atomically). Bundle additionally includes deletion
  of historical compiled CATs that probe the removed component
  (see "Historical CAT cleanup for REMOVE" in Step 2).

- **RENAME / MERGE / SPLIT / PORT CHANGE** stories typically have a
  mixed structural + business character, so their story PAT has
  regular browser-level or HTTP ACs that compile cleanly through
  whichever `test.cat.*` provider the project has selected.

- **Provider plumbing.** PAT step types stay framework-agnostic at
  the schema layer; the cypress provider absorbs HTTP step types
  (v0.11.0 — `http`, `expect-status`, `expect-body-contains`) and
  the negative-existence verb (v0.12.x — `expect-unreachable`).
  Standalone backend-only providers (`test.cat.curl` /
  `test.cat.supertest`) remain deferred until a real backend-only
  project demands them.

## Provider interface dependencies

- [`.m/providers/provider-interface.md`](../../providers/provider-interface.md)
  — namespace declaration for `test.cat.*`.
- `.m/providers/test/cat/<provider>.{md,mjs}` — one of the
  `test.cat` provider implementations. Ships with `cypress` and
  `log-only`.
- `.m/schemas/pat.schema.json` — canonical PAT yaml shape.
  Validation is performed by the agent via `generate-pats`; this
  orchestrator enforces the story-level `oneOf` branch at runtime.

## Callers

- [`decompose-story`](../decompose-story/SKILL.md) no longer calls
  this directly — the lifecycle is driven by the agent, which
  invokes decompose-story → generate-pats → compile-story-pats in
  sequence.

## Notes

- The `cypress` provider rejects `render:` steps (sub-task-only).
  Keep `render:` out of story-level PATs.
- Every story PAT now has at least one AC — the v0.11.0 HTTP step
  types and v0.12.x `expect-unreachable` cover ADD and REMOVE
  respectively. The earlier "skip story-PAT compilation for pure
  ADD" workaround retired with v0.12.0.
- For `providers.test.cat: log-only`, the compiled "spec" is a
  `.trace.txt` file with no assertion value. Useful for exercising
  the dispatch path in tests; not useful for real projects.
