# SCM Provider: log-only

A non-executing implementation of the `scm.*` namespace. Every function
logs its call — function name and parameters — to a log file, then
returns a plausible mock response so the calling capability proceeds
normally.

This provider is used for **dry-run testing** of M capabilities: you
can run any capability that uses `scm.*` without touching a real SCM
platform. Useful for:

- Validating capability logic (e.g. decompose-story) without side effects
- Exercising the structural-story path without creating real repos
- Regression-comparing capability traces across changes

Select it by setting `providers.scm: log-only` in `project.yaml`, run
the capability, then revert to a real provider (e.g. `gitlab`) when done.

## Log file location

All `scm.*` calls are appended to a log file. Default path:

    .work/scm.log

This path is **relative to the project root** — the directory
containing the project's `project.yaml`. The `.work/` directory is a
conventional location for runtime artefacts produced by M capabilities
(traces, intermediate fixtures, debug snapshots). It is created
automatically on first use if it does not exist.

Override by setting the `M_LOG_FILE` environment variable before
running the capability.

Projects using this provider should add `.work/` to their `.gitignore`
so runtime traces do not pollute version control. (For our own dev
testing of M itself, the log file is created inside the test fixture's
project root and cleaned up after the test session — gitignoring is
optional in that case.)

**Append, do not overwrite.** Multiple capability runs accumulate in
the same file. Each capability run MUST begin by appending a session
header to the log file so entries from different runs can be told
apart:

    ═══════════════════════════════════════════════════════════════
    SESSION  <ISO-8601 timestamp>
    capability: <capability-name>
    story:     <story-id or "n/a">
    provider:  log-only
    ═══════════════════════════════════════════════════════════════

The header is written exactly once, at the start of the capability
run, before any `scm.*` calls. If a capability is re-run, a new header
marks the new session below the previous one.

Between sessions, the reader can easily `tail -f` the log while the
capability runs, or grep for a specific session timestamp to isolate
one run's trace.

## Output format

Every `scm.*` call appends one log block to the log file:

    [scm.<function_name>]
      <param_1>: <value>
      <param_2>: <value>
      ...
    → returns: <mock response, or "(nothing)">

The log is human-readable and greppable. Mock return values are stable
across runs (no randomness) so two runs of the same capability on the
same inputs produce byte-identical traces — making diff-based regression
testing trivial.

For calls with long parameter values (e.g. `files[]` in `push_files`),
log the structure but abbreviate content that would dominate the output:
show the file path in full, and truncate file content to the first
line plus `<N bytes total>`.

## Mock value conventions

Stable placeholders, recognisable at a glance:

| Category | Value |
|---|---|
| Group IDs | `99001`, `99002`, ... (incrementing per call) |
| Project IDs | `99101`, `99102`, ... (incrementing per call) |
| Commit SHAs | `deadbeef00000000000000000000000000000001` (incrementing) |
| Repo URLs | `https://log-only.local/<namespace>/<name>` |
| Branch refs | echo back the requested branch name |
| MR URLs | `https://log-only.local/<repo>/-/merge_requests/1` (incrementing) |
| Tokens | `log-only-mock-token-<n>` |
| Webhook IDs | `9001`, `9002`, ... (incrementing per call) |

The `log-only.local` domain is deliberate — a trace reader should be
able to spot instantly that these are mock values, not real URLs.

---

## scm.create_group

```
[scm.create_group]
  name: <name>
  path: <path>
  visibility: <visibility>
  description: <description>
  parent_id: <parent_id or "(none)">
→ returns: { id: 99001 }
```

---

## scm.resolve_group_id

```
[scm.resolve_group_id]
  group_path: <path>
→ returns: { id: 99001 }
```

If the same `group_path` is resolved twice in one capability run,
return the same ID — do not increment. The mock should be consistent
within a session.

---

## scm.resolve_project_id

```
[scm.resolve_project_id]
  project_path: <path>
→ returns: { id: 99101 }
```

Same consistency rule as `resolve_group_id`: same path → same ID
within a session.

---

## scm.create_repo

```
[scm.create_repo]
  name: <name>
  namespace_id: <namespace_id>
  initialize_with_readme: <bool>
→ returns: {
    id: 99101,
    web_url: "https://log-only.local/<namespace>/<name>",
    path_with_namespace: "<namespace>/<name>"
  }
```

The `<namespace>` in the URL should reflect the namespace_id's
resolved path if known from earlier calls in the same session; otherwise
use `mock-namespace`.

---

## scm.push_files

```
[scm.push_files]
  project_id: <project_id>
  branch: <branch>
  commit_message: <message>
  files:
    - <path_1> (<N bytes>)
    - <path_2> (<N bytes>)
    ...
→ returns: { commit_sha: "deadbeef00000000000000000000000000000001" }
```

