# Improvements and Ideas

Captured during development of the reference implementation. Each item has
enough context to pick up without archaeology.

---

## I-001: Story Zero wizard (`init-story-zero`)

**Category:** M Power capability
**Priority:** Nice to have
**Discovered:** 2026-04-02, during workshop script review

### Problem

The `bootstrap-root-repo` capability expects a Story Zero markdown file with
a `## Project` section containing structured metadata (project name, GitLab
group, topology mode, component catalogue, etc.). This file is currently
hand-authored with no tooling support. The format is documented informally
in the `bootstrap-root-repo` capability doc but there's no schema, no
template, and no interactive help.

This is the cold-start problem: the very first artefact in an M-type project
is written freehand, with no guardrails.

### Proposal

Create an `init-story-zero` M Power capability that:

1. Asks the user a series of questions:
   - Project name
   - GitLab group path
   - Topology mode (distributed / monolith-first)
   - Component catalogue (name, role, type for each)
   - CI platform, PAT framework, deployment model
2. Generates a complete Story Zero markdown file with:
   - `## Project` section pre-filled from answers
   - `## Summary` with a standard bootstrapping description
   - `## Acceptance Criteria` with sensible defaults for infrastructure validation
     (shell loads, MFE composes, API responds, components versioned, story-level tests pass)
3. Writes the file to `workshop/jira/<story-id>.md` (or wherever the user specifies)
4. Presents the draft for review before finalising

The generated file then feeds directly into `bootstrap-root-repo` as the
`story-file` parameter — closing the loop.

### Alternative

Just formalise the `## Project` section as a documented template/schema in
the methodology docs and let users write it by hand. Story Zero is a
one-time event per project, so the ROI on a full capability is debatable.
A middle ground: ship a markdown template file in the power that users
copy and fill in.

### Dependencies

- Needs the `## Project` section format to be stable (it currently is,
  defined in `bootstrap-root-repo.md`)
- Should align with the instantiation parameters listed in methodology-m.md
  Section 6 (topology mode, component catalogue, CI platform, etc.)

---

## I-002: Remove `jira/` folders from GitLab repos — Jira is external

**Category:** Conceptual fix / M Power capability docs
**Priority:** Important (affects demo integrity)
**Discovered:** 2026-04-02, during workshop script review

### Problem

The current implementation commits story files and sub-task files into
`jira/` folders on the GitLab repos (root repo and managed repos). This
is conceptually wrong. Jira is an external system — stories and sub-tasks
don't live in the code repos. We emulate Jira with markdown files in
`workshop/jira/` in the methodology repo, but that emulation shouldn't
leak into the GitLab repos.

What belongs where:

| Artefact | Where it lives | Why |
|----------|---------------|-----|
| Stories (TODOM-000.md) | Jira (emulated: `workshop/jira/`) | External system, not code |
| Sub-tasks (TODOM-000a.md etc.) | Jira (emulated: `workshop/jira/`) | External system, not code |
| Story-level PATs (.pat.yaml) | Root repo `pats/` | Validation artefact, travels with code |
| Readiness trackers (.yaml) | Root repo `stories/` | Orchestration artefact |
| Repo-level PAT stubs (.stub.js) | Managed repo `pats/` | Component contract |
| project.yaml | Root repo root | Topology manifest |

### What needs to change

1. **`bootstrap-root-repo` capability doc** — stop committing the story
   file to `jira/` in the root repo. The story file stays in Jira
   (or our local emulation). The capability reads it as input but
   doesn't copy it into the repo.

2. **`decompose-story` capability doc** — write sub-task files to the
   Jira emulation folder (`workshop/jira/` or equivalent), not to the
   root repo's `jira/` folder. In a real project with Jira MCP, this
   would create Jira sub-tasks instead.

3. **`scaffold-repo` capability doc** — read sub-task files from Jira
   (emulated or real), not from the root repo. Only push PAT stubs
   to the managed repo, not the sub-task markdown.

4. **Existing GitLab repos** — the `jira/` folders on `todo-m-root`,
   `todo-m-api-read`, `todo-m-api-write`, and `todo-m-mfe` contain
   files that shouldn't be there. Either remove them or accept them
   as pass1 artefacts and fix for pass2.

5. **Workshop steering** — clarify that `workshop/jira/` is the Jira
   emulation and that nothing from there gets committed to GitLab repos.

### Impact on the demo

If we demo TODOM-001 with the corrected model, the audience sees the
clean separation: stories live in Jira, PATs live in repos. That's a
stronger message than having story files scattered across GitLab repos.

### Decision needed

Fix now (before TODOM-000 completion) or fix for pass2? The existing
`jira/` folders on GitLab are harmless but conceptually messy. Fixing
the capability docs is quick; cleaning up the GitLab repos requires
commits to remove the folders.

---
