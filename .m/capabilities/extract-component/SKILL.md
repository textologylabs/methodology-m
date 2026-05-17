# extract-component

**Capability:** Extract an embedded component into its own managed repo (TYPE-CHANGE, `embedded → referenced`)

## What it does

Takes a component that currently lives **inside the root repo**
(`type: embedded`, code under `packages/<name>/`) and gives it its own
managed repo on the SCM platform. The component's code is lifted out
of the root repo verbatim, the managed-repo CI/steering layer is
seeded around it, `main` is protected, a merge-transaction token is
minted, and the repo is wired into the root repo's orchestration.

After this capability runs, the new managed repo exists and is
CI-ready — which is the precondition `decompose-story` Phase B needs
before it flips `components[].type` to `referenced` and re-renders the
topology (see `decompose-story/SKILL.md`, "Order of operations for
TYPE-CHANGE").

This is the `embedded → referenced` direction of TYPE-CHANGE. The
inverse — folding a managed repo back into the root — is
`embed-component`.

extract-component is **SKILL-only**: it composes the `scaffold.mjs`
orchestrator (for the deterministic CI/steering seed), an agent
lift-and-shift of the component's existing code, and the SCM
side-effects. It introduces no new orchestrator — the deterministic
managed-repo layer is already a pure function owned by `scaffold-repo`.

## Parameters

| Parameter      | Type   | Required | Description                                                       |
|----------------|--------|----------|-------------------------------------------------------------------|
| component      | string | Yes      | Name of the embedded component to extract                          |
| project-yaml   | path   | Yes      | Path to the root repo's project.yaml (topology + group/project)    |
| root-repo-dir  | path   | No       | Root-repo working directory (defaults to `project-yaml`'s dir)     |
| story-id       | string | Yes      | The parent TYPE-CHANGE story ID (recorded in the seed README)      |
| repo-type      | string | No       | "node", "python", etc. (default: node)                             |
| namespace-id   | string | No       | GitLab namespace ID (resolved from project.yaml `group:` if omitted)|

## Execution

### Step 1 — Locate and validate the component

Read project.yaml. Find the `components:` entry whose `name` matches
the `component` parameter.

- If no such component exists, **hard reject** — there is nothing to
  extract.
- If the component's `type` is already `referenced`, **hard reject**
  with `extract-component: <name> is already referenced — nothing to
  extract`. TYPE-CHANGE rejects no-ops (see `decompose-story/SKILL.md`,
  "TYPE-CHANGE needs no caller pre-flight").

Extract from the entry and project.yaml:

- Component `role` (`backend` / `frontend` / `frontend-host`)
- Component `port`
- Group path (`group:`) and project name (`project:`)

Derive the managed repo name from the project convention — the same
shape `scaffold-repo` uses: `<project>-<name>` (e.g. `todo-m-analytics`
for component `analytics` in project `todo-m`). The component's
existing code lives at `<root-repo-dir>/packages/<name>/`.

No caller pre-flight is required. Extraction preserves the component's
`name` and `port`, so every caller keeps working unchanged — TYPE-CHANGE
conflates nothing (see `decompose-story/SKILL.md`).

### Step 2 — Create the managed repo

```
scm.create_repo(
  name: <repo-name>,
  namespace_id: <resolved-from-group-path>,
  initialize_readme: false
)
```

Do NOT initialise with a README — the seed commit carries its own.

### Step 3 — Generate the deterministic seed

The managed-repo infrastructure layer an embedded component lacks —
the `.gitlab-ci.yml` lifecycle pipeline and the
`.m/steering/m-managed-repo.md` development guide — is a pure function
of the component metadata. Generate it with the `scaffold-repo`
orchestrator into a staging directory:

```
node .m/capabilities/scaffold-repo/scaffold.mjs \
  --component <component-name> \
  --role <role> \
  --repo <repo-name> \
  --parent <story-id> \
  --root-repo <project>-root \
  --target-dir <staging-dir> \
  [--repo-type node] [--ci-provider gitlab]
```

This stages `README.md`, `.gitignore`, `package.json`,
`package-lock.json`, `.gitlab-ci.yml`, and
`.m/steering/m-managed-repo.md`. For an extraction the
`.gitlab-ci.yml` and the steering doc are the files that matter — the
component had neither while embedded (it shared the root repo's
pipeline). `package.json`, `package-lock.json`, and `README.md` are
**placeholders** here; Step 4 overlays the component's real ones on
top of them.

### Step 4 — Lift the component's code into the staging directory

Copy the component's existing code from
`<root-repo-dir>/packages/<name>/` into the staging directory,
verbatim. This is a **truth-preserving lift-and-shift**: file paths
change, nothing else. No logic changes, no bug fixes, no refactors —
those are follow-up business stories (see `decompose-story/SKILL.md`,
"Truth-preservation rule").

- The component's real `package.json`, `package-lock.json`, `src/`,
  and `pats/` **overwrite** the Step 3 placeholders. The real
  `package.json` carries the implemented lifecycle scripts; the
  placeholder existed only so the staging dir is never missing one.
- If the embedded component has **no** `package-lock.json`, keep the
  Step 3 placeholder lockfile — `npm ci` aborts without one.
- If the embedded component has **no** `.gitignore`, keep the Step 3
  placeholder.
- Do **not** copy any `.gitlab-ci.yml` from `packages/<name>/` — an
  embedded component never had one; the Step 3 pipeline is canonical.
- Sub-task / story prose markdown is **not** committed to the managed
  repo (I-002). Only the executable contract (`pats/*.pat.yaml`) and
  code move across.

The component's `Dockerfile` must travel with it — `wire-orchestration`
and the compose health checks require each managed repo to carry a
`Dockerfile` at its root. If the embedded component had none (embedded
components build in the root repo's context), author one as part of
the extraction; it is infrastructure the truth-preservation rule
permits, not a behaviour change.

### Step 5 — Commit the seed bundle

Push the staged bundle to `main` in a single commit:

```
scm.push_files(
  repo: <repo>,
  branch: "main",
  files: [...],
  commit_message: "seed: extract <component> from <project>-root"
)
```

Because the repo was created without a README (Step 2) every file is
new and `push_files` works cleanly.

### Step 6 — Reconfigure branch protection

`main` must be merge-only — no direct pushes.

```
scm.protect_branch(
  repo: <repo>,
  branch: "main",
  push: none,
  merge: maintainer,
  force_push: false
)
```

**Ordering matters:** Step 5 (seed) must complete before Step 6. Once
push is blocked, even the automation token can only land changes via
an MR merge.

### Step 7 — Mint the merge-transaction access token

```
scm.create_access_token(
  repo: <repo>,
  name: "m-merge-transaction",
  scopes: [api, read_repo, write_repo],
  access_level: maintainer,
  expiry: 1 year
)
```

On free-tier GitLab project access tokens are unavailable — fall back
to a group-level PAT and record that in the report (same fallback
`scaffold-repo` documents).

### Step 8 — Wire the new managed repo into the root repo

The component is becoming `referenced`, so it must join the root
repo's shadow-integration orchestration. This is the **incremental**
subset of `wire-orchestration` — one new repo joining an
already-bootstrapped root, not a full re-wire:

- Install the MR-events webhook on the new managed repo, pointing at
  the root repo's existing pipeline-trigger endpoint with this repo's
  identity encoded as `variables[...]` query parameters
  (`wire-orchestration/SKILL.md`, Step 3).
- Install the new repo's merge-transaction token (Step 7) as a root
  repo CI variable, keyed per the `wire-orchestration` convention.

Do **not** re-run `wire-orchestration` wholesale — its Step 2 mints a
fresh root pipeline-trigger token on every run and would orphan the
existing one. Reuse the trigger token already on the root repo.

### Step 9 — Report and hand back

Output:

- New managed repo URL
- Branch protection status (push: no one, merge: maintainer)
- Access token status (project token / free-tier group-PAT fallback)
- Webhook + CI-variable wiring status
- Summary of seeded files (deterministic seed + lifted code)

Control returns to the TYPE-CHANGE orchestration. `decompose-story
--phase=b` then flips `components[].type` to `referenced`, rewrites
`location` to the new managed repo's SCM path, re-renders the topology
artefacts, and stages the **deletion of `packages/<name>/`** from the
root repo working tree. `compile-story-pats` bundles all of that —
including the root-repo code deletion — into the integration-gate MR.

## Notes

- extract-component does the SCM repo lifecycle; the `project.yaml`
  mutation and topology re-render stay owned by `decompose-story`
  Phase B + `render-topology-artefacts`. This capability never edits
  `project.yaml`.
- The extracted repo starts un-tagged. Its first CI run on `main`
  auto-tags `v0.1.0` via the managed pipeline's `tag` job; Phase B may
  pin `components[].tag` to that once it exists, or leave the
  component to pick up the tag on its next bump (I-004).
- Atomicity: extract-component creates the managed repo *before* the
  root gate MR merges. If the gate MR is later rejected, the managed
  repo is an orphan. For harness runs the scenario teardown deletes
  it; for production, the orphan repo is a manual cleanup — re-running
  the TYPE-CHANGE story reuses it (Step 5 falls back to
  `create_or_update_file` for files that already exist, as in
  `scaffold-repo`).
- extract-component does not delete `packages/<name>/` itself — that
  deletion is staged by `decompose-story` Phase B so it travels in the
  same gate MR as the `project.yaml` flip, keeping the root repo
  internally consistent at every committed state.
- repo-type: only `node` is implemented, matching `scaffold.mjs`.
