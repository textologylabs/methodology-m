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
  [parent-id: <parent-group-id>]
  visibility: "public" | "private"
  description: <description>
```

**Note:** On GitLab.com SaaS, create the parent group manually via UI first, then use `parent-id` to create the subgroup via M Power.

**Outcome:**
- GitLab group/subgroup created and ready
- Empty group — repos created by Story Zero

---

## Roadmap

As we build M-type projects, M Power will grow:

- `scaffold-root-repo` — Create root repo with project.yaml, shell, PATs
- `scaffold-managed-repo` — Create managed repo with CI pipeline
- `generate-story-pats` — Generate story-level PATs from acceptance criteria
- `decompose-story` — Map story to topology, create sub-tasks
- `create-readiness-tracker` — Create readiness manifest for a story
- `generate-cypress` — Convert PATs to Cypress tests

---

## Implementation Notes

M Power uses GitLab MCPs (`gitlab_ops`, `gitlab_generic`) to automate project setup and management.

