---
description: Generic M capability dispatcher. Pass "<capability> [args...]" — e.g. /m scaffold-repo or /m wire-orchestration. Escape hatch for capabilities without a dedicated /m-<name> command.
---

Generic dispatcher for any M capability not surfaced via a dedicated `/m-<name>` slash-command.

Parse `$ARGUMENTS`:
- First token is the capability name (matches a directory under `{{M_ROOT}}/capabilities/<name>/`).
- Remaining tokens are forwarded to the capability as its arguments.

Execute the capability following the M execution protocol defined in `{{M_ROOT}}/m.md`:

1. Read `{{M_ROOT}}/capabilities/<capability>/SKILL.md` end-to-end before executing — capability files contain critical sequences (branch protection ordering, webhook flags, CI image requirements) that cannot be skipped.
2. For every namespaced function call, look up the active provider via `project.yaml` → `providers:` and read `{{M_ROOT}}/providers/<category>/<provider>.md` for the platform-specific implementation.
3. Produce the report the capability file describes.

If `$ARGUMENTS` is empty, list every capability under `{{M_ROOT}}/capabilities/` with its one-line description (from the corresponding SKILL.md frontmatter).

If the named capability does not exist under `{{M_ROOT}}/capabilities/`, list the available capabilities and ask the operator to pick one — do not guess at a partial match.

## When to prefer a dedicated command

The dedicated `/m-<name>` commands (`/m-decompose-story`, `/m-validate-pat`, `/m-render-topology`, `/m-new-provider`, `/m-check-contracts`) carry extra UX — argument parsing, defaults, subagent delegation. Use them when they exist. `/m` is the escape hatch for the long tail of capabilities that have not earned a dedicated command yet (`/m scaffold-repo`, `/m wire-orchestration`, `/m setup-workspace`, etc.).
