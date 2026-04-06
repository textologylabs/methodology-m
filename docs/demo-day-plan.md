# Demo Day Plan — Easter Monday 2026-04-06

## Goal

Complete everything needed for the Friday demo. By end of day:
a working demo with runbook, one rehearsal done, and a clear path
to slides and methodology paper.

## Today's Work (in order)

### 1. Implement the MFE (TODOM-001c)

The live demo centrepiece. Build the Todo component replacing Hello,
wired to api-read (GET /todos) and api-write (POST /todos). Push
the MR — this is the HEAD component arriving.

### 2. Verify the full integration cascade

Once the MFE MR is raised:
- Shadow integration should go green on all repos (HEAD is present,
  integration tests pass, APIs + MFE all composed)
- Verify the HEAD gate message disappears and tests actually run
- Confirm the API MRs flip from red to green

### 3. Merge flow

Explore whether merging the HEAD MR can trigger a cascade merge of
all story MRs. If feasible, implement it — that's a powerful demo
moment. If not, manual merge is fine for Friday.

### 4. Write the demo runbook

A complete script covering:
- **Prep steps**: rewind to story-zero-complete, restore API MRs
  (patch/preload system), verify clean starting state
- **Demo steps**: implement MFE live, push MR, watch pipelines,
  show the cascade, merge, show running app
- **Talking points**: what to call out at each step, what the
  audience should notice

### 5. Rehearsal

Run through the full demo at least once end-to-end. Time it.
Identify rough edges. Fix anything that breaks.

## After Today (separate sessions)

### 6. Update the methodology paper

Refresh methodology-m.md with the latest concepts: HEAD component,
structural vs logical failure, eager shadow integration, PAT-driven
development.

### 7. Generate slides

10 laser-sharp slides for the first half of the demo (theory).
~40 Gamma credits available — may need to be precise with the
generation. Plan the slide content in a focused session with TARS
before generating.

## Demo Structure (Friday)

- **First half (~10 min)**: Slides explaining Methodology M
- **Second half (~10 min)**: Live demo showing M in action
  - Starting state: API MRs open, failing (HEAD missing)
  - Live: implement MFE, push, watch integration go green
  - Merge, show running app in Docker Compose
