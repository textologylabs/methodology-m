# decompose-story

**Capability:** Decompose a story into component-scoped sub-tasks

## What it does

Reads a story file, proposes a mapping of story acceptance criteria
to components, waits for confirmation, then generates:

- An enriched story file in the workspace with the mapping and sub-task refs
- One sub-task markdown file per component in the workspace
- A readiness tracker committed to the root repo at `stories/<story-id>.yaml`
- For **structural stories only**: a mutated `project.yaml` + regenerated
  topology artefacts staged in the root-repo working directory

The source story file is never modified. This capability produces no
PATs and does no SCM MR work — that lives in `generate-pats` (next
in the lifecycle) and `compile-story-pats` (after that).

## Lifecycle order

As of v0.6.0, the story lifecycle is:

1. **`decompose-story`** — reads the story prose alone. Identifies
   components touched and AC→component mapping from the story text
   (not from a pre-existing PAT yaml). Produces sub-task markdown
   files, the readiness tracker, and — for structural stories —
   the new `project.yaml` + regenerated topology artefacts staged
   locally.
2. [`generate-pats`](../generate-pats/SKILL.md) — reads the enriched
   story + all sub-task markdown files. Produces
   `<story-id>.pat.yaml` and one `<sub-task-id>.pat.yaml` per
   sub-task (parent story in scope).
3. [`compile-story-pats`](../compile-story-pats/SKILL.md) — compiles
   the story-level PAT through the active `test.cat.*` provider,
   bundles the compiled CAT with the readiness tracker and any
   staged structural artefacts, and raises the root-repo
   integration-gate MR.

This is the reshuffle that closed I-042. Pre-v0.6.0, `decompose-story`
ran AFTER `generate-pats` and also did the CAT compilation and MR
raise. That ordering made sub-task PAT authoring impossible (no
parent in scope) and tangled three responsibilities — structural
mapping, contract authoring, and gate establishment — in one place.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `story-file` | path | Yes | Path to the source story markdown file |
| `workspace` | path | No | Output folder for generated artefacts |
| `root-repo-dir` | path | No | Root-repo working directory for structural-story staging (defaults to `workspace/..`) |

## Execution

### Step 1 — Read the story

Read the story file. Extract:
- Story ID and title
- Component list (from the Project section)
- Acceptance criteria (plain prose)
- Any structural verbs in the title/summary that indicate the story
  is structural (add, remove, rename, merge, split, port change)

This step reads story prose ONLY — PAT yaml does not exist yet at
this point in the lifecycle.

### Step 2 — Propose AC → component mapping

Reason about which acceptance criteria each component is responsible
for, then present the proposed mapping to the user. Mapping is
derived from the story's AC prose and the component list — not from
any PAT yaml.

**AC supersession:** If the story text indicates that an existing AC
from a previous story is being changed or removed, flag it in the
mapping so the downstream `generate-pats` run can record a `replaces`
or `removes` field on the appropriate PAT entry:

```
  <component-name> (sub-task: <story-id>a)
    - <AC summary>
    - <AC summary> [replaces TODOM-000/AC-001]
```

The sub-task file for that component must include the supersession
note so `generate-pats` picks it up when producing sub-task PATs,
and so the CAT compilation step knows which existing tests to update
or remove.

**Mandatory root repo sub-task:** Every story MUST include a sub-task
for the root repo, regardless of whether the shell code changes. The
root repo owns story-level integration tests — the gate that
validates the composed system satisfies the story's acceptance
criteria. Without this sub-task, shadow integration has no tests to
run and will fail structurally.

The root repo sub-task always includes:
- Story-level integration tests: a compiled CAT at
  `pats/<story-id>.<spec-extension>` produced later by
  `compile-story-pats`. Extension depends on the active `test.cat`
  provider (e.g. `.cy.js` for cypress).
- Any compose config changes needed for the story go through
  `project.yaml` and the topology renderer — never hand-edited into
  `docker-compose.yml`.
- Readiness tracker updates.

