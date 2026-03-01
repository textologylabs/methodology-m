# M Power: decompose-story

**Capability:** Decompose a story into component-scoped sub-tasks

## What it does

Reads a story file, proposes a mapping of story-level PATs to components,
waits for confirmation, then generates:

- An enriched story file in the workspace with the mapping and sub-task refs
- One sub-task file per component in the workspace

The source story file is never modified.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `story-file` | path | Yes | Path to the source story markdown file |
| `workspace` | path | No | Output folder for generated artefacts |

## Execution

### Step 1 — Read the story

Read the story file. Extract:
- Story ID and title
- Component list (from the Project section)
- Story-level PATs (from Acceptance Criteria)

### Step 2 — Propose PAT mapping

Reason about which PATs each component is responsible for, then present the
proposed mapping to the user:

```
Proposed PAT mapping for <story-id>:

  <component-name> (sub-task: <story-id>a)
    - <PAT description>
    - <PAT description>

  <component-name> (sub-task: <story-id>b)
    - <PAT description>

  ...

Confirm, or tell me what to change.
```

Wait for explicit confirmation before writing any files.

### Step 3 — Generate workspace artefacts

On confirmation, write to the workspace folder:

**Enriched story: `<story-id>.md`**

Copy of the source story with two additions:
- A `## Component PAT Mapping` section showing which PATs each component owns
- A `## Sub-Tasks` section listing the generated sub-task IDs and their repos

**Sub-task files: `<story-id>a.md`, `<story-id>b.md`, etc.**

One file per component. Each contains:
- Sub-task ID, title, component name, repo name
- Status and parent story reference
- The component's slice of the PATs as its acceptance criteria
- A `## PAT Stubs` section with test skeletons (one per PAT, using the
  project's configured PAT framework)

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

## Acceptance Criteria (Repo-Level PATs)

1. <PAT title>
   - <detail>
   - <detail>

...

## PAT Stubs

<Test skeletons — one per PAT, framework determined by project config>
```

## Notes

- Sub-task IDs use alphabetic suffix: a, b, c, d (up to 26 components)
- PAT stubs are skeletons only — implementation happens in the repo
- The enriched story in the workspace is the source of truth for subsequent
  scaffolding steps
- Run `m-power scaffold-repo` against each sub-task file to create the repo
