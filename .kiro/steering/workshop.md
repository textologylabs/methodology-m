---
inclusion: always
---

# Workshop Steering — Methodology M Reference Implementation

This steering file provides context for the workshop that builds the reference
implementation of Methodology M. It is the consumer of M Power — not part of it.

## Project

- Name: `todo-m`
- GitLab group: `methodology-m/todo-m-workshop`
- Visibility: public
- Purpose: build a reference implementation of Methodology M AND a replayable workshop

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

## Where Things Live

Artefacts live in two places with different roles:

**This local repo** (`methodology-m`) — planning, scripting, and workshop artefacts:

```
docs/                  ← methodology articles and plans
workshop/
  jira/                ← source stories (static, hand-authored)
  workspace/
    jira/              ← enriched stories, sub-tasks, PATs (generated)
workshop-script.md     ← the demo playbook
ref-projects/          ← local clones of GitLab repos (gitignored)
```

Workshop artefacts (stories, PATs, sub-tasks in `workshop/workspace/jira/`)
are authored and stored here. They also get pushed to the GitLab repos as
part of the workshop flow (e.g. into `jira/` folders in the root repo).

**GitLab repos** under `methodology-m/todo-m-workshop/` — the actual application:

- `todo-m-root` — shell code, project.yaml, story-level Cypress, readiness trackers, CI pipelines
- `todo-m-mfe` — MFE application code, repo-level CI
- `todo-m-api-read` — read API application code, repo-level CI
- `todo-m-api-write` — write API application code, repo-level CI

Application code, CI pipelines, project.yaml, readiness trackers, and
topology configuration only live on GitLab. When checking whether the
project infrastructure is set up, **check GitLab** — not this local repo.

## Local Development Workspace

For implementation work, GitLab repos are cloned locally under `ref-projects/`:

```
ref-projects/
  todo-m-workshop/
    pass1/             ← first run of the workshop
      todo-m-root/
      todo-m-mfe/
      todo-m-api-read/
      todo-m-api-write/
```

The `pass1` convention supports replayability — a second run would use `pass2`
with fresh clones, proving the workshop script works from scratch.

These clones are gitignored (each has its own remote). Implementation happens
here using normal dev workflow (branch, code, push, MR). M Power capabilities
use the GitLab API for scaffolding; implementation is local.

In a real project, devs would open all repos in a multi-folder workspace so
the AI can see everything. Here we keep them inside the methodology repo for
convenience since this is a reference implementation.

## Replayability

All steps are logged in `workshop-script.md` with the exact commands used.
Generated artefacts in `workshop/workspace/` can be deleted and regenerated
by replaying those steps.

**Fix-forward rule:** When fixing any issue discovered during execution
(missing CI image, API gotcha, wrong parameter, etc.), ALWAYS propagate
the fix back into the source artefacts so the next replay doesn't hit
the same problem. The chain is:

1. Fix the live issue (e.g. push corrected file to GitLab)
2. Update the M Power capability doc (the template/instructions that
   produced the broken output)
3. Update `workshop-script.md` if the step description is affected
4. Add a note to the capability doc's `## Notes` section documenting
   the gotcha for future reference

If you fix something live but don't update the source artefacts, the
workshop will break again on the next replay. Every fix is a lesson —
capture it where it matters.

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

## Primary Goal: Methodology, Not the App

The todo app is a vehicle — nobody cares about the app itself. The two
real deliverables are:

1. **The reference implementation** — proving Methodology M works end-to-end
2. **The replayable workshop** — a script someone can follow to see M in action

Every action must be evaluated through this lens:

### Power-first thinking

Before doing anything manually, ask: "Should this be an M Power capability?"

- If the action is something any M-type project would need (scaffolding,
  PAT generation, acceptance test transformation, tagging, orchestration
  wiring), it belongs in a power capability — generic, parameterised,
  reusable.
- If the action is project-specific (choosing Express for the API, picking
  React for the MFE), it's implementation guided by the sub-task file and
  steering — normal dev work, not a power.
- When in doubt, lean toward making it a power. It's easier to simplify
  a generic capability than to extract one from ad-hoc work after the fact.

### Replayability thinking

Every step must be reproducible:

- **Power invocations** are inherently replayable — same inputs, same outputs.
- **Manual steps** (implementation, local commands) must be documented in
  `workshop-script.md` with enough detail that someone can follow along.
- **Ad-hoc fixes** must be propagated back into source artefacts (see
  fix-forward rule above). A fix that only lives in conversation history
  is a fix that breaks on replay.

### What NOT to do

- Don't implement things "manually" when a power capability should exist
- Don't make changes directly on GitLab that aren't captured in the script
- Don't skip documenting a step because "it's obvious"
- Don't optimise the todo app — it's deliberately boring by design
- Don't treat this as app development with a methodology bolted on;
  it's methodology development with an app as the test harness

## PAT-Based Development

When implementing any sub-task under Methodology M, always validate against
the repo-level PATs as you go. Read the PAT contract, implement towards it,
and use whatever tools are appropriate (curl, browser, Chrome DevTools MCP,
etc.) to verify the behaviour described in the PAT. Iterate until the PAT
contract is satisfied.

This is not a special step — it's how implementation works under M. Every
implementation action is a self-validating approximation loop driven by the
PATs. Only move to CAT compilation once the PAT contract is met.