**Note on integration-test scripts.** M has exactly ONE integration
test script at `scripts/integration-test.sh` — it is topology-wide,
emitted by the compose provider (`render-topology-artefacts`), and
contains ONLY aliveness probes against the running system. It does
NOT contain a story integrity gate; that concern lives in
`wire-orchestration` and operates against the SCM API, not the
filesystem. Per-story shell scripts under
`scripts/integration-tests/<story-id>.sh` do NOT exist in the current
design; any historical references to that path are legacy from
before CAT compilation and should be scrubbed. Per-story assertions
live in the compiled CAT written by `compile-story-pats` (or, for
HTTP-layer assertions, in future HTTP CATs via I-045).

Even when the shell component has no feature changes, the root repo
sub-task exists because the integration tests are the root repo's
contribution to every story. This is not optional — it is how M
ensures that shadow integration is a real gate, not a permissive
placeholder.

Present the proposed mapping to the user:

```
Proposed AC mapping for <story-id>:

  <component-name> (sub-task: <story-id>a)
    - <AC summary>
    - <AC summary>

  <component-name> (sub-task: <story-id>b)
    - <AC summary>

  root (sub-task: <story-id><last-suffix>) [MANDATORY]
    - Story-level integration tests (compiled later by compile-story-pats)
    - Compose config changes (if any)
    - End-to-end validation of all story ACs

  ...

Confirm, or tell me what to change.
```

Wait for explicit confirmation before writing any files.

### Step 3 — Generate story artefacts

On confirmation, produce the following artefacts. Each has a specific
destination, and the rule is rigid:

- **Story-level artefacts committed to the root repo:** the readiness
  tracker at `stories/<story-id>.yaml`. Nothing else from this step
  is committed to any SCM repo by this capability.

- **Sub-task markdown files and the enriched story** live in the
  **project's story source of truth**, NOT in any SCM repo. The story
  source of truth is:
  - A real Jira instance for production projects, accessed through the
    appropriate provider (Jira MCP, REST API, etc.).
  - A project-local markdown directory for projects using file-based
    story tracking. The directory name and layout are a project-level
    convention and are NOT prescribed by M.

  This is the rule, without exception: **sub-task and enriched-story
  markdown files MUST NOT be committed to the root repo or any managed
  repo.** See I-002 — the jira/ folder pattern historically bled into
  SCM repos and is explicitly forbidden. An agent executing this
  capability writes sub-task files to the path configured by the
  project's story-source provider, not to any SCM working directory.

**Enriched story: `<story-id>.md`**

Copy of the source story with two additions:
- A `## Component AC Mapping` section showing which ACs each component owns
- A `## Sub-Tasks` section listing the generated sub-task IDs and their repos

Written to the story source of truth.

**Readiness tracker: `<story-id>.readiness.yaml`**

Tracks high-water marks for each component sub-task. All marks start
as null. This is the artefact that monitors story progress through
the Development phase. It gets committed to the root repo under
`stories/<story-id>.yaml` — this IS an SCM-tracked artefact because
it is orchestration state, not story content. This capability stages
it in the root-repo working directory; `compile-story-pats` bundles
it into the integration-gate MR push.

```
story: <story-id>
status: pending

components:
  - name: <component-name>
    subtask: <story-id><suffix>
    high-water-mark: null
  ...

story-pats:
  - pats/<story-id>.pat.yaml
```

**Sub-task files: `<story-id>a.md`, `<story-id>b.md`, etc.**

One file per component. Written to the story source of truth (Jira or
the project-local markdown directory). Each contains:
- Sub-task ID, title, component name, repo name
- Status and parent story reference
- The component's slice of the ACs as its acceptance criteria
- Any supersession notes carried over from Step 2

No PAT stubs. The sub-task PAT yaml is authored in the next
lifecycle step by `generate-pats` and lives in the managed repo's
`pats/` directory.

## Sub-task file format

```
# <story-id><suffix>: <component-name>

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** <story-id>
**Component:** <component-name>
**Repo:** <repo-name>

## Summary

<Brief description of what this component implements for this story.>

## Acceptance Criteria

1. <AC summary>
   - <detail>
   - <detail>

2. <AC summary> [replaces <old-story-id>/<old-sub-task-id> AC-N]
   - <detail>
   - Supersedes: <old-sub-task-id> AC-N (<brief description of what changed>)

...
```

When an AC supersedes an earlier story's AC, include the
`[replaces <old-story-id>/<old-sub-task-id> AC-N]` tag inline in the
criteria line so `generate-pats` carries it into the sub-task PAT's
`replaces:` field. `generate-acceptance-tests` later uses that field
to update or delete the old compiled test.

