# M Power — Methodology M Bootstrap Skill

**Version:** 0.1.0 (In Development)

M Power is a Kiro skill that bootstraps Methodology M projects. It encapsulates the patterns and automation needed to set up and deliver M-type projects.

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
- Empty group — repos created by Story Zero

---

### 2. `decompose-story` (v0.1.0)

Decompose a story into component-scoped sub-tasks with PAT mapping.

**What it does:**
- Reads a story file and extracts PATs and component list
- Proposes a PAT-to-component mapping interactively
- On confirmation, generates enriched story and sub-task files in `workspace/jira/`
- Each sub-task gets its slice of the PATs plus Cypress stub skeletons

**Usage:**
```
m-power decompose-story
  story-file: <path-to-story-md>
  [workspace: <output-folder>]
```

**Outcome:**
- `workspace/jira/TODOM-NNN.md` — enriched story with mapping and sub-task refs
- `workspace/jira/TODOM-NNNa.md`, `TODOM-NNNb.md`, etc. — one per component

---

## Roadmap

As we build M-type projects, M Power will grow:

- `scaffold-repo` — Create a GitLab repo from a sub-task file (CI stub, readme, PAT stubs)
- `generate-cypress` — Convert PAT stubs into runnable Cypress specs
- `create-readiness-tracker` — Create readiness manifest for a story in the root repo

---

## Implementation Notes

M Power uses GitLab MCPs (`gitlab_ops`, `gitlab_generic`) to automate project setup and management.

