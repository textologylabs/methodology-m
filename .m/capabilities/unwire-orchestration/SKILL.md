# unwire-orchestration

**Capability:** Decommission a managed repo from the root repo's orchestration layer

## What it does

The inverse of `wire-orchestration`, scoped to **one** managed repo
that is leaving the topology. When a component is removed (REMOVE) or
folded back into the root repo (TYPE-CHANGE `referenced → embedded`),
its managed repo stops being a constituent of the project — but the
orchestration plumbing `wire-orchestration` installed for it does not
clean itself up. This capability removes that plumbing: the MR
webhook on the managed repo, and the CI variables that referenced it.

After this capability runs, the managed repo no longer triggers
shadow integration and no stale tokens for it remain on the root
repo. The repo itself is **not** deleted — that is a user decision,
exactly as for REMOVE (`decompose-story/SKILL.md` S-1).

## When it runs

- **REMOVE** — after the REMOVE story merges, to tidy the orphaned
  managed repo (I-061). The source-repo guard in
  `detect-story-trigger.sh` already makes an orphan webhook fire
  harmlessly; unwire-orchestration removes it outright so no stray
  pipeline triggers happen at all.
- **TYPE-CHANGE `referenced → embedded`** — invoked by
  `embed-component` once the component's code has been lifted into
  the root repo, before `decompose-story` Phase B flips
  `components[].type` to `embedded`.

## Parameters

| Parameter       | Type   | Required | Description                                                       |
|-----------------|--------|----------|-------------------------------------------------------------------|
| component       | string | Yes      | Name of the component whose managed repo is being decommissioned   |
| project-yaml    | path   | Yes      | Path to the root repo's project.yaml (group / project identity)    |
| root-project-id | string | No       | SCM project ID or path for the root repo (derived if omitted)      |
| archive-repo    | bool   | No       | Archive the managed repo after un-wiring (default: false)          |

The component may already be absent from `project.yaml`'s
`components:` list (REMOVE deletes it; TYPE-CHANGE flips it). The
managed repo path is therefore derived by **convention**, not by
reading the component entry: `<group>/<project>-<component>` — the
same derivation `wire-orchestration` Step 3 uses.

## Execution

### Step 1 — Resolve identities

Read project.yaml. Extract the group path (`group:`) and project name
(`project:`). Resolve:

```
root_id     = root-project-id, or scm.resolve_project_id(<group>/<project>-root)
managed_path = <group>/<project>-<component>
managed_id   = scm.resolve_project_id(managed_path)
```

If the managed repo no longer exists (the user already deleted it),
Steps 2 and 4 are no-ops — log and continue. The capability is
idempotent: un-wiring an already-un-wired repo is not an error.

### Step 2 — Remove the MR webhook from the managed repo

`wire-orchestration` Step 3 installed one MR-events webhook on the
managed repo, pointing at the root repo's pipeline-trigger endpoint.
Remove it:

```
for hook in scm.list_webhooks(repo: <managed-repo>):
  if hook.url contains "/projects/<root-id>/" and "/trigger/pipeline":
    scm.delete_webhook(repo: <managed-repo>, hook_id: hook.id)
```

Match on the trigger-endpoint URL so an unrelated webhook a project
added by hand is left alone. If no matching webhook is found, log and
continue — idempotent.

### Step 3 — Remove the managed repo's CI variables from the root repo

`wire-orchestration` Step 4 stored the managed repo's
merge-transaction token on the **root** repo as
`M_TOKEN_<COMPONENT_NAME_UPPER>`. Delete it — it is now a dangling
secret for a repo that is no longer a constituent:

```
scm.delete_ci_variable(repo: <root-repo>, key: "M_TOKEN_<COMPONENT_UPPER>")
```

Use the same name normalisation `wire-orchestration` used
(`api-read` → `M_TOKEN_API_READ`).

**Do NOT touch:**
- `M_GROUP_TOKEN` — shared by the whole shadow pipeline.
- The `m-shadow-integration-trigger` pipeline-trigger token — created
  once by `wire-orchestration` Step 2 and shared by **every** managed
  repo's webhook. Deleting it would break every other repo. unwire
  removes one repo's *use* of the trigger (Step 2), never the trigger
  itself.

### Step 4 — Remove the managed repo's own CI variables

If the managed repo is being kept (the default — see Step 5), strip
the CI variables `wire-orchestration` Step 4 / `scaffold-repo` set on
it, so a kept-but-detached repo carries no stale orchestration state:

```
scm.delete_ci_variable(repo: <managed-repo>, key: "M_TRIGGER_TOKEN")
scm.delete_ci_variable(repo: <managed-repo>, key: "ROOT_PROJECT_ID")
scm.delete_ci_variable(repo: <managed-repo>, key: "M_PROJECT_TAG_TOKEN")
```

Each delete is idempotent — a missing variable is not an error. If
the managed repo is being archived or the user intends to delete it,
this step is cosmetic and may be skipped.

Optionally revoke the repo's `m-merge-transaction` project access
token (created by `scaffold-repo` / `extract-component`) for the same
hygiene reason. On free-tier GitLab there is no project token to
revoke — the group PAT is shared and must stay.

### Step 5 — Repo disposition

unwire-orchestration does **not delete the managed repo.** M's view
of the project is `project.yaml`; once the component is gone from it,
M no longer cares whether the GitLab repo exists. Deleting it is a
user decision (the REMOVE precedent — `decompose-story/SKILL.md` S-1).

If `archive-repo` is set, archive the repo so it drops out of the
group's active list while its history is preserved:

```
scm.update_project_settings(repo: <managed-repo>, archived: true)
```

Archiving is reversible and is the recommended middle ground —
preserve the history, stop the noise. Leave it to the agent to
surface the choice to the user.

### Step 6 — Report

Output:
- Managed repo path + whether it still exists
- Webhook removed / not found
- Root-repo CI variable removed (`M_TOKEN_<COMPONENT_UPPER>`)
- Managed-repo CI variables removed (or skipped)
- Repo disposition (kept / archived)
- Reminder: the root repo's topology artefacts
  (`report-shadow-status.sh`, `.gitlab-ci.yml`) are re-rendered by
  `render-topology-artefacts` from the mutated `project.yaml` — they
  drop the component from the repo list automatically. unwire does
  not edit them.

## Notes

- This capability is **idempotent** — running it again on an
  already-un-wired (or already-deleted) repo reports no-ops, not
  errors.
- unwire-orchestration touches orchestration plumbing only. The
  `project.yaml` mutation and the topology re-render stay owned by
  `decompose-story` + `render-topology-artefacts`. This capability
  never edits `project.yaml`.
- It does not modify the root repo's `.gitlab-ci.yml` structure — the
  shadow pipeline derives its repo list dynamically from
  `project.yaml` (`wire-orchestration` SKILL, "Repo Lists Must
  Include Root"), so removing a component from `project.yaml` is
  enough; no CI edit is needed.
- The shared pipeline-trigger token and `M_GROUP_TOKEN` are
  topology-wide and are never removed by this capability — only the
  per-repo `M_TOKEN_*` secret and the managed repo's own variables.
- `unwire-orchestration` does NOT delete the managed repo — see
  Step 5.
