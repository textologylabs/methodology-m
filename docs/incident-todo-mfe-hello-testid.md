# Incident: Missing `data-testid="todo-mfe-hello"` in Hello Component

**When:** During Step 22 (story-level Cypress CAT compilation), workshop pass1
**Discovered by:** Story-level PAT validation against the composed system

---

## What Happened

The story-level PAT (`pats/TODOM-000.pat.yaml`) specifies:

```
- wait: "[data-testid='todo-mfe-hello']" is visible   (AC-002, AC-006)
```

The `Hello` component in `todo-m-mfe` was implemented without this testid:

```
// what was shipped
<div>
  <h1>Hello from todo-m-mfe</h1>
  <p data-testid="api-message">{message}</p>
</div>
```

The MFE MR (!3) passed CI because repo-level unit CATs (`TODOM-000b.spec.jsx`)
never asserted `todo-mfe-hello` — they only checked `api-message` and the h1 text.
The gap only surfaced when story-level Cypress tests ran against the composed system.

## Fix

Added `data-testid="todo-mfe-hello"` to the root div of `Hello.jsx`, and added
the corresponding assertion to the unit CAT. Committed to `feat/TODOM-000b-implement`
and pushed to update the open MR.

---

## Discussion Points

### 1. Is this a methodology gap or expected behaviour?

Arguably both. The repo-level CATs validated the component contract *as written* —
they just didn't cover the full story-level contract. The story-level PAT specified
`todo-mfe-hello` but that detail wasn't propagated down into the component-level CATs
when they were compiled.

This raises a question: **should `generate-acceptance-tests` at the component level
cross-reference the story-level PAT to ensure all referenced testids are covered?**

### 2. The MFE MR was open the whole time

The MFE MR (!3) has been sitting open, blocked by shadow integration (shell missing).
During that time, the story-level PAT gap existed but was invisible — there was no
composed system to run Cypress against. The gap only became visible in Stage 2.

This is an argument for: **story-level PAT review should happen before component
implementation begins**, not after. If the PAT had been reviewed against the component
spec at decomposition time, the `todo-mfe-hello` testid would have been in the
component's acceptance criteria from the start.

### 3. The fix was a patch to an open MR

The fix was committed to `feat/TODOM-000b-implement` — the same branch as the
original implementation. This is fine in practice but worth noting: the MR now
contains a fix commit that post-dates the original implementation. In a real team
workflow this would be visible in the MR diff and reviewable.

### 4. Workshop narrative value

This incident is actually a good workshop moment — it demonstrates:
- Repo-level CATs are necessary but not sufficient
- Story-level integration surfaces gaps that component isolation misses
- The methodology's two-layer testing (unit CATs + story-level Cypress) exists
  precisely to catch this class of problem
- The fix is small and traceable — one testid, one commit, one push

---

## Open Question

Should the `generate-acceptance-tests` capability, when compiling component-level
CATs, be given the story-level PAT as additional context so it can flag or include
any testids referenced at the story level that aren't present in the component?

This would tighten the contract propagation from story → sub-task → component.
