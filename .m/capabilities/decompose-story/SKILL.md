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

   For structural ADD stories the capability is callable in two
   phases: **Phase A** (sub-task authoring) before `scaffold-repo`,
   **Phase B** (project.yaml mutation + topology regeneration) after.
   See "Phase boundary" below. Business stories run both phases
   back-to-back as a single call; Phase B is a no-op when the story
   has no structural verbs.
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
| `phase` | `a` \| `b` | No | Run only Phase A (sub-task authoring) or Phase B (structural mutations). Omit to run both back-to-back. Used for structural ADD orchestration — see "Phase boundary" below. |

## Execution

### Step 1 — Read the story

Read the story file. Extract:
- Story ID and title
- Component list (from the Project section)
- Acceptance criteria (plain prose)
- Any structural verbs in the title/summary that indicate the story
  is structural (add, remove, rename, merge, split, port change,
  type change)

This step reads story prose ONLY — PAT yaml does not exist yet at
this point in the lifecycle.

### Step 2 — Propose AC → component mapping

**REMOVE pre-flight (structural REMOVE stories only).** If the story
prose implies removal of a component (verbs like "remove", "delete",
"drop", "decommission"), run a caller pre-flight check **before**
proposing the AC mapping. The pre-flight enforces M's verifiability
invariant: a structural change must be verifiable as structural in
isolation. Removing a component that is actively called by another
component would conflate "topology shrank" with "callers handled the
removal correctly" — a green gate would prove neither independently.

Pre-flight scans for active references to the to-be-removed
component:

- The current `pats/*.pat.yaml` and `pats/*.cy.js` on the root repo
  for the component's name or any of its declared ports.
- Each managed repo's `pats/*.pat.yaml` (cheap — repos are typically
  cloned for any non-trivial story work).
- `project.yaml` `components[].location` references (none expected
  in normal practice — locations are independent).

If any caller is found, decompose-story **refuses to proceed** and
prints a guidance message naming the callers and the prep-story
required:

> Cannot decompose REMOVE story `<story-id>`: component `<name>` is
> still actively called by `<caller(s)>`. Ship a prep story first
> that either (a) adds a replacement the callers can use OR (b)
> removes the active use. Then re-run decompose-story for this
> REMOVE.

This is a hard reject, not a warning. The methodology's verifiability
guarantee depends on it.

The pre-flight excludes the REMOVE story's own prior gate spec from
the scan (e.g. when removing the metrics component shipped by
TODOM-S02, references in `pats/TODOM-S02.cy.js` are expected — that
historical CAT is handled by `compile-story-pats`'s historical-CAT
delete; see its SKILL).

**RENAME pre-flight (structural RENAME stories only).** If the story
prose implies renaming a component (verbs like "rename", "rebadge",
"call it"), run the same shape of caller pre-flight as REMOVE — the
verifiability invariant applies identically: a name change that
leaves real callers referencing the old name is a behaviour change
in the callers, not a pure topology rebadge.

Pre-flight scans for active references to the to-be-renamed
component's old identifier (`<old-name>:<port>` or the bare
`<old-name>` token where unambiguous):

- **Each managed repo's source files** matching
  `*.{js,jsx,ts,tsx,mjs,cjs}` outside `node_modules/` and `dist/`
  — these are real callers; if any match, **hard reject** with the
  same prep-story discipline as REMOVE.
- **Each managed repo's `pats/*.pat.yaml`** for the old identifier —
  managed-repo PAT yamls feed `scaffold-repo` /
  `generate-acceptance-tests`, and stale references would compile
  to broken CATs at the next regeneration. **Hard reject.**
- **The root repo's `pats/*.pat.yaml`** for the old identifier —
  these are audit-trail artefacts, frozen at the time each story
  shipped. Print an **informational warning** that lists the matches
  and notes that the corresponding `pats/*.cy.js` files will be
  rewritten to use the new identifier in the gate MR (creating
  documented divergence between source PAT yaml and compiled CAT
  on main). **Not a reject** — the rewrite path is the canonical
  RENAME audit trail.
- **The root repo's `pats/*.cy.js`** — these are NOT scanned for
  reject purposes; they are handled in `compile-story-pats`'s
  historical-CAT rewrite step (see its SKILL). They are listed in
  the pre-flight output for transparency.

Hard-reject guidance message names the callers and recommends a
prep-story split:

> Cannot decompose RENAME story `<story-id>`: component `<old-name>`
> is still actively referenced by `<caller(s)>`. Ship a prep story
> first that updates the callers to indirect via a config field (or
> remove the active use). Then re-run decompose-story for this
> RENAME.

