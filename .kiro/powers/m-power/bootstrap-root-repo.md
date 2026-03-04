# M Power: bootstrap-root-repo

**Capability:** Create and seed the root repo for an M-type project

## What it does

Creates the root repo on GitLab, seeds it with the project manifest and
Story Zero. After this step, the root repo is the source of truth — all
subsequent M Power actions read from and write to it.

On completion, offers to run `generate-pats` to produce story-level PATs
and commit them to the root repo. PAT generation is delegated to the
existing `generate-pats` capability — this capability orchestrates the
sequence but does not reimplement PAT logic.

## Parameters

| Parameter        | Type   | Required | Description                                    |
|------------------|--------|----------|------------------------------------------------|
| group-path       | string | Yes      | GitLab group path (from setup-workspace)       |
| project-name     | string | Yes      | Project name (used for repo naming)            |
| story-file       | path   | Yes      | Path to Story Zero markdown file               |
| components       | list   | Yes      | Component catalogue (names, roles, types)      |
| topology-mode    | string | No       | "distributed" or "monolith-first" (default: distributed) |
| pat-framework    | string | No       | "cypress" or "playwright" (default: cypress)   |
| deployment-model | string | No       | "docker-compose", "kubernetes", or "none"      |

## Execution

### Step 1 — Create the root repo

Create `<project-name>-root` in the GitLab group. Initialise with README.

### Step 2 — Generate project.yaml

Build the project manifest from the component catalogue:

- Shell component: embedded, location `./packages/shell`
- All other components: type based on topology-mode
  - distributed: referenced, location `<group-path>/<project-name>-<component>`
  - monolith-first: embedded, location `./packages/<component>`
- All versions pinned to `v0.0.0` (nothing exists yet)

### Step 3 — Seed Story Zero

Place the story file into the root repo at `jira/<story-id>.md`.

### Step 4 — Create conventional folder structure

Create placeholder structure for the root repo:

- `pats/` — story-level PAT files (empty until generate-pats runs)
- `stories/` — readiness trackers
- `packages/shell/` — shell package stub (embedded component)
- `.kiro/` — agent configuration (steering, hooks)

### Step 5 — Commit and push

Commit all seeded files to the root repo:

- `project.yaml`
- `jira/<story-id>.md`
- `README.md` (with project description)
- Folder structure with `.gitkeep` files

### Step 6 — Offer PAT generation

Present the user with:

```
Root repo created and seeded with Story Zero.
Want me to generate PATs now? (delegates to generate-pats)
```

If confirmed, run `generate-pats` with:
- `story-file`: the story file just committed to the root repo
- Output target: `pats/<story-id>.pat.yaml` in the root repo

The `generate-pats` capability handles the draft/review/confirm cycle.
On confirmation, the PAT file is committed to the root repo.

### Step 7 — Report

Output the root repo URL and a summary of what was created.
Note that the next step is `decompose-story`.

## Notes

- The root repo becomes the source of truth the moment it's created
- This capability orchestrates a sequence but delegates PAT generation
  to `generate-pats` — each capability stays atomic
- Managed repos are NOT created here — that happens during
  `decompose-story` or via a future `scaffold-repo` capability
- The story file parameter can be a local file path; the capability
  reads it and commits it to the root repo
- The user has a decision point between seeding and PAT generation —
  they can pause, edit the story, or generate PATs later