## Root repo sub-task format

The root repo sub-task has a distinct structure because its primary
deliverable is integration tests, not feature code:

```
# <story-id><suffix>: root — Story-level integration

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** <story-id>
**Component:** root
**Repo:** <root-repo-name>

## Summary

Story-level integration validation for <story-id>. Provides the
integration tests that gate shadow integration — no managed repo MR
can merge until these tests pass against the composed system.

## Deliverables

1. Compiled story CAT at `pats/<story-id>.<ext>`
   - Compiled by compile-story-pats through the project's active
     test.cat provider — the spec is not hand-authored.
   - Full acceptance assertions against the composed system.
   - Committed to the root repo MR raised by compile-story-pats.

2. Compose config changes (if needed)
   - Shared volumes, new services, environment variables, ports
   - Authored as edits to `project.yaml`; `docker-compose.yml` and
     `scripts/integration-test.sh` are regenerated by
     `render-topology-artefacts`. Do NOT hand-edit either of those
     generated files.

## Integration Test Contract

The topology-wide `scripts/integration-test.sh` is owned by the
compose provider and regenerated from `project.yaml`. It must:
- Exit 0 if all topology aliveness probes pass
- Exit non-zero if any check fails
- Output clear descriptions of what passed and what failed
- Be runnable from CI (POSIX `sh`, no bash-isms, no browser)

Per-story assertions are the compiled CAT at
`pats/<story-id>.<ext>` (extension set by the active test.cat
provider). The legacy path `scripts/integration-tests/<story-id>.sh`
is not used.
```

## Structural stories — additional handling

Most stories are **business stories**: they add or change user-facing
behaviour without modifying the project's topology. For these, Steps
1–3 are complete — the readiness tracker is staged, sub-task
markdown files are written to the story source of truth, and control
passes to `generate-pats` (then `compile-story-pats`).

**A story is structural** if its description implies topology changes:
adding a new component, removing a component, merging two components
into one, splitting one into two, or changing ports/roles. The
distinction is in the agent's reading of the story — there is no tag,
no flag, no automatic detection. Most stories are business; a few are
structural.

For structural stories, decompose-story does everything a business
story does **plus** the following. Everything produced here is
**staged locally** in the root-repo working directory. The subsequent
`compile-story-pats` call bundles the staged files into its
integration-gate MR push. No SCM calls are made from this capability.

### Preconditions

The structural section below produces correct file edits, but those
edits are only meaningful if certain platform preconditions hold:

- **For ADD** (new component): the new component's repo MUST already
  exist on the SCM platform before this story is decomposed. Run
  `scaffold-repo` first — it creates the repo with seed files,
  including a `/health` endpoint for backends or a baseline serving
  shell for frontends. Without this, the regenerated
  `docker-compose.yml` will reference a build context that doesn't
  exist on disk, and CI will fail at `docker compose build`.

- **For RENAME / MERGE / SPLIT**: the target repo(s) must exist
  before the structural story. Same reasoning as ADD.

- **For REMOVE**: no precondition. M's view of the project IS
  `project.yaml` — once a component is removed from yaml, M no
  longer cares whether the actual GitLab repo still exists.

- **For PORT CHANGE**: no special precondition beyond the component
  already existing.

**Order of operations for ADD-type structural changes:**

1. Run `scaffold-repo` to create the new component's repo with seed
   files (the seed includes a `/health` endpoint for backends — that
   endpoint is what the topology aliveness probe will hit)
2. Decompose the structural story (this section)
3. Run `generate-pats` and `compile-story-pats` to author PATs and
   raise the integration-gate MR
4. MR merges, topology and reality are now consistent

Inverting steps 1 and 2 produces a story whose CI can never go green:
compose can't build a service whose build context doesn't exist on
disk. **Always scaffold first.**

### S-1 — Author the new project.yaml (stage locally)

Transform the story's structural description into the new topology
manifest and write it to the root-repo working directory
(`<root-repo-dir>/project.yaml`). The transformation is mechanical:

