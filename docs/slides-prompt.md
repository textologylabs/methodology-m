# Slides Prompt — Methodology M Presentation

**Target:** 10 slides, 8 minutes. Every slide must earn its place.
**Audience:** Senior engineers and tech leads. They know distributed
systems, CI/CD, and the pain of multi-repo coordination. Don't explain
basics — show them what's new.
**Tone:** Confident, precise, no fluff. This is an industry-scale
framework, not a side project. Show the architecture, show the novelty.

---

## Slide 1: Title

**Methodology M**
AI-Driven Managed Multi-Team Delivery

Subtitle: From story to running software across distributed systems —
automatically coordinated, continuously validated, atomically landed.

Speaker note: Brief intro. "I'm going to show you a methodology that
solves the hardest problem in distributed development: knowing when
your feature actually works across the whole system."

---

## Slide 2: The Problem

**Multi-repo coordination is unsolved.**

Show the pain visually:
- 4 repos, 4 teams, 1 feature
- Each repo passes its own tests ✓
- Nobody knows if the combination works until deployment
- "Hey, is your MR ready?" messages in Slack
- Integration failures discovered after merge — on trunk, in production

The gap: repo-level confidence ≠ system-level confidence.
There is no mechanism to validate the composed system before merging.

Speaker note: "Every team I've worked with has this problem. You merge
your piece, I merge mine, and we find out they don't work together
in staging — or worse, in production."

---

## Slide 3: What is Methodology M?

**An AI-first SDLC for distributed systems.**

The traditional SDLC was designed for humans writing code manually.
M redesigns it around AI as a first-class participant — not bolted
on, not an afterthought. AI decomposes stories, generates contracts,
compiles tests, validates implementations. The methodology is built
for this.

Three core innovations:
1. **Change-Validation Encapsulation (CVE)** — every change carries
   its own proof of correctness. This is the massive left-shift:
   validation isn't a phase that happens later — it's inseparable
   from the change itself. CVE unblocks the entire downstream
   pipeline. If the change is validated at birth, integration,
   staging, and deployment become coordination problems, not
   discovery problems.
2. **Multi-repo orchestration** — merge gates, ahead-of-time
   integration, cascade merge across repos
3. **PAT-centred development** — Preliminary Acceptance Tests are
   the single source of truth driving decomposition, implementation,
   validation, and integration

Not a tool. Not a CI plugin. A methodology — with a reference
implementation that bootstraps itself.

Speaker note: "M is an AI-first SDLC. The traditional pipeline has
testing as a phase — you write code, then you test it, then you
integrate it, then you find out it's broken. M eliminates that.
Change-Validation Encapsulation means the proof travels with the
change from the moment it's created. That left-shifts everything.
Integration failures don't happen in staging — they happen on the
developer's MR, before merge. The rest of the pipeline is unblocked
because the hard question — does this work? — is already answered."

---

## Slide 4: PATs — The Centre of Operations

**PATs drive the entire lifecycle.**

Show the PAT flow visually (left to right):

```
Story → Story-level PATs → Decomposition → Repo-level PATs
  → Implementation → CATs (compiled tests) → AOT Integration
  → Cascade Merge → Running Software
```

