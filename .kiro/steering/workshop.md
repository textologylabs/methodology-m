---
inclusion: auto
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

## Workshop Script Format

Every step in `workshop-script.md` must clearly record:

- **Context** — where the user is (which tool, which window, which repo)
- **Actor** — who does the action: the presenter (human), Kiro (AI agent), or the audience
- **Tool** — which tool is used: Kiro chat, terminal, GitLab UI, browser, IDE editor
- **Action** — the exact thing that happens: a chat message, a CLI command, a UI click, a file edit
- **What Kiro does** — if Kiro is involved, which M Power capability runs and what it produces
- **Result** — what exists after the step, what the audience should see

Use iconic prefixes for each action within a step:

```
💬  Kiro Chat (presenter types a message to Kiro)
👻  Kiro (AI agent acts autonomously)
🖥️  Terminal (presenter runs a shell command)
🦊  GitLab UI (presenter clicks/navigates in GitLab)
📝  IDE Editor (presenter edits a file manually)
🌐  Browser (presenter shows something in a browser)
👀  Audience (what the audience should observe)
```

This matters because the script is a demo playbook. A reader must know whether
they're typing into Kiro chat, running a terminal command, clicking something
in GitLab, or editing a file.

## Powers First Rule

When a user references a power by name (e.g. "using M Power", "with m-power",
"use X power"), you MUST activate that power via `kiroPowers action=activate`
BEFORE reading any capability files manually, exploring the power's folder
structure, or taking any other action.

The activation response gives you everything you need: documentation, available
tools, and steering files. Only after activation should you proceed with the
requested capability.

Never bypass activation by reading power files directly from disk.