For each file in the list, log the path and total content size in
bytes. Do NOT dump full file content to the log — it would drown
every trace in noise. If the reader needs to inspect specific file
contents, the capability can write them to a sibling directory
(e.g. `/tmp/m-scm-log-only-artefacts/<session-timestamp>/<path>`)
so they are available out-of-band without polluting the trace.

---

## scm.create_or_update_file

```
[scm.create_or_update_file]
  project_id: <project_id>
  branch: <branch>
  file_path: <path>
  content: <first line, truncated> (<N bytes total>)
  commit_message: <message>
→ returns: { commit_sha: "deadbeef00000000000000000000000000000002" }
```

---

## scm.protect_branch

```
[scm.protect_branch]
  project_id: <project_id>
  branch: <branch>
  push: <push_policy>
  merge: <merge_policy>
  force_push: <bool>
→ returns: (nothing)
```

The real gitlab provider does unprotect-then-protect internally.
The log-only provider does not need to mimic this — one call, one
log entry.

---

## scm.create_access_token

```
[scm.create_access_token]
  project_id: <project_id>
  name: <name>
  scopes: [<scope_1>, <scope_2>, ...]
  access_level: <level>
  expires_at: <date>
→ returns: { token: "log-only-mock-token-1" }
```

Token values increment per call within a session so traces can
distinguish between multiple token creations.

---

## scm.create_pipeline_trigger

```
[scm.create_pipeline_trigger]
  project_id: <project_id>
  description: <description>
→ returns: { token: "log-only-trigger-token-1" }
```

---

## scm.create_webhook

```
[scm.create_webhook]
  project_id: <project_id>
  url: <webhook_url>
  events:
    merge_requests_events: <bool>
    push_events: <bool>
    pipeline_events: <bool or "(not set)">
  enable_ssl_verification: <bool>
→ returns: { id: 9001 }
```

Log all event flags explicitly, including any that were not set —
the whole point of the log provider is to catch mistakes like
leaving `push_events` at its default true value.

---

## scm.store_ci_secret

```
[scm.store_ci_secret]
  project_id: <project_id>
  key: <key>
  value: <masked>
  protected: <bool>
  masked: <bool>
→ returns: (nothing)
```

**Never log the secret value**, even though this is a mock provider.
Log the literal string `<masked>` in the value slot. Callers may
accidentally pass real tokens when testing provider swaps — do not
capture them.

---

## scm.post_commit_status

```
[scm.post_commit_status]
  project_id: <project_id>
  sha: <commit_sha>
  state: <state>
  name: <name>
  description: <description>
  target_url: <url>
→ returns: (nothing)
```

---

## scm.create_branch

```
[scm.create_branch]
  project_id: <project_id>
  branch: <branch>
  ref: <source_ref>
→ returns: { branch: "<branch>", web_url: "https://log-only.local/<project>/-/tree/<branch>" }
```

Echo the requested branch name back. No validation of whether the
ref exists — the log-only provider trusts the caller.

---

## scm.create_merge_request

```
[scm.create_merge_request]
  project_id: <project_id>
  source_branch: <source_branch>
  target_branch: <target_branch>
  title: <title>
  description: <first line, truncated>
  remove_source_branch: <bool or "(not set)">
→ returns: {
    iid: 1,
    web_url: "https://log-only.local/<project>/-/merge_requests/1",
    source_branch: "<source_branch>",
    target_branch: "<target_branch>"
  }
```

MR IIDs increment per call within a session. If multiple MRs are
raised during one capability run (e.g. scaffold + integration gate),
the trace distinguishes them.

---

## Limitations

This provider does **not** simulate any read-side of the SCM:

- It cannot answer "does branch X exist", "what's in file Y on main",
  or "list open MRs" — because it has no state.
- Capabilities that depend on reading real SCM state (e.g. checking
  whether a file already exists before creating it) will not work
  correctly under log-only. They will see mock responses that may
  not reflect reality.
- For decompose-story specifically, this is fine — the capability
  writes more than it reads, and its only read (existing project.yaml)
  comes from the local filesystem, not from SCM.

If future capabilities need read simulation, this provider can be
extended with a small in-memory state store, or a second provider
(`scm/fixture`) can be added that plays back pre-recorded responses.
For now, log-only is write-only and trusts the caller.

## When to use log-only

- **Capability logic testing** — validate that a capability produces
  the right `scm.*` calls in the right order with the right parameters
- **Dry-run of destructive operations** — preview what a capability
  would do before running it for real
- **Trace-based regression testing** — capture a known-good trace,
  diff against future traces to catch unintended changes
- **Learning / documentation** — new contributors can run a capability
  under log-only and see the full sequence of SCM operations without
  needing platform credentials

## When NOT to use log-only

- **Real end-to-end validation** — use the real provider (e.g. `gitlab`)
- **Any capability that reads from SCM state** — log-only has no state
- **Performance testing** — log-only is instant, real providers are not