Key points:
- Story-level PATs: user outcomes, topology-agnostic ("user sees a
  list of todos")
- Repo-level PATs: component contracts, derived from story PATs
  ("GET /todos returns JSON array")
- PAT stubs: pseudocode tests that define the contract
- CATs: real runnable tests compiled from PAT stubs (vitest, Cypress,
  supertest — framework is pluggable)
- PATs flow downward: story → component. Never upward.

The BA owns the story. The PATs are the spec. The developer implements
against the contract. The CI validates against the contract. One source
of truth, multiple forms.

Speaker note: "PATs aren't just tests. They're the contract that
connects the BA's intent to the developer's implementation to the CI
pipeline's validation. Change the PAT, and everything downstream
adapts."

---

## Slide 5: Change-Validation Encapsulation (CVE)

**A change without its validation doesn't exist.**

CVE is the mechanism behind M's massive left-shift. In traditional
pipelines, validation is a downstream phase — you discover failures
in integration, staging, or production. CVE eliminates this by
binding the proof to the change at every level:

| Level | Change | Validation |
|-------|--------|------------|
| Component | MR on managed repo | Repo-level CATs (compiled from PATs) |
| Story | MRs across all repos | Story-level integration tests |
| System | Topology commit on root | Full acceptance suite |

The validation travels with the change. You can't merge without green
CATs. You can't land a story without green integration. You can't
deploy without a validated topology.

**Why this unblocks everything downstream:**
- Integration becomes coordination, not discovery
- Staging validates deployment mechanics, not behaviour
- Production deploys are boring — the hard question is already answered
- The entire right side of the pipeline is unblocked because CVE
  answered "does this work?" on the left side

Speaker note: "This is the core insight and the biggest left-shift
you can make. In most teams, testing is something that happens to
code after it's written. In M, the validation is part of the change
itself. They're born together, they travel together, they land
together. By the time a change reaches integration, it's already
proven. By the time it reaches staging, it's already validated as
part of the composed system. The rest of the pipeline is just
logistics."

---

## Slide 6: Ahead-of-Time Integration

**Test the post-merge state before anyone merges.**

Show the AOT flow:

1. Dev raises MR on any managed repo
2. Webhook fires → root repo pipeline triggers
3. Root repo resolves ALL story branches across ALL repos
4. Composes the speculative post-merge state (Docker Compose)
5. Runs story-level integration tests against the composed system
6. Reports result back to EVERY MR in the story

Key concepts:
- **Speculative composition** — "if we merge everything for this story,
  does it work?"
- **HEAD component** — the component that drives integration (typically
  the frontend). Until the HEAD arrives, AOT fails structurally.
- **Structural vs logical failure** — missing component = structural
  (expected). Broken behaviour = logical (fix it).
- **Fan-out status** — one pipeline result, pushed to all story MRs.
  Red to green cascade when the HEAD arrives.

Speaker note: "This is where M gets interesting. You don't wait until
everything is merged to find out if it works. The system composes all
the story branches speculatively and tests them together. If it passes,
every MR in the story goes green — even the ones that didn't change."

---

## Slide 7: Cascade Merge — The Atomic Story

**A story is an atomic unit. Merge one, merge all.**

The merge transaction:
- Any MR merge for a story triggers the cascade
- Root repo detects the merge event
- Finds all remaining open MRs for the same story
- Merges them automatically via API
- Story lands atomically across all repos

Why atomic:
- AOT integration already proved the combination works
- Partial merges break the guarantee — you'd have half a story on main
- The person who merges any piece is committing to the whole story

No manual coordination. No "merge yours after I merge mine." No
merge-order dependencies. One merge, everything follows.

Speaker note: "You merge your MR. The system merges the rest. The
whole story lands in one motion. No coordination meetings, no Slack
messages, no 'are you ready?' — the system already knows."

---

## Slide 8: The Root Repo Model

**One model. No special cases.**

Show the topology:

```
Root Repo (todo-m-root)
├── project.yaml          ← topology manifest
├── packages/shell/       ← embedded: the integration surface
├── pats/                 ← story-level PATs
├── scripts/              ← orchestration (AOT, cascade, integration tests)
│
├── → todo-m-mfe          ← referenced: microfrontend
├── → todo-m-api-read     ← referenced: read API
└── → todo-m-api-write    ← referenced: write API
```

Key points:
- `project.yaml` is the source of truth — what works together
- The shell lives in the root repo — it IS the integration surface
- Components are either embedded (in the repo) or referenced (external)
- Every commit on main = validated combination = deployable state
- Self-contained repos are just root repos with all components embedded
- Evolution: embedded → referenced without restructuring

Speaker note: "There's no 'simple case' and 'complex case.' Every
project is a root repo. The only variable is whether the code lives
inside it or in separate repos. A monolith is a root repo with
everything embedded. A distributed system is a root repo with
referenced components. Same model, same tooling, same methodology."

---

## Slide 9: Kiro Powers + Plug-and-Play Architecture

**The methodology is invariant. The tooling is pluggable.**

Two layers:

**M Power (Kiro)** — the thinking layer:
- Story decomposition across the topology
- PAT generation from stories
- PAT → CAT compilation (framework-pluggable)
- Impact analysis: which components does this story touch?
- Packaged as Kiro Powers — installable, shareable, reusable

**CI Orchestration** — the execution layer:
- AOT integration pipeline
- Fan-out status reporting
- Cascade merge
- Auto-tagging, topology bumping

**Plugin architecture:**

| M defines (strategy) | Project chooses (plugin) |
|---|---|
| Version control + CI | GitLab, GitHub, Bitbucket |
| CAT compilation target | Cypress, Playwright, vitest, supertest |
| Stub generation | Express, WireMock, MSW |
| Story management | Jira, Linear, markdown |
| Deployment model | Docker Compose, K8s, serverless |

Three-tier resolution: repo override → project default → built-in fallback.

**Project templates:**

The central M config repo holds a project template catalogue —
pre-configured combinations of plugins, CI configs, Dockerfiles,
and scaffolding for common stacks. When M bootstraps a new repo,
it pulls the specified template and generates the repo from it.

Templates are how organisations standardise without constraining.
A "Node.js API" template gives you Express, vitest, Docker, GitLab CI
out of the box. A "React MFE" template gives you webpack, Module
Federation, Cypress, Testing Library. Teams don't reinvent scaffolding
— they pick a template and start implementing against PATs.

Templates are versioned, composable, and organisation-specific.
The template catalogue is the organisation's engineering standards
made executable.

Speaker note: "M doesn't prescribe GitLab. It doesn't prescribe Cypress.
It doesn't prescribe Docker. Those are plugins. The methodology defines
what needs to happen — PATs, AOT integration, cascade merge. The plugins
define how. Swap GitLab for GitHub Actions, Cypress for Playwright,
Docker for Kubernetes. The methodology doesn't change.

And here's where it gets practical: project templates. Your central M
config repo holds a catalogue of templates — Node.js API, React MFE,
Python service, whatever your org uses. When M scaffolds a new repo,
it pulls the template. Your engineering standards aren't a wiki page
nobody reads — they're executable templates that every new repo starts
from. Teams should use templates a lot more than they do. M makes it
the default."

---

## Slide 10: From Story to Running Software

**The full cycle, end to end.**

Visual: the complete SDLC flow, left to right:

```
Story arrives
  → Decompose into sub-tasks (M Power)
  → Generate PATs per component (M Power)
  → Developers implement against PAT contracts
  → Compile PATs into CATs (M Power)
  → CATs green → raise MRs
  → AOT integration composes & validates
  → All MRs go green (fan-out)
  → Merge any one → cascade merges the rest
  → Validated topology on main
  → Deploy
```

Every step traceable. Every change validated. Every merge coordinated.
No guesswork. No manual integration. No "works on my machine."

**This is Methodology M.**

Speaker note: "From a user story to running software across a
distributed system. Every step is automated or AI-assisted. Every
change carries its proof. Every merge is coordinated. The system
tells you when it's ready — you don't have to ask. That's what M
delivers. Let me show you."

→ Transition to live demo.

---

## Production Notes

- Use dark slide backgrounds with minimal text — the speaker carries
  the content, slides provide visual anchors
- Diagrams over bullet points wherever possible
- The PAT flow diagram (slide 4) and AOT flow (slide 6) are the two
  key visuals — make them clear and memorable
- Slide 10 is the bridge to the live demo — end on energy, not summary
- Total: 10 slides, ~45-50 seconds per slide average
- No animations, no transitions — clean and fast