For pure RENAME stories that pass pre-flight, the component list is
empty (same as REMOVE) — the change is entirely in `project.yaml` +
renderer regeneration. The readiness tracker has `components: []`
and the per-AC gate proof is carried by the story-level PAT (two
ACs: `<new-name>` reachable + `<old-name>` unreachable) plus the
regenerated topology probes.

**TYPE-CHANGE needs no caller pre-flight.** Flipping a component
between `embedded` and `referenced` preserves its `name`, `port`, and
`role` — every caller keeps working unchanged, because callers
address a component by name and port, never by topology type. There
is therefore no verifiability hazard to reject for: TYPE-CHANGE is
the one structural verb that conflates nothing. The only check is a
sanity one — confirm the component currently has the `type` the
story flips *away from* (reject a no-op TYPE-CHANGE), and for the
`embedded → referenced` direction confirm the target managed repo
exists (precondition below). For pure TYPE-CHANGE stories the
component list is empty (same as REMOVE/RENAME); the per-AC gate
proof is carried by the story-level PAT — a single reachability AC
that passes byte-identically before and after, since only the
build/clone topology moved.

Reason about which acceptance criteria each component is responsible
for, then present the proposed mapping to the user. Mapping is
derived from the story's AC prose and the component list — not from
any PAT yaml.

For pure REMOVE stories, **the component list is empty** — the
change is entirely in `project.yaml` + the renderer regenerating
topology files; no managed-repo work is required. Present this
explicitly to the user (e.g. "TODOM-S03: pure REMOVE — zero
sub-tasks; topology shrinks by one component"). The readiness
tracker for a pure REMOVE has `components: []`, which is valid; the
merge-transaction's completeness gate is vacuously satisfied (zero
sub-tasks to wait on) and the per-AC gate proof is carried by the
story-level PAT (one AC using `expect-unreachable`) plus the
regenerated topology aliveness probes.

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

**No root sub-task.** Sub-tasks represent developer work in a
managed repo. The root repo's per-story contribution — the compiled
story CAT, the readiness tracker, and (for structural stories) the
mutated `project.yaml` + regenerated topology artefacts — is fully
automated by `compile-story-pats` and (for structural) Phase B of
this capability. There is no "root sub-task" because there is no
manual root work for the typical story.

If a story is purely root-scoped (e.g. adding a stack-startup smoke
test that lives only in root), it gets a single sub-task whose
component is `root` — but that's the same as any other single-component
story, not a special "root sub-task" pattern. The previous "mandatory
root sub-task" rule (pre-I-036) was carrying responsibilities that
moved to `compile-story-pats` in v0.6.0; the rule was retired in
v0.12.0 to match the post-I-036 methodology and the actual
practice (`stories/TODOM-000.yaml` and the I-036 after-business
fixture both already operate without a root sub-task).

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
live in the compiled CAT written by `compile-story-pats` (HTTP-layer
assertions are absorbed by the cypress provider via v0.11.0's
`http`/`expect-status`/`expect-body-contains` step types).

Present the proposed mapping to the user:

