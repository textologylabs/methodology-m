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
  `scripts/integration-test.sh`, `scripts/report-shadow-status.sh`).

The agent reads each file's content from the working directory and
builds the `files[]` array for `scm.push_or_update_files`.

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

- **Pure structural ADD** stories have no user-facing assertion.
  In v0.6.0, PAT yaml still uses the Cypress-shaped step grammar,
  so structural verification continues to ride on the topology
  aliveness probe emitted by the compose provider in
  `scripts/integration-test.sh`. For ADD stories, the story PAT
  itself is minimal (often an empty-acceptance document is rejected
  — see Notes); use REMOVE/RENAME/business variants instead, or
  wait for v0.8.0 (I-045) when HTTP step types land and the
  `test.cat.curl` / `test.cat.supertest` providers come online.

- **REMOVE / RENAME / MERGE / SPLIT / PORT CHANGE** stories
  typically have a mixed structural + business character, so their
  story PAT has regular browser-level ACs that compile cleanly
  through whichever `test.cat.*` provider the project has selected.

- **After v0.8.0 (I-045):** the provider choice naturally extends
  to `curl` / `supertest` for HTTP-level step types. This
  capability does not change — only the providers it dispatches
  to.

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
- If the story PAT has zero ACs (pure structural ADD with no
  regression surface), `generate-pats` will flag it — a story PAT
  without ACs is invalid. The correct pattern for pure ADD is to
  lean on the topology aliveness probe and skip story-PAT
  compilation entirely until I-045.
- For `providers.test.cat: log-only`, the compiled "spec" is a
  `.trace.txt` file with no assertion value. Useful for exercising
  the dispatch path in tests; not useful for real projects.
