# Architecture Decision Records

This directory holds Methodology M's **Architecture Decision Records
(ADRs)** — short, durable notes capturing the *why* behind
non-obvious design choices made about M itself.

Most code carries enough comments to explain *what* it does. Few
codebases carry the reasoning behind *why* an approach was picked
over its alternatives. ADRs are where that lives, so a future
contributor (human or agent) re-litigating the same fork can find the
prior reasoning before re-deriving it.

## When to write an ADR

- A design fork where the "obvious" answer wasn't actually obvious.
- A decision that took >15 minutes of back-and-forth to land.
- Anything a future reader would want to understand the *why* of,
  not just the *what*.

Roughly: 1-3 ADRs per release. If you're writing more, the bar is
too low; if zero, you're probably not capturing real decisions.

## What an ADR is *not*

- Not a SKILL — those describe capabilities in `.m/capabilities/`.
- Not a plan — those live in `docs/plans/` (or, increasingly,
  ClickUp).
- Not a release note — those live in `CHANGELOG.md`.
- Not the methodology itself — `methodology-m.md` is the paper.

An ADR records a single decision: the fork, the options, the choice,
the consequences.

## Location and numbering

- Path: `docs/adr/NNNN-short-kebab-title.md`
- Numbering is zero-padded four digits, sequential, never reused
  (`0001`, `0002`, ...). Room for thousands.
- Filename slug describes the *topic*, not the *outcome*
  (`0001-version-pinning-model.md`, not
  `0001-keep-frozen-m-dir.md`) — the decision can change; the topic
  doesn't.

## Format

Use [`template.md`](./template.md) as a starting point. Five sections:

1. **Status** — Proposed / Accepted / Superseded by ADR-NNNN
2. **Context** — what situation demanded a choice
3. **Options considered** — at least two; the rejected ones get a
   fair description
4. **Decision** — which option and the honest reasoning, including
   the dissenting view if there was one
5. **Consequences** — what this now enables, costs, or locks out

Keep it slim. 100-300 lines is typical. If yours is much longer,
either the decision was actually multiple decisions (split it), or
context is doing the work the rest of the repo's docs should be
doing.

## Status lifecycle

- **Proposed** — drafted, under discussion, not yet acted on.
- **Accepted** — landed, in effect.
- **Superseded by ADR-NNNN** — replaced by a later decision. The
  superseded ADR stays in the index (history, not deletion).

An ADR isn't edited after it's Accepted — it's superseded. The
record of *what we thought at the time* is part of its value.

## Index

| # | Status | Title |
|---|--------|-------|
| [0001](./0001-version-pinning-model.md) | Accepted | Version pinning model — frozen `.m/` per repo |
