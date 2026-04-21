# generate-pats

**Capability:** Produce the story-level PAT yaml and one sub-task PAT
yaml per sub-task, with the parent story in scope.

## What it does

Reads the enriched story (emitted by `decompose-story`) and every
sub-task markdown file for the story, then produces:

- `<story-id>.pat.yaml` — the parent contract (story-level PAT)
- One `<sub-task-id>.pat.yaml` per sub-task — a repo-scoped
  projection of the story PAT, anchored back to the parent via
  `parent-story:` and per-AC `replaces:` / `removes:` fields when
  applicable

Story-level PATs are topology-agnostic. They describe user outcomes,
not component behaviour. No technical implementation details, no
component names. Sub-task PATs are repo-scoped — each asserts only
what can be verified in isolation for its component. Cross-component
integration ACs live in the story PAT only.

Both levels share the same schema ([`pat.schema.json`](../../schemas/pat.schema.json))
and differ only in the `story:` vs `sub-task:` + `parent-story:` +
`component:` branch of the `oneOf`.

## Lifecycle position

As of v0.6.0, `generate-pats` runs AFTER `decompose-story`. The
lifecycle is:

1. [`decompose-story`](../decompose-story/SKILL.md) — maps ACs to
   components, writes sub-task markdown + readiness tracker.
2. **`generate-pats`** — reads the enriched story + sub-task
   markdown files, produces all PAT yaml.
3. [`compile-story-pats`](../compile-story-pats/SKILL.md) — compiles
   the story PAT through the active `test.cat.*` provider and
   raises the integration-gate MR.

## Why the parent story must stay in scope during sub-task PAT generation

Sub-task PATs are not independent contracts — they are projections
of the story PAT onto specific components. The parent story is
their conceptual anchor and MUST stay visible during sub-task PAT
generation:

- **Coherence.** Two sub-task PATs in the same story must use
  consistent terminology, test data, and assumptions. Generated in
  isolation they drift apart — same concept named differently in
  different repos. Parent-aware generation keeps them aligned.
- **Traceability.** `parent-story:` and per-AC `derives-from:` /
  `replaces:` / `removes:` fields make the decomposition
  machine-readable. Regenerating sub-task PATs after the story PAT
  changes is a mechanical operation with that anchoring in place.
