# embed-component

**Capability:** Fold a referenced component back into the root repo (TYPE-CHANGE, `referenced → embedded`)

## What it does

Takes a component that lives in its own managed repo
(`type: referenced`) and folds it **into the root repo** — its code is
lifted into `packages/<name>/`, and its managed repo is decommissioned
from the orchestration layer. After this capability runs the root repo
working tree carries the component's code, which is the precondition
`decompose-story` Phase B needs before it flips `components[].type` to
`embedded` and re-renders the topology (see `decompose-story/SKILL.md`,
"Order of operations for TYPE-CHANGE").

This is the `referenced → embedded` direction of TYPE-CHANGE — the
inverse of `extract-component`.

embed-component is **SKILL-only**: it composes a code lift-and-shift
out of the managed repo and the `unwire-orchestration` capability. It
introduces no new orchestrator.

## Parameters

| Parameter      | Type   | Required | Description                                                       |
|----------------|--------|----------|-------------------------------------------------------------------|
| component      | string | Yes      | Name of the referenced component to fold in                        |
| project-yaml   | path   | Yes      | Path to the root repo's project.yaml (topology + group/project)    |
| root-repo-dir  | path   | No       | Root-repo working directory (defaults to `project-yaml`'s dir)     |
| story-id       | string | Yes      | The parent TYPE-CHANGE story ID                                    |

## Execution

### Step 1 — Locate and validate the component

Read project.yaml. Find the `components:` entry whose `name` matches
the `component` parameter.

- If no such component exists, **hard reject** — there is nothing to
  fold in.
- If the component's `type` is already `embedded`, **hard reject**
  with `embed-component: <name> is already embedded — nothing to fold
  in`. TYPE-CHANGE rejects no-ops (see `decompose-story/SKILL.md`,
  "TYPE-CHANGE needs no caller pre-flight").

Extract from the entry:

- Component `role`, `port`
- The managed repo's SCM path from `location` (a `referenced`
  component's `location` is its full SCM path), and the pinned
  snapshot `tag` if present.

No caller pre-flight is required. Folding in preserves the
component's `name` and `port`, so every caller keeps working
unchanged — TYPE-CHANGE conflates nothing (see
`decompose-story/SKILL.md`).

### Step 2 — Fetch the managed repo's code

Clone the managed repo at the version the topology currently
integrates — the pinned `components[].tag` if the entry has one, else
`main`. Folding in the pinned tag keeps the change truth-preserving:
the embedded code is exactly the referenced code the project was
already running.

### Step 3 — Lift the code into the root repo working tree

Copy the component's code into `<root-repo-dir>/packages/<name>/`,
verbatim. This is a **truth-preserving lift-and-shift**: file paths
change, nothing else. No logic changes, no bug fixes (see
`decompose-story/SKILL.md`, "Truth-preservation rule").

**Keep** — `src/`, `package.json`, `package-lock.json`,
`pats/*.pat.yaml`, `Dockerfile`, `README.md`, `.gitignore`.

**Drop** — the managed-repo-only infrastructure that an embedded
component does not own:

- `.gitlab-ci.yml` — an embedded component has no pipeline of its
  own; it is built and tested through the **root repo's** pipeline
  (the shell-lifecycle / `validate:*` jobs). Leaving a managed
  pipeline inside `packages/<name>/` would be dead, confusing config.
- `.m/steering/m-managed-repo.md` — managed-repo steering. The root
  repo carries its own steering; an embedded component does not need
  the managed-repo guide.
- `.git/` — the lift is into the root repo's working tree, not a
  nested repo.

Sub-task / story prose markdown never travelled into the managed repo
(I-002), so there is none to handle.

### Step 4 — Decommission the managed repo

The component is no longer `referenced`, so its managed repo must
leave the orchestration layer. Invoke `unwire-orchestration` for the
component (see `unwire-orchestration/SKILL.md`):

- Removes the MR webhook from the managed repo.
- Removes the root repo's per-repo `M_TOKEN_<COMPONENT>` CI variable.
- Removes the managed repo's own CI variables.

`unwire-orchestration` does **not** delete the managed repo — repo
disposition is a user decision (the REMOVE precedent). Offer the user
its optional `archive-repo` path as the recommended middle ground:
the history is preserved, the repo drops out of the active group
list. The managed repo's code now lives in the root repo, so the
managed repo is redundant, not valuable.

### Step 5 — Report and hand back

Output:

- Component name + the managed repo it was folded in from (and the
  ref — `tag` or `main`)
- Files lifted into `packages/<name>/`; infrastructure files dropped
- Decommission status (webhook + CI variables removed; repo
  kept / archived)

Control returns to the TYPE-CHANGE orchestration. `decompose-story
--phase=b` then flips `components[].type` to `embedded`, rewrites
`location` to the root-relative path (`./packages/<name>`), drops the
`tag` field (embedded components are not snapshot-pinned), and
re-renders the topology artefacts. `compile-story-pats` bundles all of
that — including the new `packages/<name>/` tree — into the
integration-gate MR.

## Notes

- embed-component does the code lift + the decommission; the
  `project.yaml` mutation and topology re-render stay owned by
  `decompose-story` Phase B + `render-topology-artefacts`. This
  capability never edits `project.yaml`.
- The `tag` field is dropped by Phase B, not here — embed-component
  only moves code and plumbing.
- Atomicity: embed-component un-wires the managed repo before the
  root gate MR merges. If the gate MR is later rejected, the managed
  repo is un-wired but still exists — re-running the TYPE-CHANGE
  story re-wires it via `wire-orchestration`, or `extract-component`
  reuses it. The un-wiring is idempotent, so recovery is safe.
- embed-component does not delete the managed repo — see Step 4.
- repo-type: only `node` is implemented, matching `extract-component`.
