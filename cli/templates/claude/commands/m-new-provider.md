---
description: Draft a new M provider (e.g. scm/github, ci/circleci, test.cat/playwright). Pass "<namespace>/<name> [docs-url]" — the docs-url is optional but improves coverage.
---

Delegate to the `provider-author` subagent to draft a new M provider implementation.

Parse `$ARGUMENTS`:
- First token must be `<namespace>/<name>`, e.g. `scm/github`, `ci/circleci`, `test.cat/playwright`, `compose/k8s`.
- Remaining tokens are optional platform docs URLs the subagent should consult via WebFetch.

Hand off to `provider-author` with the parsed namespace, name, and docs URLs. It will:

1. Read `{{M_ROOT}}/providers/provider-interface.md` for the namespace contract.
2. Read the reference provider for the namespace.
3. Research the target platform's API.
4. Draft `{{M_ROOT}}/providers/<namespace>/<name>.md` and (if applicable) `.mjs`.
5. Return a coverage report — which contract functions map cleanly, which compose from multiple platform calls, which have no equivalent.

The draft is NOT registered in any project's `project.yaml` automatically — the operator reviews first, then registers.

If `$ARGUMENTS` does not contain a `<namespace>/<name>` token, ask the operator what they want to implement before delegating.
