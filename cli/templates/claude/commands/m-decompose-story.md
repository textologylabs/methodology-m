---
description: Decompose a story prose document into sub-tasks and a readiness tracker. Pass the story file path; defaults to the most recently edited *.story.md.
---

Execute the M `decompose-story` capability at `{{M_ROOT}}/capabilities/decompose-story/SKILL.md` for the story at `$ARGUMENTS`.

If `$ARGUMENTS` is empty, find the most recently edited `*.story.md` under `stories/` (the M convention) and use that.

Follow the capability end-to-end: map story prose onto components, generate the sub-task markdown files, and emit the readiness tracker. Do not skip the validation step — sub-task PATs must conform to `{{M_ROOT}}/schemas/pat.schema.json`.

Report the sub-tasks created, the components touched, and any prose that could not be mapped to a known component.
