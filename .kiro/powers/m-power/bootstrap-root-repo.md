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
| story-file       | path   | Yes      | Path to Story Zero markdown file               |
| group-path       | string | No       | GitLab group path (extracted from story if omitted) |
| project-name     | string | No       | Project name (extracted from story if omitted)  |
| components       | list   | No       | Component catalogue (extracted from story if omitted) |
| topology-mode    | string | No       | "distributed" or "monolith-first" (default: distributed) |
| pat-framework    | string | No       | "cypress" or "playwright" (default: cypress)   |
| deployment-model | string | No       | "docker-compose", "kubernetes", or "none"      |

Story Zero is the primary input. If the story file contains a `## Project`
section, the capability extracts project metadata automatically. Explicit
parameters override extracted values. Anything the capability cannot find
in the story or in explicit parameters, it asks the user for.

### Expected `## Project` section format

The story file's `## Project` section should contain:

- `Name:` — project name (used for repo naming pattern)
- `GitLab group:` — full group path where repos will be created
- `Topology:` — "distributed" or "monolith-first"
- `CI platform:` — "GitLab CI", "GitHub Actions", or "none"
- `Story management:` — "local markdown" or "Jira"
- `PAT framework:` — "Cypress", "Playwright", or "both"
- `Deployment:` — "Docker Compose", "Kubernetes", or "none"
- Component list — repo names with roles and types (embedded/referenced)

## Execution

### Step 1 — Extract project metadata

Read the story file. Parse the `## Project` section to extract:
- Project name (from `Name:` field)
- GitLab group path (from `GitLab group:` field)
- Component catalogue (from the repo list)

If any of these are missing from the story and not provided as explicit
parameters, ask the user.

### Step 2 — Create the root repo

Create `<project-name>-root` in the GitLab group using `gitlab-ops create_project`
(which supports `namespace_id` for group targeting). Do NOT initialise with README
— the seed commit in Step 6 includes a project-specific README. Initialising with
a default README causes a conflict when pushing the seed files.

### Step 3 — Generate project.yaml

Build the project manifest from the component catalogue:

- Shell component: embedded, location `./packages/shell`
- All other components: type based on topology-mode
  - distributed: referenced, location `<group-path>/<project-name>-<component>`
  - monolith-first: embedded, location `./packages/<component>`
- All tags set to `~` (YAML null — nothing released yet)

### Step 4 — Seed Story Zero

Place the story file into the root repo at `jira/<story-id>.md`.

### Step 5 — Create conventional folder structure

Create placeholder structure for the root repo:

- `pats/` — story-level PAT files (empty until generate-pats runs)
- `stories/` — readiness trackers
- `packages/shell/` — shell package stub (embedded component)
- `.kiro/` — agent configuration (steering, hooks)

### Step 6 — Commit and push

Commit all seeded files to the root repo in a single commit:

- `project.yaml`
- `jira/<story-id>.md`
- `README.md` (project-specific, not the GitLab boilerplate)
- Folder structure with `.gitkeep` files

Because the repo was created without `initialize_with_readme`, all files
can be pushed in one commit with no conflicts.

### Step 7 — Offer PAT generation

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

### Step 8 — Report

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
