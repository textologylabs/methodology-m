# M Power — Methodology M Bootstrap Skill

**Version:** 0.1.0 (In Development)

M Power is a Kiro skill that bootstraps Methodology M projects. It encapsulates the patterns and automation needed to set up and deliver M-type projects.

## CRITICAL — Execution Rule

**DO NOT improvise capability execution from the summaries below.** Each capability has a detailed execution spec in a standalone file at `.kiro/powers/m-power/<capability-name>.md`. Before executing ANY capability, you MUST read the corresponding file first. The summaries in this document are for orientation only — they tell you what a capability does, not how to do it. The standalone file is the authoritative playbook. Skip it and you will miss critical details (branch protection sequences, CI image requirements, webhook configuration flags, etc.) that will cause failures.

**Execution protocol:**
1. User requests a capability (e.g. "wire up orchestration using M Power")
2. You read `.kiro/powers/m-power/<capability-name>.md` — the FULL file, not a skim
3. You follow the steps in that file exactly
4. You produce the report described in that file

No exceptions. No shortcuts. No "I think I know what this does."

## Capabilities

### 1. `setup-workspace` (v0.1.0)

Create a new M-type project workspace on GitLab.

**What it does:**
- Creates a GitLab group (or subgroup) for the project
- Configures group settings (visibility, description)
- Prepares the space for Story Zero implementation

**Usage:**
```
m-power setup-workspace
  project-name: <name>
  [parent-path: <parent-group-path>]
  visibility: "public" | "private"
  description: <description>
```

**Note:** On GitLab.com SaaS, create the parent group manually via UI first, then use `parent-path` to create the subgroup via M Power.

**Outcome:**
- GitLab group/subgroup created and ready
- Empty group — repos created during bootstrap

---

### 2. `bootstrap-root-repo` (v0.1.0)

Create and seed the root repo for an M-type project.

**What it does:**
- Creates the root repo on GitLab with conventional folder structure
- Seeds it with `project.yaml` and Story Zero (`jira/<story-id>.md`)
- On completion, offers to run `generate-pats` to produce and commit story-level PATs
- After bootstrap, the root repo is the source of truth for all subsequent actions

**Usage:**
```
m-power bootstrap-root-repo
  group-path: <gitlab-group-path>
  project-name: <name>
  story-file: <path-to-story-zero-md>
  components: <component-catalogue>
  [topology-mode: "distributed" | "monolith-first"]
  [pat-framework: "cypress" | "playwright"]
  [deployment-model: "docker-compose" | "kubernetes" | "none"]
```

**Outcome:**
- Root repo created with `project.yaml`, `jira/<story-id>.md`, folder structure
- Optionally: `pats/<story-id>.pat.yaml` (via delegated `generate-pats`)
- Ready for `decompose-story`

---

### 3. `generate-pats` (v0.1.0)

Generate story-level PATs from a story file.

**What it does:**
- Reads a story file and transforms acceptance criteria into PAT.yaml format
- Presents the draft PAT for review
- On confirmation, writes the pat.yaml to the workspace

**Usage:**
```
m-power generate-pats
  story-file: <path-to-story-md>
  [workspace: <output-folder>]
```

**Outcome:**
- `workspace/<story-id>.pat.yaml` — machine-readable, topology-agnostic PATs

---

### 4. `decompose-story` (v0.1.0)

Decompose a story into component-scoped sub-tasks with PAT mapping.

**What it does:**
- Reads a story file (for component list) and its PAT file (for acceptance criteria)
- Proposes a PAT-to-component mapping interactively
- On confirmation, generates enriched story and sub-task files in the workspace
- Each sub-task gets its slice of the PATs plus test stub skeletons

**Usage:**
```
m-power decompose-story
  story-file: <path-to-story-md>
  pat-file: <path-to-pat-yaml>
  [workspace: <output-folder>]
```