- **Single source of truth.** The story PAT is canonical. Sub-task
  PATs are derivations. If they conflict (e.g. the story says "list
  shows count" but the MFE sub-task drops the count assertion), the
  story wins and the sub-task is rejected.
- **Validation symmetry.** Sub-task CATs run in isolation during
  implementation; the story CAT runs against the composed system.
  Both descend from the same anchor, so they should agree — and if
  they don't, the disagreement is information, not noise.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `story-file` | path | Yes | Path to the source story markdown file |
| `enriched-story-file` | path | No | Path to the enriched story produced by decompose-story. Defaults to the workspace path conventionally used by the project's story-source provider. |
| `sub-task-dir` | path | No | Directory containing `<sub-task-id>.md` files (defaults to the workspace path conventionally used by the project's story-source provider) |
| `workspace` | path | No | Output folder for generated PAT yaml files |

## Execution

### Step 1 — Read the story prose + decomposition

Read the source story and the enriched story emitted by
`decompose-story`. Extract:
- Story ID
- Story-level acceptance criteria (from the story's AC section)
- AC → component mapping (from the enriched story's
  `## Component AC Mapping` section)
- Sub-task list (from the enriched story's `## Sub-Tasks` section)

Read every sub-task markdown file listed. Each file carries:
- Sub-task ID and component
- That sub-task's slice of the ACs
- Any supersession notes (`[replaces <old-story-id>/<old-sub-task-id> AC-N]`)

### Step 2 — Generate the story-level PAT

Transform each story-level acceptance criterion into a PAT entry
matching the story-level branch of `pat.schema.json`:

```yaml
story: <story-id>
version: 1

acceptance:
  - id: AC-001
    when: <user action or state>
    then: <expected outcome>
    steps:
      - navigate: <path>
      - assert: "[data-testid='<id>'] is visible"
      ...
```

Rules for generation:

- `when`/`then` are plain English, topology-agnostic.
- `steps` are ordered and deterministic, suitable for direct
  compilation by the active `test.cat.*` provider.
- All interactive elements use `data-testid` attributes for stable
  selectors.
- Each AC gets a unique `id` within the story (`AC-001`, `AC-002`, …).
- No component names, no API paths, no technical details in
  `when`/`then`.
- `steps` may reference technical details (URLs, selectors) as these
  are the concrete validation mechanism.

### Step 2a — Yaml authoring rules for step values

**Step values that contain `[`, `'`, or spaces MUST be written as
double-quoted yaml scalars.** Inner string literals (for `type` /
`contains`) use single quotes and MUST NOT contain a single quote.

```yaml
# Correct
- type: "[data-testid='todo-input'] value 'Buy milk'"
- click: "[data-testid='todo-add-button']"
- wait: "[data-testid='todo-list'] is visible"
- assert: "[data-testid='todo-list'] contains 'Buy milk'"
- assert: "[data-testid='todo-input'] contains ''"

# Wrong — not valid yaml, parse errors on the first "
- assert: "[data-testid='todo-list']" contains "Buy milk"
```

This rule is enforced by `pat.schema.json` regex patterns. Any value
that breaks the rule will fail schema validation and will not compile.

### Step 2b — Detect PAT conflicts with existing stories

Before finalising the story PAT, scan existing PAT files in the
workspace (or root repo `pats/` folder) for conflicts with the new
story's ACs.

A conflict exists when:
- A new AC changes behaviour that an existing AC asserts.
- A new AC removes a feature that an existing AC validates.
- A new AC changes UI structure that existing ACs depend on (different
  `data-testid` attributes, different page layout).

For each conflict, add a `replaces` or `removes` field to the new
AC — format `<story-id>/AC-<id>`:

```yaml
  - id: AC-001
    when: user opens the app
    then: todo list is displayed with item count
    replaces: TODOM-000/AC-001    # was: MFE renders Hello component
    steps:
      ...
```

- `replaces: <story-id>/AC-<id>` — the new AC supersedes the old
  one. The old AC's compiled test should be updated or replaced.
- `removes: <story-id>/AC-<id>` — the old AC is no longer valid
  and its compiled test should be deleted.

**This step is critical for test suite integrity.** Without it, old
compiled tests will fail when new stories change behaviour, causing
CI failures that look like bugs but are actually stale tests.

### Step 3 — Generate sub-task PATs (parent in scope)

For each sub-task, produce `<sub-task-id>.pat.yaml` matching the
sub-task branch of `pat.schema.json`:

```yaml
sub-task: <sub-task-id>
parent-story: <story-id>
component: <component-name>
version: 1

acceptance:
  - id: AC-001
    when: <scoped to what this component can verify>
    then: <observable outcome at this component's boundary>
    steps:
      - render: <component with mocked dependencies>
      - assert: "[data-testid='<id>'] is visible"
```

Generation rules — **parent story is IN SCOPE throughout this step**:

- **Filter ACs.** Keep only ACs that the mapping assigns to this
  sub-task's component. Cross-component integration ACs (e.g. "shell
  loads MFE, MFE communicates with both APIs") are story-level only
  and MUST be dropped from sub-task PATs.
- **Rewrite preconditions.** System-level preconditions in the story
  PAT (`navigate: /`) become component-scoped equivalents in the
  sub-task PAT (`render: <component> with mocked <dependency>`).
- **Preserve IDs.** Use the same `AC-NNN` ids as the story PAT where
  an AC survives the filter — this makes `derives-from` tracking
  trivial and keeps CAT file diffs narrow across story revisions.
- **Carry supersession.** If a sub-task markdown file marks an AC as
  replacing or removing an earlier AC, emit the corresponding
  `replaces:` / `removes:` field on the sub-task PAT AC.
- **Stay schema-valid.** Every step value must pass the
  `pat.schema.json` regex (Step 2a rules apply).

Sub-task PAT destinations follow the project's layout convention —
typically `<managed-repo>/pats/<sub-task-id>.pat.yaml`. The workshop
setup writes them to the workspace folder where `scaffold-repo`
picks them up.

### Step 4 — Present for review

Show the user:
- The story-level PAT.
- Each sub-task PAT, side by side with the story PAT ACs they derive
  from.
- Any conflicts flagged against existing PAT files.

Wait for confirmation before writing any files. PATs are critical
artefacts — they drive everything downstream.

### Step 5 — Write to workspace / root repo

On confirmation:
- Write `<story-id>.pat.yaml` to the root repo's `pats/` directory
  (or the workspace location the project convention dictates).
- Write each `<sub-task-id>.pat.yaml` to the corresponding managed
  repo's `pats/` directory (or the workspace equivalent).

This capability does no SCM work. `compile-story-pats` handles
branching, commits, and the integration-gate MR for the root repo.
Per-managed-repo PATs land on each managed repo's feature branch via
the usual sub-task implementation flow.

## Notes

- Story-level PATs are topology-agnostic — pure user outcomes.
- Sub-task PATs are the executable contract Kiro (or any
  implementing agent) validates against during sub-task
  implementation. `generate-acceptance-tests` compiles them into
  framework-specific specs using the same `test.cat.*` providers.
- PAT stubs in markdown (pre-v0.6.0) are retired. Sub-task PATs in
  yaml ARE the contract.
- The `replaces` / `removes` fields are used when stories modify
  existing behaviour; they are picked up later by the CAT compiler
  (story level) and by `generate-acceptance-tests` (sub-task level).
- The `version` field is the schema version (always 1 for now), not
  the story version.
- A story PAT with zero ACs is invalid — pure structural ADD stories
  lean on the topology aliveness probe in `scripts/integration-test.sh`
  until I-045 lands HTTP step types. Until then, ADD stories either
  have regression ACs on other components (which populate the PAT) or
  skip PAT compilation entirely (handled by `compile-story-pats`).
