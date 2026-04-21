# Methodology M — Product Roadmap

Forward-looking phased plan toward **v1.0.0 — the MVP**. The point at
which M closes its delivery loop well enough to run a real multi-repo
project end to end, after which further improvement is driven by
real-use experience rather than foreseen work.

This document is a different artefact from
[`improvements-and-ideas.md`](improvements-and-ideas.md). The backlog
is the catalogue of improvement items organised in tiers. The roadmap
curates from that catalogue into a sequenced path toward v1.0, with
an explicit MVP gate and a post-MVP posture.

It also **supersedes the forward-looking section of the 2026-04-18
hemingway bridge** (`.claude/hemingway-bridge.md`). The bridge
captured a post-v0.5.1 direction built around I-047 as the immediate
next move; this roadmap explicitly defers I-047 out of MVP and changes
the Tier 2 order on the grounds outlined below.

## Current state

- **v0.5.1 shipped** (2026-04-18) — renderer-to-code (I-049 scoped),
  `scm.push_or_update_files` (I-051), e2e harness seed (I-050 thin).
- Architectural principle pinned: **deterministic → code, interpretive
  → SKILL.** Renderer and its providers are now executable modules
  co-located with thin SKILL contracts.
- Main branch clean. No in-flight work on M since the v0.5.1 release.

## The MVP threshold

For M to be usable on a real multi-repo project without constant
hand-holding, five things must be true that aren't today:

1. **Sub-task PAT authoring actually works.** Currently a lifecycle
   gap: decompose-story runs before generate-pats has the parent in
   scope, so PATs for sub-tasks cannot be authored cleanly.
2. **Non-story MRs don't break the loop.** Today every MR triggers
   AOT integration; hotfixes, infra tweaks, dependency bumps fail
   immediately. Any real project hits this in the first week.
3. **PAT yaml is the single source of truth for story assertions.**
   Today it's Cypress-shaped only; structural and backend-only
   stories lean on a workaround aliveness probe outside the PAT
   system. Real projects will mix browser and non-browser stories
   on day one.
4. **The project shape can evolve.** Adding, removing, or renaming
   a component mid-project is undefined. A project restart is the
   current workaround — unacceptable for anything past day one.
5. **The post-merge loop closes.** Today merging a story MR leaves
   tagging, version bumps, and topology-level reconciliation as
   manual steps. The cadence of real use would drown in this.

These five define v1.0. Everything else is post-MVP polish.

## Phased plan

Each phase is one backlog item, shipped as one minor release. No
bundling — the discipline of "one item per minor" keeps scope honest
and gives five natural gut-checks before the MVP tag.

### v0.6.0 — I-042: reshuffle decompose-story / generate-pats + extract compile-story-pats

**Goal:** sub-task PATs can be authored with the parent story in
scope, and CAT compilation is provider-based.

Reorder the story lifecycle so decompose-story runs first and
generate-pats second, with the decomposition output visible as
context. Removes the need for markdown PAT stubs as a workaround.
Extract the current Step 4 of decompose-story (compile story PAT +
raise root MR) into a new capability `compile-story-pats` backed by
a new `test.cat.*` provider namespace. Ship two reference providers:
`cypress` (lifts the existing mapping verbatim) and `log-only`
(trace stub, matches the v0.5.1 pattern).

**Selected from Tier 2.** First because:

- Smallest of the four by scope, even after the provider extraction.
- Unblocks I-040 — topology structural stories often have sub-tasks
  whose PATs would land in the lifecycle gap this fixes.
- Lays the provider plumbing that I-045 (v0.8.0) plugs into without
  touching `compile-story-pats` itself.

**Exit criterion:** a story with two sub-tasks can have one PAT per
sub-task generated into its yaml (parent in scope), and the story
PAT compiles to a root MR via `test.cat.cypress` with byte-identical
output to the pre-extraction implementation.

---

### v0.7.0 — I-030: standalone and follow-up MRs

**Goal:** non-story MRs don't trigger AOT.

Distinguish story MRs (have a branch name and/or labels that tie them
to a story issue) from standalone MRs (hotfix, dependency bump, infra
tweak, follow-up). Skip AOT integration for standalone MRs; they
merge on their own CI only.

