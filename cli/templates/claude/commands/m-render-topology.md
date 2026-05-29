---
description: Detect drift between project.yaml and the rendered artefacts (docker-compose.yml, .gitlab-ci.yml, pats/*, scripts/*). Pass --apply to overwrite the on-disk artefacts with the freshly rendered output.
---

Delegate to the `topology-renderer` subagent to dry-run M's compose, CI, and test.cat renderers against the current `project.yaml` and diff the output against the on-disk artefacts.

If `$ARGUMENTS` contains `--apply`, after the drift report ask the operator to confirm, then overwrite the drifted artefacts with the freshly rendered output and re-emit `report-shadow-status.sh` if applicable. Without `--apply`, this is a read-only drift report.

Use the subagent specifically — the raw YAML diffs do not belong in the main conversation. The drift summary it returns is what we want here.
