---
inclusion: manual
---

# Workshop Steering — Methodology M Reference Implementation

This steering file provides context for the workshop that builds the reference
implementation of Methodology M. It is the consumer of M Power — not part of it.

## Project

- Name: `todo-m`
- GitLab group: `methodology-m/todo-m-workshop`
- Visibility: public
- Purpose: prove Methodology M works end-to-end by building a Todo app

## Instantiation Parameters

These were chosen at project bootstrap and apply throughout the workshop:

| Parameter | Value |
|-----------|-------|
| Topology | distributed |
| Components | todo-m-root (shell, embedded), todo-m-mfe, todo-m-api-read, todo-m-api-write (referenced) |
| CI platform | GitLab CI |
| Story management | local markdown (`workshop/jira/`) |
| PAT framework | Cypress |
| Deployment | Docker Compose |

## Repo Naming

Repos follow the pattern `todo-m-<component>`:

- `todo-m-root` — shell, module federation, story-level Cypress, project.yaml
- `todo-m-mfe` — todo microfrontend
- `todo-m-api-read` — read API
- `todo-m-api-write` — write API

## Workshop Layout

```
workshop/
  jira/           ← source stories (static, hand-authored)
  workspace/      ← generated artefacts (replayable via workshop-script.md)
    jira/         ← enriched stories, sub-tasks
```

## Replayability

All steps are logged in `workshop-script.md` with the exact commands used.
Generated artefacts in `workshop/workspace/` can be deleted and regenerated
by replaying those steps.