**Selected from Tier 2.** Second because:

- Immediate real-use relief — you hit this on day one of any real
  project.
- Isolated from other MVP items (doesn't depend on or block them).
- Small (1–2 days).

**Exit criterion:** an MR without a story branch naming convention
can be raised, pass CI, and merge without the AOT pipeline blocking
on missing story context.

---

### v0.8.0 — I-045: multi-framework PAT yaml

**Goal:** PAT yaml can articulate non-browser assertions natively.

Extend `pat.schema.json` with step types beyond the current Cypress
shape (`http: GET /endpoint`, `expect-status: 200`,
`expect-body-contains: <string>`, `compose-service: <name>`). Add
matching `test.cat.*` providers (`curl`, `supertest`) so
`compile-story-pats` chooses the right framework from the step
types in the PAT. Mixed PATs (browser + HTTP) compile to
multi-framework output.

**Pulled into MVP from the deferred list (2026-04-21).** Reason:
structural stories (ADD/REMOVE/RENAME under I-040) have no
user-facing assertion — the natural check is "does the new component
respond at /health?", unexpressible in PAT yaml today. The current
workaround is the curl-based aliveness probe in
`scripts/integration-test.sh`, which keeps PAT yaml from being the
single source of truth for story assertions. Landing I-045 **before**
I-040 collapses the structural CAT-compilation path into the standard
PAT compilation flow — cleaner implementation of I-040 and no more
workaround.

**Exit criterion:** a structural ADD story compiles to an HTTP
health-check CAT via `test.cat.curl` (or `supertest`) and runs
successfully in the integration-gate MR, without relying on the
standalone aliveness probe in `integration-test.sh`.

---

### v0.9.0 — I-040: topology changes (add/remove/rename components)

**Goal:** a project's component set can evolve mid-project.

Define structural-story types for ADD, REMOVE, RENAME (and possibly
MERGE/SPLIT). Each runs through decompose-story → generate-pats →
compile-story-pats → AOT as normal, with the renderer regenerating
topology artefacts deterministically from the new `project.yaml`.
The renderer being real code (shipped in v0.5.1) and the
`test.cat.*` providers for HTTP assertions (shipped in v0.8.0) are
what make this tractable.

**Selected from Tier 2.** Benefits from the three prior phases:

- Sub-task PATs land cleanly on structural stories (I-042).
- Multi-framework PAT compilation retires the integration-test.sh
  aliveness-probe workaround (I-045).
- Depends on v0.5.1's renderer (done) and `push_or_update_files`
  (done).
- Without it, projects are born frozen.

**Exit criterion:** an ADD story (new component), a REMOVE story, and
a RENAME story each run through the full decomposition + AOT loop
against a real project, with topology artefacts regenerating
byte-correctly and structural assertions compiled through the
standard CAT provider path.

---

### v0.10.0 — I-004 remaining: post-merge lifecycle

**Goal:** merging a story MR auto-completes the transactional tail.

After a story MR merges: auto-tag the release per M's tagging
convention, bump version, commit the bump, update CHANGELOG in the
root repo. Triggered by the merge event on managed repos + root.

**Selected from Tier 2.** Last because:

- Large (3–5 days).
- Sits on top of a stable pre-merge flow — if the earlier items are
  shaky, post-merge automation multiplies the pain.
- Closes the "other half" of the M promise (the first half — shadow
  status visible on MRs — was closed in earlier work).

**Exit criterion:** a green story MR merging triggers tag + bump +
changelog commit without manual intervention, on both a managed repo
and the root repo it's part of.

---

### v1.0.0 — MVP tag

No new features. Half-day of:

- Docs pass — update `methodology.md`, CHANGELOG, SKILL contracts
  that reference MVP behaviour.
- e2e harness run across the five MVP scenarios (I-042 + I-030 +
  I-045 + I-040 + I-004). Passing harness is the gate.
- Tag on main, `npm publish`, GitHub Release with the assembled
  v0.6–v0.10 changes presented as the v1.0 capability baseline.

**Exit criterion (MVP go-live):** M v1.0 installed from npm runs
through a realistic end-to-end scenario on a real project — a story
decomposed, PATs authored, structural change applied, merged, tagged,
bumped — without Methodology M itself being the bottleneck.

---

## Out of MVP scope — explicitly deferred

Not because they're unimportant. Because the MVP question is "can
this be used for real?", and the items below are about improving
something that already works, not about closing a gap that blocks
real use.

| Item | Reason to defer |
|---|---|
| **I-047** (project.yaml AI-gen from Story Zero) | Hand-authoring `project.yaml` is fine at MVP volume. Ergonomics improvement. |
| **I-049 full** (migrate remaining deterministic units to code) | PAT→CAT compilation, schema validation, scm/* pure-dispatch — all work today as SKILLs. Architectural cleanup, not loop closure. |
| **I-041** (pessimistic invalidation on pipeline start) | Tightens the gate; loose gate still functions. |
| **I-050 full harness** | v0.5.1's thin seed defends the renderer + push lifecycle. Full harness is post-MVP protection work. |
| **I-009 test/deploy plugin dimensions** | Pull-driven — add when a real project demands a test stack or deploy target M doesn't cover. Note: the `test.cat.*` namespace introduced in v0.6.0 and extended in v0.8.0 is a partial down-payment on this. |
| **I-052** (`m init --user`) | Only MVP-critical if Outpost M-injection (Phase D) runs concurrently. Captain 2026-04-20: Phase D is post-M-MVP. I-052 follows it. |
| **I-016** (methodology paper overhaul) | Post real use — the paper should reflect truth, not plan. |
| **Tier 4 items** | Polish. Not MVP. |

## Cross-repo coordination

### Outpost

**Outpost Phase D (M injection into agents, backlog #56) is gated on
M v1.0.** Do not plan Phase D work until M is tagged v1.0.

Outpost Phases A, B, C can run concurrently with M v0.6–v0.10
(interleaved, not same-day parallel — context switching between the
two codebases has real cost). Outpost's own roadmap in
`../outpost/docs/roadmap.md` reflects this gate.

### Dependencies flowing back

Nothing else in M v1.0 scope depends on Outpost. The coordination is
entirely one-way: Outpost waits for M.

## Rough sizing

| Phase | Item | Estimate |
|---|---|---|
| v0.6.0 | I-042 + compile-story-pats extraction + `test.cat.*` providers | 3–4 days |
| v0.7.0 | I-030 | 1–2 days |
| v0.8.0 | I-045 | 2–3 days |
| v0.9.0 | I-040 | 3–5 days |
| v0.10.0 | I-004 | 3–5 days |
| v1.0.0 | MVP tag | 0.5 day |
| **Total critical path** | | **~12.5–19.5 focused days** |

Calendar, with Outpost A/B interleaved in the same window: **~3.5–4 weeks**.

## Non-goals for v1.0

Explicit about what MVP does NOT include:

- **No AI-generated `project.yaml`.** Hand-auth only at MVP.
- **No full deterministic migration.** Only the renderer (shipped) is
  code; other units stay as SKILLs.
- **No org-level template catalogue.** One project type works; org
  config waits for the second project that demands it.
- **No paper/academic write-up.** Ship first, write later.

## Post-MVP posture

Once v1.0 is running on a real project, the feedback loop changes:

- **Real gaps surface via real stories.** Missing plugin dimensions,
  unhandled MR patterns, authoring friction — each becomes a
  backlog item prioritised by pain frequency, not by theoretical
  value.
- **I-049 full continues incrementally.** One capability at a time,
  as touching adjacent code makes the determinism migration
  opportunistic rather than upfront.
- **I-052 and Outpost Phase D** land together as their own arc.
- **The methodology paper (I-016)** gets written after one or two
  real delivery cycles, so it captures truth.

Same pattern Outpost adopted: v1.0 is the first real release, and
the process for improvement emerges from using it.

## Relationship to the backlog

[`improvements-and-ideas.md`](improvements-and-ideas.md) remains the
source of truth for *what* each item is. This roadmap is the source of
truth for *when* and *in what order* they move toward v1.0. When items
close, tick them in the backlog; when the roadmap shifts, update the
phases here.

Keep the two in sync deliberately — they have different jobs.
