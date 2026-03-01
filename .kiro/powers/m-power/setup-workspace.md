# M Power: setup-workspace

**Capability:** Create a new M-type project workspace

## What it does

Creates a GitLab group (or subgroup) that serves as the container for an M-type project. The group is where all repos (root, managed) live.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project-name` | string | Yes | Name of the project (becomes GitLab group name) |
| `parent-path` | string | No | Parent group path (e.g., `methodology-m`). Creates subgroup if provided; creates top-level group if omitted. |
| `visibility` | string | No | `public` or `private` (default: `public`) |
| `description` | string | No | Group description |

## Execution

### Top-level group (GitLab Self-Managed only)

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_group

Parameters:
  name: <project-name>
  path: <project-name>
  visibility: <visibility>
  description: <description>
```

### Subgroup (GitLab.com SaaS or Self-Managed)

```
MCP: gitlab_ops
Tool: mcp_gitlab_ops_create_group

Parameters:
  name: <project-name>
  path: <project-name>
  parent_id: <resolved-from-parent-path>
  visibility: <visibility>
  description: <description>
```

(M Power resolves `parent-path` to `parent_id` automatically)

## Examples

**Create top-level group (Self-Managed only):**
```
m-power setup-workspace
  project-name: "todo-m-workshop"
  visibility: "public"
  description: "Reference implementation for Methodology M"
```

**Create subgroup under parent (GitLab.com SaaS):**
```
m-power setup-workspace
  project-name: "todo-m-workshop"
  parent-path: "methodology-m"
  visibility: "public"
  description: "Reference implementation for Methodology M"
```

## Outcome

GitLab group created at `gitlab.com/<namespace>/<project-name>` (top-level) or `gitlab.com/<parent-path>/<project-name>` (subgroup). Ready for Story Zero.

## Notes

- **GitLab.com SaaS:** Top-level group creation via API is disabled. Create parent group manually via UI, then use `parent-id` to create subgroup.
- **GitLab Self-Managed:** Both top-level and subgroup creation work via API.

