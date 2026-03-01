# Workspace Script — Methodology M Reference Implementation

**Purpose:** Record workspace-specific setup and execution steps for building the reference implementation.

**Status:** In Progress

---

## Step 1: Create M Power — Project Workspace Setup

**Rationale:** M Power is a Kiro skill that bootstraps M-type projects. We build it as we go, starting with the first capability: setting up a new project workspace (creating a GitLab subgroup under a parent group).

**Note:** On GitLab.com SaaS, top-level group creation via API is disabled. We create the parent group manually via UI, then use M Power to create the subgroup.

**Step 1a: Create parent group manually**

Create a top-level group on GitLab.com via the UI. Example: `methodology-m-workshop`

**Step 1b: Use M Power to create subgroup**

M Power Capability 1: `setup-workspace`

This capability creates a GitLab subgroup for a new M-type project.

**Verbal command:**

```
Set up the todo-m-workshop subgroup under methodology-m using M Power.
```

**Expected outcome:** GitLab subgroup `methodology-m/todo-m-workshop` created. M Power's first capability is proven and documented.

**M Power grows:** As we implement Story Zero, we'll add capabilities for scaffolding repos, generating PATs, creating readiness trackers, etc.

---

## Story Zero (PROJ-000) — System Bootstrap

Story Zero is the first M-type story. It bootstraps the entire infrastructure as part of the story implementation, not as a prerequisite.

**Story-level PATs (topology-agnostic):**
- Shell loads and displays content from MFE
- MFE fetches from API and displays response
- All components pinned to validated versions in project.yaml

**Sub-tasks (four devs, four repos):**

| Sub-task | Repo | Work |
|----------|------|------|
| PROJ-000a | todo-api-read | GET /hello endpoint + repo-level PAT + CI |
| PROJ-000b | todo-api-write | POST /placeholder endpoint + repo-level PAT + CI |
| PROJ-000c | todo-mfe | Hello component + fetch + repo-level PAT + CI |
| PROJ-000d | todo-root | Shell + Module Federation + Cypress + topology |

**Orchestration:**
1. Each sub-task merges to main → auto-tag v0.1.0
2. Root repo detects tags → updates readiness tracker
3. When all components tagged → bump topology to v0.1.0
4. Run story-level Cypress tests
5. Merge topology commit to root repo main
6. Tag: `v0.1.0-story-zero-complete`

---

## Decisions Made

- **GitLab as primary platform** — MCP integration available
- **Local markdown for Jira** — `jira/` folder in root repo, version-controlled
- **Docker Compose for local composition** — no external infrastructure needed
- **Cypress for story-level tests** — deterministic, CI-friendly
- **Auto-tag on merge** — CI handles versioning, no manual tagging
- **Sequential implementation** — we'll implement sub-tasks one at a time (simulating four devs)