```
Proposed AC mapping for <story-id>:

  <component-name> (sub-task: <story-id>a)
    - <AC summary>
    - <AC summary>

  <component-name> (sub-task: <story-id>b)
    - <AC summary>

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

## Phase boundary

decompose-story has two conceptual phases. They run back-to-back for
business stories (single call, no `phase` argument). For structural
ADD stories they MUST run separately so that the new component's
GitLab repo can be scaffolded between them.

### Phase A — sub-task authoring (Steps 1–3)

Reads story prose, proposes AC→component mapping (waits for
confirmation), generates the enriched story, sub-task markdown
files, and the readiness tracker. Produces no SCM calls and no
`project.yaml` mutations. Output is identical for business and
structural stories.

Invoked as `decompose-story --phase=a`, or implicitly first in an
unphased call.

### Phase B — structural mutations (S-1, S-2)

Mutates `project.yaml` based on the structural verbs in the story
prose, then invokes `render-topology-artefacts` to regenerate
`docker-compose.yml`, `scripts/integration-test.sh`,
`.gitlab-ci.yml`, and `scripts/report-shadow-status.sh`. All output
staged locally in the root-repo working directory.

For business stories Phase B is a no-op — there are no structural
verbs to act on. The unphased call still runs it (cheap; ends
immediately).

Invoked as `decompose-story --phase=b`. Phase B requires Phase A
artefacts already exist (the enriched story drives the structural
verbs).

## Structural stories — additional handling

Most stories are **business stories**: they add or change user-facing
behaviour without modifying the project's topology. For these, Steps
1–3 are complete — the readiness tracker is staged, sub-task
markdown files are written to the story source of truth, and control
passes to `generate-pats` (then `compile-story-pats`).

**A story is structural** if its description implies topology changes:
adding a new component, removing a component, merging two components
into one, splitting one into two, changing a component's port, or
flipping a component between `embedded` and `referenced` topology. The
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
edits are only meaningful if certain platform preconditions hold.
Preconditions apply to **Phase B** (project.yaml mutation + topology
regeneration). Phase A has no SCM-platform preconditions — it only
reads story prose and writes sub-task artefacts.

- **For ADD** (new component): the new component's repo MUST exist
  on the SCM platform before **Phase B** runs. The ADD orchestration
  satisfies this by calling `scaffold-repo` between Phase A and
  Phase B (see "Order of operations" below). `scaffold-repo` creates
  the repo with seed files, including a `/health` endpoint for
  backends or a baseline serving shell for frontends. Without this,
  the regenerated `docker-compose.yml` would reference a build
  context that doesn't exist on disk, and CI would fail at
  `docker compose build`.

- **For RENAME / MERGE / SPLIT**: the target repo(s) must exist
  before Phase B. Same reasoning as ADD; same phase-split
  orchestration applies.

- **For REMOVE**: no precondition. M's view of the project IS
  `project.yaml` — once a component is removed from yaml, M no
  longer cares whether the actual GitLab repo still exists. REMOVE
  uses the unphased call (no scaffold-repo step required).

- **For PORT CHANGE**: no special precondition beyond the component
  already existing. Uses the unphased call.

- **For TYPE CHANGE (`embedded → referenced`)**: the new managed repo
  MUST exist before **Phase B** — same reasoning as ADD. The
  component's code is extracted out of the root repo into that repo
  by the `extract-component` capability, run between Phase A and
  Phase B. Without it the regenerated `docker-compose.yml` would
  reference a sibling build context that doesn't exist on disk.

- **For TYPE CHANGE (`referenced → embedded`)**: no SCM-platform
  precondition for the render, but the component's code MUST be
  physically moved into the root-repo working tree before the gate
  pipeline runs, or `docker compose build` fails on the now-embedded
  build context. The `embed-component` capability performs the
  lift-and-shift and the `unwire-orchestration` (I-061) decommission
  of the now-orphan managed repo. Uses the phased call (the code
  move sits at the phase boundary, like ADD's scaffold step).

**Order of operations for ADD-type structural changes:**

1. `decompose-story --phase=a` → enriched story, sub-task markdown,
   readiness tracker (including the new component's sub-task)
2. `generate-pats` → story-level PAT + sub-task PATs (including the
   new component's sub-task PAT)
3. `scaffold-repo` (for the new component) → uses the new sub-task
   markdown + sub-task PAT to seed the new GitLab repo (with
   `/health` endpoint for backends)
4. `decompose-story --phase=b` → mutate `project.yaml`, regenerate
   topology artefacts (now safe — the new repo's build context
   exists)
5. `compile-story-pats` → bundles compiled CAT + readiness tracker +
   structural artefacts into the root-repo integration-gate MR

Inverting order produces a story whose CI cannot go green: compose
can't build a service whose build context doesn't exist on disk.
**Always scaffold between phases.**

For business stories the orchestration collapses to:
`decompose-story → generate-pats → compile-story-pats` (no phase
arguments; Phase B no-ops at the end of the unphased call).

**Order of operations for REMOVE-type structural changes** (v0.12.x):

1. `decompose-story` (unphased) → caller pre-flight (Step 2 — hard
   reject if active callers exist), readiness tracker with empty
   `components: []`, mutated `project.yaml` (entry deleted, health
   endpoint removed), regenerated topology artefacts (one fewer
   service everywhere).
2. `generate-pats` → one-AC story PAT using `expect-unreachable`
   against the previously-existing endpoint. No sub-task PATs (no
   sub-tasks exist).
3. `compile-story-pats` → compiles the PAT (the cypress provider
   absorbs `expect-unreachable` via the fused fetch+catch block),
   bundles the compiled CAT + readiness tracker + structural
   artefacts + **deletions of historical compiled CATs that probe
   the removed component** into the root-repo integration-gate MR.

REMOVE has no `scaffold-repo` step (no new repo to seed) and uses
the unphased call (no inter-phase precondition to satisfy).

**Order of operations for TYPE-CHANGE structural changes** (v1.0.0):

TYPE-CHANGE moves a component's *realization* between repos without
touching the topology graph. Code physically moves, so — like ADD —
the phases must split around the move.

`embedded → referenced` (extract):

1. `decompose-story --phase=a` → enriched story, readiness tracker
   with empty `components: []` (pure TYPE-CHANGE has no sub-tasks).
2. `generate-pats` → one-AC story PAT: the component reachable on
   its unchanged port. No sub-task PATs.
3. `extract-component` (for the component) → creates the managed
   repo, lifts the component's code out of the root repo into it,
   seeds the deterministic CI/steering layer, protects `main`, mints
   the merge-transaction token, and runs `wire-orchestration`.
4. `decompose-story --phase=b` → flip `type`/`location` in
   `project.yaml`, regenerate topology artefacts (now safe — the
   referenced build context exists), and stage the root-repo
   deletion of the extracted code.
5. `compile-story-pats` → bundles compiled CAT + readiness tracker +
   structural artefacts (incl. the root-repo code deletion) into the
   integration-gate MR.

`referenced → embedded` (fold-in):

1. `decompose-story --phase=a` → enriched story, readiness tracker
   with empty `components: []`.
2. `generate-pats` → one-AC story PAT (component reachable on its
   unchanged port).
3. `embed-component` (for the component) → lifts the managed repo's
   code into the root-repo working tree, then runs
   `unwire-orchestration` (I-061) to decommission the now-orphan
   managed repo (delete webhook, CI variables; repo deletion is a
   user decision, as with REMOVE).
4. `decompose-story --phase=b` → flip `type`/`location` in
   `project.yaml` (drop the `tag` field), regenerate topology
   artefacts (now safe — the embedded build context exists on disk).
5. `compile-story-pats` → bundles compiled CAT + readiness tracker +
   structural artefacts into the integration-gate MR.

TYPE-CHANGE never invokes the historical-CAT scan: the component
keeps its name and port, so no compiled CAT on the root repo needs
deleting (REMOVE) or rewriting (RENAME).

### S-1 — Author the new project.yaml (stage locally)

Transform the story's structural description into the new topology
manifest and write it to the root-repo working directory
(`<root-repo-dir>/project.yaml`). The transformation is mechanical:

| Story prose | project.yaml change |
|---|---|
| "add a new backend component `<name>`" | Append a `components:` entry with `type: referenced`, `role: backend`, next free port (lowest unused ≥ 3002); append `http://localhost:<port>/health` to `compose.integration.health.endpoints` |
| "remove component `<name>`" | Delete that `components:` entry; remove the matching `http://localhost:<port>/...` entry from `compose.integration.health.endpoints`. Note: M does NOT delete the GitLab managed repo — that's a user decision — but the orphan repo's orchestration wiring (webhook + per-repo CI variables) is tidied by the `unwire-orchestration` capability (I-061). The regenerated `detect-story-trigger.sh` also includes a source-repo guard so any webhook left in place fires harmlessly as standalone |
| "merge `<a>` and `<b>` into `<c>`" | Delete `<a>` and `<b>`; append `<c>` with the lowest-numbered port of the two |
| "rename `<a>` to `<b>`" | Update `name` and derived `location` on that entry |
| "change port of `<a>` to N` | Update the `port` field |
| "change `<name>` from embedded to referenced" (extract) | Flip `components[].type` from `embedded` to `referenced`; rewrite `location` from the root-relative path (`./packages/<name>`) to the managed repo's full SCM path (`<group>/<root-repo>/<repo-name>`). `name`, `port`, `role` unchanged. The new managed repo must already exist — see Preconditions. |
| "change `<name>` from referenced to embedded" (fold-in) | Flip `components[].type` from `referenced` to `embedded`; rewrite `location` to the root-relative path (`./packages/<name>`); drop the `tag` field (embedded components are not snapshot-pinned). `name`, `port`, `role` unchanged. |

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

