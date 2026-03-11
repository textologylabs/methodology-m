# M Power: tag-release

**Capability:** Tag a managed repo at a version and update the root repo topology

## What it does

Tags a managed repo with a semver version (e.g. `v0.1.0`), then updates
the root repo's `project.yaml` to pin that component to the new version.
After this step, the topology manifest reflects the released state and
the component is reproducibly referenceable.

## Parameters

| Parameter      | Type   | Required | Description                                        |
|----------------|--------|----------|----------------------------------------------------|
| sub-task-id    | string | Yes      | Sub-task identifier (e.g. TODOM-000c)              |
| version        | string | Yes      | Semver version to tag (e.g. v0.1.0)                |
| repo-path      | path   | No       | Local path to the managed repo (inferred from CWD if omitted) |
| root-repo-path | path   | No       | Local path to the root repo (inferred from sibling directory if omitted) |

## Prerequisites

- Managed repo has a passing implementation and acceptance tests
- All tests pass (`npm test` exits 0)
- The managed repo's `main` branch is up to date
- Root repo exists locally with `project.yaml`

## Execution

### Step 1 — Verify readiness

Before tagging, confirm:
1. Working directory is clean (no uncommitted changes)
2. On `main` branch (or the MR has been merged to main)
3. `npm test` passes

If any check fails, stop and report. Do not tag broken code.

### Step 2 — Determine component name

Read `jira/<sub-task-id>.md` to extract the component name.
This is used to find the correct entry in `project.yaml`.

Alternatively, read `package.json` `name` field — the repo name
follows the pattern `<project>-<component>` (e.g. `todo-m-api-read`
→ component `api-read`).

### Step 3 — Create annotated tag

Create an annotated git tag on the current HEAD:

```
git tag -a <version> -m "Release <version> — <sub-task-id>"
```

Annotated tags (not lightweight) because:
- They carry metadata (tagger, date, message)
- They're the convention for release tags
- `git describe` works with annotated tags

### Step 4 — Push the tag

```
git push origin <version>
```

This pushes only the tag, not any branch changes.

### Step 5 — Update project.yaml in root repo

In the root repo's `project.yaml`, find the component entry and
update its `tag` field from `~` (null) to the new version:

```
# Before
- name: api-read
  type: referenced
  location: methodology-m/todo-m-workshop/todo-m-api-read
  tag: ~

# After
- name: api-read
  type: referenced
  location: methodology-m/todo-m-workshop/todo-m-api-read
  tag: v0.1.0
```

**Important:** Only update the specific component's tag. Do not
touch other components' entries.

### Step 6 — Report

Output:
- Tag created: `<version>` on `<repo-name>`
- Tag pushed to origin
- `project.yaml` updated: `<component>` now pinned to `<version>`
- Reminder: commit and push the root repo `project.yaml` change
  (this capability updates the file but does not auto-commit the
  root repo — the presenter controls when that happens)

## Notes

- This capability works locally. It creates and pushes a git tag on
  the managed repo, and edits `project.yaml` in the local root repo.
- The root repo change (updated `project.yaml`) is NOT auto-committed.
  In the workshop flow, the presenter commits this as part of a
  topology update or as a standalone commit. In a real M workflow,
  this would be part of a topology MR.
- Version `v0.1.0` is the convention for Story Zero's first release.
  It signals "the component exists and meets its contract" — not
  production-ready, but validated.
- The tag is on the managed repo's `main` branch HEAD. If the
  implementation was done on a feature branch, it must be merged
  to main first.
- For the workshop fast-forward flow, this capability is called
  once per managed repo after implementation and tests are in place.
- This capability does NOT update the readiness tracker
  (`stories/<story-id>.yaml`). That's a separate concern tracked
  at the story level, not the component level.
- If the tag already exists (re-run scenario), report it and skip.
  Do not force-push tags.
