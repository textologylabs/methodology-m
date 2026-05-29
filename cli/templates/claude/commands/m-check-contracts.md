---
description: Audit M capabilities for contract drift — verify every namespaced function call resolves to provider-interface.md. Pass --deep to also check active providers implement every contract function.
---

Delegate to the `capability-auditor` subagent to audit M's capability files against the namespace contract.

Default mode (no arguments): scan every `*.SKILL.md` under `{{M_ROOT}}/capabilities/`, identify all `<namespace>.<function>(...)` calls, and verify each against `{{M_ROOT}}/providers/provider-interface.md`. Report contract violations with line numbers and suggested fixes.

If `$ARGUMENTS` contains `--deep`, also run the second pass: for each active provider listed in the local `project.yaml` (or all providers if no project.yaml is present), verify the provider implements every function declared in its namespace.

The auditor is READ-ONLY. Violations get reported; capability and contract amendments are the operator's call.

Suitable as a pre-tag gate before cutting an M release — a capability that quietly calls a function that doesn't exist in the contract is a silent runtime break on any non-reference provider.
