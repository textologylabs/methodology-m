# ADR-0001 — Version pinning model: frozen `.m/` per repo

- **Status:** Accepted
- **Date:** 2026-05-26
- **Tags:** m2, m2.10, install-paths, version-pinning, cli
- **Ticket:** [M2.10 — user-scope M install for agent containers + version-pin model](https://app.clickup.com/t/869d6ru73)

## Context

M's CLI today installs only at project scope. `m init` copies the
canonical `.m/` tree into the repo, writes `.m-version`, and emits
`.claude/skills/` wrappers pointing at `./.m/capabilities/...`. The
in-repo `.m/` directory IS the version lockfile — a project
bootstrapped under M v1.0 keeps being operated with v1.0 capabilities,
renderer, and schemas until a deliberate `m update`.

M2.10 introduces a user-scope install (`m init --user`) to unblock
the Outpost cold-start case: an agent told "build a new app" has no
project yet and can't read M from a not-yet-existent repo. With
user-scope M on the table, a forking question surfaces: once M lives
at `~/.m/`, do projects still carry their own pinned `.m/`, or does
the pin move to a `m-version:` field that the agent resolves against
a user-scope multi-version store?

This decision shapes M's distribution model going forward.

## Options considered

- **A — keep frozen `.m/` per repo.** The user-scope install is
  purely additive — `~/.m/` exists for cold-start only. Project
  `m init` still copies `.m/` into the repo. Repos remain
  self-contained: a clone on a CI runner, a contractor laptop, or a
  forensic checkout six months from now operates without a registry,
  without network, without resolving a pin against any external
  store. `.m/` *is* the contract.

- **B — `project.yaml` gains an `m-version:` field; the resolver
  fetches.** The repo carries no `.m/`. The agent reads
  `m-version: 1.0.0` from `project.yaml`, resolves it against a
  user-scope multi-version store (`~/.m-versions/1.0.0/`), fetching
  from npm if absent. Mental model: `m-version: 1.0.0` ≈
  `"methodology-m": "1.0.0"` in `package.json`. Closer real-world
  analogue: `nvm` switching Node versions per project. Lighter
  repos, explicit pin; needs a multi-version store + cache GC +
  offline UX + version-not-found handling — a new subsystem.

## Decision

**A — frozen `.m/` per repo.**

The initial lean during M2.10 design was toward B (the "M is a
runtime, not a copy" model — `package.json`-style metadata + npm
resolution). The Plan agent's M2.10 design pass refuted it, and the
argument that landed was the **subsystem cost asymmetry**:

- A requires building one new CLI flag (`m init --user`) and a
  `{{M_ROOT}}` substitution in skill templates.
- B requires building a multi-version store, a fetch/resolution
  layer, cache GC, offline behaviour, "version not found" UX, and a
  navigation mechanism (`m use <version>` or auto-resolve). That's a
  whole new piece of M that has to exist forever.

The "lighter repos" argument B leans on is mathematically true but
practically irrelevant at M's payload size — `.m/` is ~200KB of
markdown plus schemas. 500 projects × 200KB = 100MB across a fleet.
That's nothing on modern disk, and it buys self-containment.

The deeper reason: **the single most important invariant M sells is
that a repo, taken in isolation, is operable.** B breaks that. A
clone on a CI runner reading `.m/schemas/pat.schema.json` straight off
disk works under A and works without ceremony. Under B, the same case
needs `npm i -g methodology-m@1.0.0` and a network round-trip — or a
separate `m-version-lock` mechanism for offline CI. Real engineering
cost to solve a problem A doesn't have.

The dissenting view (B's case) is worth recording fairly. If M's
canonical layer were multi-megabyte territory, or fast-moving enough
that vendoring became painful (weekly minor releases, monthly major
bumps), or if hot-patching specific capabilities per-project ("v1.0
except `decompose-story` from v1.0-fix1") were a real requirement —
any of those would tip toward B. None apply today. If one tips later,
reopen this ADR.

## Consequences

**Enabled by A:**
- M2.10's user-scope install is purely additive. No subsystem to
  build; one CLI flag plus a template substitution.
- Repos stay auditable for years without registry dependency.
- CI runners need no special M setup beyond what `.m/` in the
  checkout provides.

**Costs accepted under A:**
- Per-repo M payload (~200KB) duplicated across the fleet. Stipulated
  as not worth optimising.
- `m update` is per-project, not auto-resolving on-the-fly. Bumping
  M across a fleet is a sweep, not a flag flip. Mitigation: ship
  `m update --check` and an `m update --auto-pr` mode alongside
  M2.10 or shortly after, so fleet upgrades are tractable.

**Locked out of (until reopened):**
- A native multi-version world where `~/.m-versions/` is a shared
  cache. If we want that, ADR-NNNN will supersede this one.

**A → B migration path preserved.** A and B aren't mutually exclusive
at the data layer — a repo with `.m/` *and* `m-version:` in
`project.yaml` is unambiguous (`.m/` wins). To keep B reachable
later, M2.10's implementation must:

1. Treat the version pin as a first-class concept, not an artifact
   of `.m/` happening to exist. Today the pin is `.m-version` at
   repo root; the contract should be stated explicitly in
   `.m/m.md` ("the pin is `m-version`, manifested as `.m-version` +
   `.m/` today").
2. Load user-scope `~/.m/` symmetrically with project `.m/` — same
   semantics, different root. The resolution machinery this produces
   generalises directly to B's multi-version store if reopened.
3. Phrase agent steering as "M's canonical layer is referenced by
   the project's pin" — tense-neutral, works under A today and B
   tomorrow.
4. Reserve `m-version:` as a future-reserved key in
   `project.schema.json`, even unused under A. Validate that if both
   exist, they agree.

If we ever do reopen this, the migration is additive: build the
resolver, add `m init --resolver` for new projects, ship an
`m migrate-to-resolver` tool for existing repos that want to convert.
Existing A repos keep working unchanged.
