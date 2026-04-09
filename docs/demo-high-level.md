# Demo High-Level Plan — Methodology M (Friday 11 April 2026)

**Duration:** ~25 minutes (8 min slides + 17 min live demo + Q&A)

**Principle:** The demo follows the SDLC logical flow from left to right.
Each act is a phase of the lifecycle. The work items may differ between
acts — that doesn't matter. What matters is the audience sees the full
pipeline: story → decompose → PATs → implement → validate → integrate →
merge → running software.

---

## Part 1: Slides — What is M? (8 min)

Theory only. The live demo proves everything the slides claim.

1. Title / intro
2. The problem: distributed systems, integration pain
3. What is Methodology M?
4. Key concepts: stories, PATs, sub-tasks, components
5. The development cycle: implement → validate → integrate
6. Ahead-of-time integration: speculative post-merge composition
7. Incomplete vs complete story — when can integration run?
8. The merge transaction: cascade merge
9. Summary / transition to live demo

---

## Part 2: Live Demo (17 min)

### Act 1: The landscape (2 min)

Set the scene. Show what exists before any work begins.

- GitLab group — 4 repos, project.yaml, topology
- The running app (Story Zero or Story One state)
- "This is a distributed todo app — deliberately simple. A shell
  composing a microfrontend via Module Federation, backed by two APIs."

### Act 2: Story decomposition + PATs (4 min)

SDLC phase: a new story arrives, gets decomposed, PATs generated.

- Show a new story (e.g. "delete todo" or similar — pre-prepared)
- Use M Power to decompose into sub-tasks — one per component
- Show the generated sub-task files: acceptance criteria, data-testid
  attributes, API contracts
- Use M Power to generate PAT stubs — pseudocode tests per component
- "The BA owns the story. M decomposes it into contracts that each
  developer implements against. The PATs are the spec."

### Act 3: PAT-driven implementation (4 min)

SDLC phase: a developer picks up a sub-task and implements it.

- "Implement TODOM-001c" — Kiro reads the sub-task contract
- Kiro implements the Todo component against the PAT spec
- Quick side-by-side: PAT stub (pseudocode) vs compiled CAT (real test)
- Run CATs — green
- Push and raise MR
- "One sub-task ID. The contract tells the developer (or AI) exactly
  what to build. Every data-testid, every behaviour, every edge case."

### Act 4: AOT integration + cascade merge (5 min)

SDLC phase: integration and landing. The system coordinates itself.

- Show the open MRs — APIs red (incomplete story — MFE missing)
- Triggered pipeline on root repo — AOT integration composing all
  four components from their story branches
- Story completeness check passes: all 4 components present
- All story-level tests pass against the composed system
- Fan-out: success status pushed to ALL story MRs simultaneously
- The red API MRs go green — "not a single line of code changed"
- Merge any one MR → cascade automatically merges the rest
- "You don't ask 'are we ready to integrate?' — the system tells you.
  And when you commit to one piece, you commit to the whole story."

### Act 5: The running app (2 min)

SDLC phase: delivery. The payoff.

- Docker compose up — the app works with the new feature
- Before/after comparison
- "Same URL, same shell, same composition. But now it's a real feature —
  built, tested, and integrated across four repos."
- "From story to running software. Every step traceable: story →
  sub-tasks → PATs → implementation → CATs → AOT integration →
  cascade merge."

---

## Q&A (5 min buffer)

Key points to land if asked:

- **Tooling:** "The orchestration is GitLab CI + shell scripts. The AI
  is Kiro. But M is methodology, not tooling — you could do this with
  GitHub Actions and Copilot, or Jenkins and no AI at all."
- **Scale:** "This is four repos. The same pattern works for forty.
  The topology manifest and AOT integration scale linearly."
- **Plugin architecture:** "Everything you saw — CI platform, test
  framework, deployment target — is pluggable. The methodology defines
  the strategy; the plugins implement the mechanism."

---

## Timing Summary

| Section | Target | SDLC Phase |
|---------|--------|------------|
| Part 1: Slides | 8 min | Theory |
| Act 1: Landscape | 2 min | Context |
| Act 2: Decompose + PATs | 4 min | Planning |
| Act 3: Implementation | 4 min | Development |
| Act 4: AOT + cascade | 5 min | Integration |
| Act 5: Running app | 2 min | Delivery |
| Q&A | 5 min | — |
| **Total** | **~30 min** | |
