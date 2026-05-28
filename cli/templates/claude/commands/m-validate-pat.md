---
description: Validate a PAT.yaml file (story or sub-task) against M's canonical JSON Schema. Pass a file path or glob; defaults to ./pats/*.pat.yaml.
---

Validate the PAT.yaml file(s) at `$ARGUMENTS` against the canonical M JSON Schema at `{{M_ROOT}}/schemas/pat.schema.json`.

If `$ARGUMENTS` is empty, validate every `*.pat.yaml` under `./pats/` (the M convention for the per-repo PAT directory).

Use the `pat-validator` subagent so the validation runs in an isolated context — the raw JSON Schema is noisy and does not belong in the main conversation.

Report each file's pass/fail status with violations and concrete fix suggestions. Do not modify any file.
