# Setup Workspace

**Capability:** Create a new M-type project workspace

## What it does

Creates a group (or subgroup) on the SCM platform that serves as the container for an M-type project. The group is where all repos (root, managed) live.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project-name` | string | Yes | Name of the project (becomes group name) |
| `parent-path` | string | No | Parent group path (e.g., `methodology-m`). Creates subgroup if provided; creates top-level group if omitted. |
| `visibility` | string | No | `public` or `private` (default: `public`) |
| `description` | string | No | Group description |

## Execution

### Top-level group

```
scm.create_group(
  name: <project-name>,
  path: <project-name>,
  visibility: <visibility>,
  description: <description>
)
```

### Subgroup under parent

```
parent_id = scm.resolve_group_id(<parent-path>)

scm.create_group(
  name: <project-name>,
  path: <project-name>,
  parent_id: <parent_id>,
  visibility: <visibility>,
  description: <description>
)
```

## Examples

**Create top-level group:**
```
setup-workspace
  project-name: "todo-m-workshop"
  visibility: "public"
  description: "Reference implementation for Methodology M"
```

**Create subgroup under parent:**
```
setup-workspace
  project-name: "todo-m-workshop"
  parent-path: "methodology-m"
  visibility: "public"
  description: "Reference implementation for Methodology M"
```

## Outcome

Group created at `<scm-platform>/<namespace>/<project-name>`. Ready for Story Zero.

## Notes

- Some SCM platforms restrict top-level group creation via API — check your provider docs.
