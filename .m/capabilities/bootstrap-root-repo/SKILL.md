# bootstrap-root-repo

**Capability:** Create and seed the root repo for an M-type project

## What it does

Creates the root repo on GitLab, seeds it with the project manifest and
Story Zero. After this step, the root repo is the source of truth — all
subsequent M Power actions read from and write to it.

On completion, offers to run `decompose-story` as the next step in
the post-v0.6.0 lifecycle (decompose-story → generate-pats →
compile-story-pats). Each capability stays atomic — this one only
bootstraps; downstream capabilities handle decomposition, PAT
authoring, and integration-gate setup.

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

```
scm.create_repo(
  name: "<project-name>-root",
  namespace_id: <resolved-from-group-path>,
  initialize_readme: false
)
```

Do NOT initialise with README — the seed commit in Step 6 includes a
project-specific README. Initialising with a default README causes a
conflict when pushing the seed files.

### Step 3 — Generate project.yaml

Build the project manifest from the component catalogue:

- Shell component: embedded, location `./packages/shell`, role
  `frontend-host`, port 3000
- All other components: type based on topology-mode
  - distributed: referenced, location `<group-path>/<project-name>-<component>`
  - monolith-first: embedded, location `./packages/<component>`
- Ports allocated sequentially starting at 3001 in declaration order,
  unless the story specifies explicit ports
- All tags set to `~` (YAML null — nothing released yet)
- `providers:` block populated from the story's `## Project` section:
  - `scm:` derived from the SCM platform (`gitlab`, `github`, ...) —
    default `gitlab`
  - `compose:` derived from deployment-model:
    `docker-compose` → `docker-compose`; `kubernetes` → `kubernetes`
    (not yet implemented, would error at render time);
    `none` → omit the `compose` entry entirely
  - `ci:` omitted — resolves to `providers.scm` at render time
- `compose:` block populated from deployment-model:
  - `docker-compose`: include the `local.strategy: process` +
    `local.script: scripts/start-all.sh` + `integration.strategy:
    docker-compose` + `integration.file: docker-compose.yml` entries
  - `none` / others: omit the block
- `persistence:` block: only include if the Story Zero text explicitly
  implies shared persistent state (e.g. "backends share a todo list",
  "data persists across requests"). This capability does NOT guess at
  persistence — I-047 will formalise persistence interpretation. If
  the story is silent, no persistence block is emitted. A later
  authoring pass can add it manually if needed.

`project.yaml` must be schema-valid against
`.m/schemas/project.schema.json`. Validate before proceeding.

### Step 4 — Seed Story Zero

The Story Zero markdown file is the input to subsequent capabilities
(`decompose-story`, `generate-pats`, `compile-story-pats`). It lives
in the project's story source of truth — a real Jira instance for
production projects, or a local markdown directory for projects using
file-based story tracking. The location of the local directory is a
project-level convention and is NOT prescribed by M.

**The Story Zero file is NOT committed to the root repo.** The
decision to keep sub-task and story markdown out of SCM repos is
baked into M (see I-002). The capability remembers the path to the
story file for step 8 (delegation to `decompose-story`) but does not
include it in the seed commit.

### Step 5 — Create conventional folder structure

Create placeholder structure for the root repo:

- `pats/` — story-level PAT files (empty until generate-pats runs)
- `stories/` — readiness trackers
- `packages/shell/` — shell package stub, populated from the embedded
  frontend-host component's `location`. Starts as a minimal `package.json`
  and `README.md` so the managed-repo CI install step works. The
  shell's actual content is implemented in the first story.
- `.m/` — methodology configuration (steering, schemas) — typically a
  `.gitkeep` or a symlink/reference to the org-level M install.

### Step 6 — Render topology-derived artefacts

Call the `render-topology-artefacts` capability with the project.yaml
generated in Step 3 and the root repo's local working directory as the
target:

    node .m/capabilities/render-topology-artefacts/render.mjs \
      --project-yaml <path to project.yaml> \
      --target-dir <root repo working dir>

This is a real CLI the agent shells out to — not a SKILL the agent
interprets. The orchestrator is executable code that produces
byte-deterministic output. See
`.m/capabilities/render-topology-artefacts/SKILL.md` for the full
invocation contract and exit codes.

This produces the topology-derived files owned by the compose and CI
providers:

- `docker-compose.yml` (compose provider)
- `scripts/integration-test.sh` (compose provider, executable)
- `.gitlab-ci.yml` (CI provider)
- `scripts/report-shadow-status.sh` (CI provider, executable)

These files are NOT hand-authored — they are pure functions of
`project.yaml` and are regenerated by any capability that mutates
topology. Treating them as generated artefacts (committed to the repo
but conceptually derivative) is the whole point of I-036.

If `project.yaml` declares no `providers.compose` or
`providers.ci`, the default resolution rules kick in (compose
inferred from `compose.integration.strategy`, CI inferred from
`providers.scm`). See the `render-topology-artefacts` capability for
the full resolution protocol.

### Step 7 — Commit and push

Commit all seeded files to the root repo in a single commit:

- `project.yaml`
- `README.md` (project-specific, not the GitLab boilerplate)
- `packages/shell/package.json`, `packages/shell/README.md` (shell stub)
- `pats/.gitkeep`, `stories/.gitkeep`, `.m/.gitkeep` (empty dirs)
- `docker-compose.yml` (from renderer)
- `scripts/integration-test.sh` (from renderer, executable)
- `.gitlab-ci.yml` (from renderer)
- `scripts/report-shadow-status.sh` (from renderer, executable)

Because the repo was created without `initialize_with_readme`, all files
can be pushed in one commit with no conflicts.

The commit message is: `🎬 bootstrap: seed <project> root repo`.

### Step 8 — Offer decomposition

Present the user with:

```
Root repo created and seeded with Story Zero.
Want me to decompose Story Zero now? (delegates to decompose-story)
```

If confirmed, run `decompose-story` with:
- `story-file`: the Story Zero path remembered from Step 1

The `decompose-story` capability handles AC→component mapping,
sub-task markdown generation, and readiness-tracker staging. After it
completes, the natural next step is `generate-pats` (to author the
story + sub-task PAT yaml) and then `compile-story-pats` (to compile
and raise the integration-gate MR).

### Step 9 — Report

Output the root repo URL and a summary of what was created.
Note that the next step is `decompose-story` (post-v0.6.0 lifecycle).

## Notes

- The root repo becomes the source of truth the moment it's created
- This capability orchestrates a sequence but delegates decomposition
  and PAT authoring downstream — each capability stays atomic
- Managed repos are NOT created here — that happens during
  `scaffold-repo`, which reads sub-task markdown produced by
  `decompose-story`
- The story file parameter is a local path to the Story Zero markdown.
  The file is read, metadata is extracted, and the path is remembered
  for step 8 (delegation to decompose-story). The file itself is NOT
  committed to the root repo — see Step 4.
- The user has a decision point between seeding and decomposition —
  they can pause, edit the story, or decompose later
