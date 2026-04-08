# Slides Prompt — Methodology M Presentation

**Target:** 7 slides, ~6 minutes. Every slide earns its place.
**Audience:** Senior engineers and tech leads. They know distributed
systems, CI/CD, and they've all used AI coding assistants. Don't
explain basics — show them what's different.
**Tone:** Confident, precise, no fluff. This is a rethink of how
software gets built when AI is a real participant, not a sidebar.

---

## Slide 1: Title

METHODOLOGY M
Realigning the SDLC Around AI

Shifting validation left. Unblocking the road to production.
Keeping humans in control.

---

## Slide 2: AI Can Do More. The SDLC Won't Let It.

- AI today: coding assistant — autocomplete, generate, explain
- The SDLC is still designed for humans writing code manually
- Testing is a phase that happens after implementation
- Integration is a phase that happens after testing
- Failures discovered late — in CI, in staging, in production

The gap isn't AI capability.
It's that the process doesn't give AI a meaningful role
beyond "write code faster."

---

## Slide 3: What If Testing Wasn't a Phase?

Traditional:

    Story → Implement → Test → Integrate → Fix → Deploy
                         ↑
                   discovery happens here (too late)

Methodology M:

    Story → Decompose + PATs → Implement against PATs → Already validated
            ↑
      validation defined here (at the start)

The left-shift isn't "move testing earlier."
Validation is embedded in how work is defined and executed.
Every change carries its own proof of correctness — Change-Validation
Encapsulation. By the time code reaches an MR, it's already proven.
The road to production is unblocked.

Think of it as PDD — PAT-Driven Development.
TDD for the AI age.

---

## Slide 4: PATs Drive Everything. AI and Humans Share the Work.

    Story
      → Story-level PATs (user outcomes)
        → Decomposition (one sub-task per component)
          → Repo-level PATs (component contracts)
            → PAT stubs → Implementation → CATs → Green MR

    Phase               AI does                    Humans do
    ─────────────────   ────────────────────────   ──────────────────────
    Decomposition       Breaks story into          BA writes the story,
                        sub-tasks per component    reviews decomposition
    PAT generation      Generates PAT stubs        Lead dev reviews
    Implementation      Implements against PATs    Dev steers, decides
    Test compilation    Compiles stubs into CATs   Dev chooses framework

PATs are validation-as-code — acceptance criteria expressed as
pseudocode that compiles into real tests.

Kiro Powers ensure consistency across every story, team, and repo.
Humans own the decisions. AI owns the execution.

---

## Slide 5: The Payoff — Unblocking Production

The hard question: "does this work?"

Traditional: find out in integration, staging, or production.
Methodology M: find out on the developer's MR — before merge.

- Integration becomes coordination, not discovery
- Staging validates deployment mechanics, not behaviour
- Production deploys are boring — behaviour is already proven

M is opinionated about the left side of the SDLC.
Deliberately unopinionated about the right side.
Blue-green, canary, serverless — doesn't matter.
By the time you're choosing, M's job is done.

---

## Slide 6: Multi-Repo, Plug-and-Play, One Model

Orchestration (when you need it):
- Ahead-of-time integration — test the post-merge state before merging
- Cascade merge — merge one MR, the system merges the rest

Pluggable tooling:
- CI: GitLab, GitHub, Bitbucket
- Tests: Cypress, Playwright, vitest
- Deploy: Docker, K8s, serverless
- Stories: Jira, Linear, markdown

One topology model:
- Monolith = root repo, everything embedded
- Distributed = root repo, components referenced
- Same methodology either way

---

## Slide 7: Transition to Demo

This is Methodology M. Let me show you.

    Story arrives
      → AI decomposes, generates contracts, implements, validates
      → Humans steer, review, decide
      → Every change validated at birth
      → The road to production is unblocked

→ Live demo

---

## Production Notes

- Use dark slide backgrounds with minimal text — the speaker carries
  the content, slides provide visual anchors
- Diagrams over bullet points wherever possible
- The PAT flow + AI/human table (slide 4) is the key visual — make
  it clear and memorable
- Slide 5 is the emotional peak — "the road to production is unblocked"
- Slide 6 is dense by design — three ideas compressed. Keep the visual
  clean: three columns or three rows, not a wall of text
- Slide 7 is just a transition — minimal text, maximum energy
- No animations, no transitions — clean and fast
