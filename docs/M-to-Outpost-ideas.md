# M → Outpost adoption — ideas

Captured thinking from the v1.0.0 release conversation
(2026-05-18). Not a spec — a working doc to inform the Outpost-side
integration once the M-side enabling work (M2.10) ships.

## Status

- **M side (this repo) — gated on M2.10** (ClickUp
  [869d6ru73](https://app.clickup.com/t/869d6ru73)). Delivers
  `m init --user`, scope-aware wrappers, and the version-pin model
  decision. Until that lands, the Outpost work below has no clean
  install surface to consume.
- **Outpost side — gated on M2.10 landing.** Tracked on the Outpost
  board as **#56 / M3.1** ("M methodology injection"). This document
  is M's view of what that ticket actually entails on the Outpost
  side.

## The mental model — three layers of agent knowledge

When an Outpost agent runs an M-managed project, the knowledge it
acts on comes from three distinct layers. They must stay separated.

| Layer | Where it lives | What it teaches |
|---|---|---|
| **M method** | `~/.claude/skills/`, `~/.claude/steering/` (injected by `m init --user`) | *What* M's capabilities are and how the M lifecycle composes them. |
| **Outpost orchestration** | `~/.claude/steering/outpost-*.md`, baked into the agent container image | *How Outpost uses M* — when to invoke which capability, role boundaries, dispatch conventions. |
| **Per-dispatch brief** | The task payload Outpost sends with each job | *This specific task* — story / sub-task IDs, repo, parent, ACs. |

M's steering can't carry Outpost-specific orchestration — M stays
provider-agnostic so other orchestrators (Kiro, or whatever comes
next) can adopt it with their own layer 2.

## The role taxonomy

Outpost runs agents in named roles — **SM, Dev, QA, Rev**. M didn't
design for roles, but its capabilities cluster along the same
lifecycle these roles map to, so role-to-capability assignment is
natural rather than forced.

| Outpost role | Owns | Doesn't touch |
|---|---|---|
| **SM** (Scrum Master) | `decompose-story`, `generate-pats`, `compile-story-pats`, the merge-transaction lifecycle | implementation, repo-level test compilation |
| **Dev** | sub-task PATs → code; sub-task MR; `generate-acceptance-tests` in their managed repo | `decompose-story`, `scaffold-repo`, cross-repo concerns |
| **QA** | `generate-acceptance-tests` at story level, PAT→CAT correspondence end-to-end, the gate MR's integration CAT | story decomposition, code authoring |
| **Rev** | reviews against PATs, the truth-preservation rule, the readiness tracker | rarely invokes M capabilities directly |

The discipline this enforces: Dev doesn't run `decompose-story`. SM
doesn't open code MRs. Without role steering, every agent has every
skill and boundaries are mood-based. With it, the boundaries are
steering-enforced.

## Suggested layer-2 structure

Four short per-role steering files at user-level on the agent
container:

- `~/.claude/steering/outpost-role-sm.md`
- `~/.claude/steering/outpost-role-dev.md`
- `~/.claude/steering/outpost-role-qa.md`
- `~/.claude/steering/outpost-role-rev.md`

Each ~50-150 lines: *"as `<role>`, here's your slice of M, here's
what you don't touch, here's how you hand off to the next role."*

Activation: the agent container build can either

- ship **all four** with `inclusion: manual` + a per-agent
  activator that loads the role-appropriate one, or
- ship **per-role container variants** with only that role's file
  baked in.

Outpost's call — depends on whether the fleet runs one image with
runtime role assignment or different images per role.

## What the Outpost-side ticket actually entails

When M2.10 ships and #56 / M3.1 picks up, the Outpost work is:

1. **Bake M into the agent container image** — `npm i -g
   methodology-m` + `m init --user` in the image build. Mechanical.
2. **Author the four role-steering files.** This is where #56
   earns its ticket — the orchestration glue that maps Outpost's
   role model onto M's capabilities. Bounded, but the
   substantive part.
3. **Wire the dispatch payload** — make sure per-task briefs
   carry the M context the role needs (story ID, sub-task ID,
   parent, repo, PATs).
4. **A smoke run** — Outpost dispatches an agent fleet to run one
   small M project end-to-end. The realistic M1.9-style scenario,
   from Outpost's side this time.

## Open questions for the Outpost side

- **Container variants vs runtime role activation.** Affects how
  the role steering is shipped. Both work; the choice is about
  fleet operations, not M correctness.
- **Per-dispatch brief schema.** What exactly does Outpost include
  in a task brief? M's lifecycle implies a minimum set (story ID,
  sub-task ID for Dev/QA, parent, repo, PATs path). Worth
  specifying.
- **Failure handoff between roles.** If a Dev's PAT compilation
  fails, who picks up — same agent or escalate to SM? M has no
  opinion; Outpost decides.
- **Version-pin handling in dispatch.** Once M2.10 settles the
  version-pin model (Option A: per-project `.m/` / Option B:
  `m-version:` field), the agent needs to know which M version to
  use for a given task. Likely an inferred property of the project
  Outpost is dispatching against.

## Cross-references

- **M2.10 — user-scope M install for agent containers + version-pin
  model**: ClickUp [869d6ru73](https://app.clickup.com/t/869d6ru73).
  The M-side blocker.
- **v1.0.0 changelog**: see `CHANGELOG.md` `[1.0.0]` section.
- **Methodology paper**: `methodology-m.md` (root) covers the M
  method itself.