| Story prose | project.yaml change |
|---|---|
| "add a new backend component `<name>`" | Append a `components:` entry with `type: referenced`, `role: backend`, next free port (lowest unused ≥ 3002) |
| "remove component `<name>`" | Delete that `components:` entry |
| "merge `<a>` and `<b>` into `<c>`" | Delete `<a>` and `<b>`; append `<c>` with the lowest-numbered port of the two |
| "rename `<a>` to `<b>`" | Update `name` and derived `location` on that entry |
| "change port of `<a>` to N` | Update the `port` field |

Validate the result against `.m/schemas/project.schema.json` before
proceeding.

### S-2 — Render topology-derived artefacts (stage locally)

Topology-derived files are owned by `render-topology-artefacts` — not
by this capability. After S-1 has mutated `project.yaml`, invoke the
renderer against the new manifest:

    node .m/capabilities/render-topology-artefacts/render.mjs \
      --project-yaml <root-repo-dir>/project.yaml \
      --target-dir <root-repo-dir>

This is a real CLI the agent shells out to — not a SKILL the agent
interprets. The orchestrator is executable code that produces
byte-deterministic output. See
`.m/capabilities/render-topology-artefacts/SKILL.md` for the full
invocation contract and exit codes.

The renderer dispatches to the compose and CI providers declared in
`project.yaml` and writes every topology-derived file to disk:

- `docker-compose.yml` (compose provider)
- `scripts/integration-test.sh` (compose provider)
- `.gitlab-ci.yml` (CI provider)
- `scripts/report-shadow-status.sh` (CI provider)

All four files are overwritten unconditionally. Any hand edits in
these files are drift and are dropped.

**This capability MUST NOT inline-render these files itself.** The
renderer is a pure function of `project.yaml` and is the single source
of topology-artefact generation. Attempting to handcraft any of these
files inside decompose-story re-introduces the drift I-036 exists to
eliminate.

### S-3 — (reserved)

Historically, S-3 contained inline rendering logic for
`scripts/integration-test.sh`. That logic is owned by the compose
provider and invoked via S-2's `render-topology-artefacts` call.
Reserved numbering to keep existing references stable.

### S-4 — (removed in v0.6.0)

Before v0.6.0, S-4 assembled the push bundle and called
`scm.push_or_update_files` + `scm.create_merge_request` to raise the
integration-gate MR. Both responsibilities moved to
`compile-story-pats`. Structural files staged by S-1 and S-2 now
remain in the working directory for `compile-story-pats` to pick
up. This capability makes zero SCM calls.

### Truth-preservation rule

Structural changes must be **truth-preserving**: the regenerated
artefacts are pure topology derivatives, with no semantic changes to
behaviour. A structural story does not fix bugs, add features, or
change test logic in the regenerated files. If a reviewer sees
semantic differences in the generated artefacts beyond what topology
alone implies, the change is not truth-preserving and must be
rejected or split into two stories (structural + business).

If code needs to physically move between repos (e.g. merging two
components into one), that migration is a pure lift-and-shift sub-task
of the same structural story — no logic changes allowed during the
move. File paths change, imports update, nothing else. Bugs discovered
during migration are filed as follow-up business stories, not fixed
in-place.

## Notes

- Sub-task IDs use alphabetic suffix: a, b, c, d (up to 26 components)
- The root repo sub-task is always the LAST suffix (e.g. if 3 managed
  components get a/b/c, root gets d). Convention, not a hard rule.
- No PAT stubs are authored here. Sub-task PATs are yaml contracts
  produced by `generate-pats` and live at
  `<managed-repo>/pats/<sub-task-id>.pat.yaml`. See I-038 + I-042.
- The enriched story in the story source of truth is the reference
  for subsequent capabilities. It is NOT committed to any SCM repo.
- The readiness tracker is staged in the root-repo working
  directory and committed to the root repo by `compile-story-pats`
  under `stories/`. Without it, there is no completeness gate for
  the merge transaction.
- Run `scaffold-repo` against each sub-task file to create each
  managed repo.
- The root repo sub-task is MANDATORY for every story. Shadow
  integration will fail structurally (not logically) if no
  story-level CAT exists for an in-flight story. This is by design —
  it forces the team to define "done" before implementation begins.
- Two failure modes in shadow integration:
  - **Structural failure:** story has open MRs but no story-level CAT
    exists at `pats/<story-id>.<ext>` in the root repo
  - **Logical failure:** CAT exists but fails because not all
    components have implemented their part yet
