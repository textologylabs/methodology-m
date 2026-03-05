---
inclusion: auto
---

# Hemingway Bridge

End-of-day context snapshot. One command, one file, one purpose.

## Command

`bridge` — User types this to trigger an end-of-day snapshot.

## Behaviour

When the user says `bridge`:

1. Write (overwrite) `.kiro/hemingway.md` with the current state
2. The file is a complete snapshot — a reader with no conversation
   history should be able to pick up exactly where we left off
3. Say "Bridge written. See you tomorrow, Cooper." (or similar)

## File Format

```
# Hemingway Bridge — [Date]

## Where We Are
[What was accomplished today. Brief, factual.]

## What's Next
[The very next concrete action. Not vague. Not a list of possibilities.
One thing, clearly stated, so tomorrow-me can start immediately.]

## Open Questions
[Anything unresolved that needs a decision before proceeding.
Empty if nothing pending.]

## Working State
[What exists on GitLab, what's uncommitted locally, what's in flight.
Enough to reconstruct the environment without reading every file.]
```

## Rules

- The file is overwritten each time, never appended to
- Written while context is warm — that's the whole point
- Lives at `.kiro/hemingway.md` (not in drills — it's not a drill)
- Add to `.gitignore` — it's personal working state, not project artefact
- On session start: if `.kiro/hemingway.md` exists, read it first
  before doing anything else. It's the previous session's handoff.