**Outcome:**
- `workspace/<story-id>.md` — enriched story with mapping and sub-task refs
- `workspace/<story-id>a.md`, `<story-id>b.md`, etc. — one per component
- `workspace/<story-id>.readiness.yaml` — readiness tracker for the root repo

---

### 5. `scaffold-repo` (v0.1.0)

Create and configure a managed repo from a sub-task file.

**What it does:**
- Creates the managed repo on GitLab
- Seeds with README, sub-task file, PAT stubs, and a pluggable CI pipeline
- Protects `main` branch (merge-only, no direct push)
- Creates a project access token for merge transaction use
- The CI pipeline uses a lifecycle model: install → build → test → snapshot → tag
- Lifecycle phases are delegated to project scripts (npm, pip, cargo, etc.)

**Usage:**
```
m-power scaffold-repo
  sub-task-file: <path-to-sub-task-md>
  project-yaml: <path-to-project-yaml>
  [repo-type: "node" | "python" | "rust"]
  [namespace-id: <gitlab-namespace-id>]
```

**Outcome:**
- Managed repo created with pluggable CI pipeline and placeholder lifecycle scripts
- `main` branch protected (merge-only)
- Project access token created (for root repo merge transactions)
- Ready to receive implementation work via MR

---

### 6. `wire-orchestration` (v0.1.0)

Connect managed repos to the root repo's orchestration layer.

**What it does:**
- Creates a pipeline trigger token on the root repo
- Installs webhooks on each managed repo (MR events → root repo trigger)
- Stores managed repo access tokens as protected CI variables on the root repo
- Pushes the root repo CI pipeline (shadow integration, merge transaction, story-level tests)
- Protects root repo `main` branch

**Usage:**
```
m-power wire-orchestration
  project-yaml: <path-to-project-yaml>
  [root-project-id: <gitlab-project-id>]
  access-tokens:
    <component-name>: <token-value>
    ...
```

**Outcome:**
- Webhooks on all managed repos firing at root repo trigger
- Root repo CI pipeline with shadow integration and merge transaction stages
- CI variables with managed repo access tokens (protected, masked)
- Root repo `main` branch protected
- Full Methodology M orchestration operational

---

### 7. `generate-acceptance-tests` (v0.1.0)

Transform PAT stubs into executable acceptance test code.

**What it does:**
- Reads the PAT stub file (pseudocode) and transforms it into real test code
- Chooses the appropriate test framework based on component role
- Adds test devDependencies and vitest config
- Runs the tests to verify they pass

**Usage:**
```
m-power generate-acceptance-tests
  sub-task-id: <sub-task-identifier>
  [repo-path: <local-path-to-managed-repo>]
```

**Outcome:**
- `pats/<sub-task-id>.spec.js` created alongside the stub
- Test devDependencies added (supertest + vitest for APIs, Testing Library + vitest for MFEs)
- `npm test` passes — contract is proven
- Stub file preserved (human-readable spec alongside machine-readable proof)

---

### 8. `tag-release` (v0.1.0)

Tag a managed repo at a version and update the root repo topology.

**What it does:**
- Creates an annotated git tag on the managed repo
- Pushes the tag to origin
- Updates `project.yaml` in the root repo to pin the component to the new version

**Usage:**
```
m-power tag-release
  sub-task-id: <sub-task-identifier>
  version: <semver-version>
  [repo-path: <local-path-to-managed-repo>]
  [root-repo-path: <local-path-to-root-repo>]
```

**Outcome:**
- Annotated tag `<version>` on managed repo, pushed to origin
- Root repo `project.yaml` updated with new tag for the component
- Root repo change is NOT auto-committed (presenter controls timing)

---

## Roadmap

As we build M-type projects, M Power will grow:

- `compose-system` — Stand up the full system from the topology manifest
- `run-story-pats` — Run story-level PATs against the composed system
- `merge-transaction` — Atomic merge of managed MRs via the root repo

---

## Implementation Notes

M Power uses GitLab MCPs (`gitlab_ops`, `gitlab`) to automate project setup and management.