- Sub-task IDs use alphabetic suffix: a, b, c, d (up to 26 components).
  One sub-task per managed component touched by the story. No root
  sub-task — see "No root sub-task" in Step 2.
- No PAT stubs are authored here. Sub-task PATs are yaml contracts
  produced by `generate-pats` and live at
  `<managed-repo>/pats/<sub-task-id>.pat.yaml`. See I-038 + I-042.
- The enriched story in the story source of truth is the reference
  for subsequent capabilities. It is NOT committed to any SCM repo.
- The readiness tracker is staged in the root-repo working
  directory and committed to the root repo by `compile-story-pats`
  under `stories/`. Without it, there is no completeness gate for
  the merge transaction.
- Run `scaffold-repo` against each *new-component* sub-task file
  (ADD only). Existing-component sub-tasks do not re-scaffold.
- Shadow integration's structural gate depends on the compiled CAT
  existing at `pats/<story-id>.<ext>` in the root repo, not on a
  root sub-task entry. The CAT is produced by `compile-story-pats`
  from the story-level PAT yaml.
- Two failure modes in shadow integration:
  - **Structural failure:** story has open MRs but no story-level CAT
    exists at `pats/<story-id>.<ext>` in the root repo (typically
    means `compile-story-pats` was skipped or its MR has not landed)
  - **Logical failure:** CAT exists but fails because not all
    components have implemented their part yet
