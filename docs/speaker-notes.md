# Speaker Notes — Methodology M Presentation

Per-slide speaking points, anticipated questions, and rebuttals.

---

## Slide 1: Title

"I'm going to show you a methodology that changes where AI participates
in the software lifecycle — and what that unlocks for everything
downstream."

Keep it to 15 seconds. The title does the work.

---

## Slide 2: AI Can Do More

"Every team I talk to uses AI for coding. Copilot, Kiro, Claude — great
tools. But they're bolted onto a process that was designed before AI
existed. The SDLC still assumes a human decomposes the story, a human
writes the tests, a human coordinates the integration. AI just types
faster. That's a waste of what AI can actually do."

Land the point: the bottleneck isn't AI capability, it's the process
around it.

---

## Slide 3: What If Testing Wasn't a Phase?

"This is the core insight. In most teams, testing is something that
happens to code after it's written. In M, the validation is part of
how the work is defined. The PAT is the spec the BA writes, the
contract the developer implements against, and the test the CI runs.
They're the same artefact in different forms. By the time code reaches
an MR, it's already validated. Everything downstream — integration,
staging, deployment — is logistics, not discovery."

### Anticipated challenge: "This is just TDD"

It's not. The differences that matter:

- TDD: the developer writes the test. M: AI generates the contract
  from the BA's story.
- TDD: one repo, one test suite. M: PATs span multiple repos and
  compose into story-level integration.
- TDD: the developer decides granularity. M: the PAT format is
  standardised by the methodology — consistent across teams.
- TDD: optional discipline (most teams don't actually do it). M:
  structural — you can't skip it because the PAT is the spec, the
  contract, and the gate.

Rebuttal: "TDD says write the test first. M says the test is a
byproduct of how the story is decomposed — you don't write it, it's
generated from the acceptance criteria. TDD is a practice you choose
to follow. M is a structure where validation is unavoidable."

### Anticipated pushback: "We already do TDD, so the traditional flow doesn't apply to us"

Even in a TDD shop:
- The developer writes their tests for their component
- Integration testing is still a separate phase
- Nobody knows if the composed system works until it's assembled
- The tests are scoped to one repo, not the story

TDD shifts implementation-level validation left. M shifts story-level
validation left. They operate at different altitudes.

Rebuttal: "Even if your team does TDD religiously — great, you've
shifted unit validation left. But who's testing that your API change
and the frontend change and the other API change all work together?
That's still discovered in integration. M shifts that left too."

---

## Slide 4: PATs Drive Everything

"PATs aren't just tests. They're the contract that connects the BA's
intent to the developer's implementation to the CI pipeline's
validation. Change the PAT, and everything downstream adapts. The
developer doesn't decide what to build — the PAT tells them. The CI
doesn't decide what to test — the PAT tells it. That's why AI can
participate so effectively: the contract is precise enough for AI to
implement against and validate against."

"And because it's packaged as Kiro Powers, it's consistent. Every
story gets decomposed the same way. Every PAT follows the same format.
That's what a methodology gives you that ad-hoc prompting doesn't."

### Anticipated question: "What if the PAT is wrong?"

"Then you find out immediately — the CAT fails, or the implementation
doesn't match the acceptance criteria. The BA reviews the decomposition.
The lead dev reviews the contracts. Humans are in the loop at every
handoff point. The PAT is a living artefact, not a stone tablet."

---

## Slide 5: The Payoff

"M is opinionated about the left side of the SDLC — how work is
defined, decomposed, implemented, and validated. It's deliberately
unopinionated about the right side — how you deploy, where you host,
what your release strategy is. Because if you've done the left side
right, the right side is just logistics. That's the unlock."

### Anticipated question: "What about non-functional requirements? Performance, security?"

"M doesn't replace your performance testing or security scanning.
Those are orthogonal concerns. M ensures functional correctness —
the feature works as specified. You still run your load tests, your
SAST scans, your pen tests. But you're not also debugging 'does the
feature actually work?' at the same time. That question is already
answered."

---

## Slide 6: Multi-Repo, Plug-and-Play, One Model

"Multi-repo coordination is a hard problem. M doesn't claim to have
invented the solution — but when your changes already carry their
validation, orchestrating across repos becomes much simpler. You
compose the branches, run the story-level PATs against the composed
system, and report back. If it works, everyone goes green. If it
doesn't, everyone knows why. No Slack messages, no 'is your MR
ready?' — the system tells you."

"And there's no 'simple case' and 'complex case.' A solo developer
with one repo uses the same model as a team with twenty repos. The
only variable is whether components live inside the root or in
separate repos. You start embedded, extract when you need to. The
methodology doesn't change."

### Anticipated question: "Does this scale?"

"The topology manifest and AOT integration scale linearly. More repos
means more branches to compose, but the pattern is identical. The
reference implementation has four repos. The same scripts work for
forty — you just add entries to project.yaml."

### Anticipated question: "Why not just use a monorepo?"

"You can. A monorepo in M is a root repo with all components embedded.
Same PATs, same validation, same methodology. M doesn't have an opinion
on repo topology — it works with whatever you have. But when you do
need to extract a component into its own repo, M handles that without
changing the methodology. Monorepo vs multi-repo is an infrastructure
decision, not a methodology decision."

---

## Slide 7: Transition to Demo

"From a user story to running software across a distributed system.
Every step is automated or AI-assisted. Every change carries its proof.
Every merge is coordinated. The system tells you when it's ready — you
don't have to ask. Let me show you."

Keep it short. The demo is the proof. Don't over-sell — just transition.

---

## General Q&A Prep

### "How is this different from BDD?"

BDD (Behaviour-Driven Development) uses Given/When/Then to describe
behaviour. PATs are similar in spirit but different in scope:
- BDD is typically one team, one codebase
- PATs span the topology — story-level PATs decompose into
  component-level contracts across repos
- BDD doesn't prescribe how tests flow from story to implementation
  to CI — M does
- PATs are the input to AI-driven decomposition and test compilation
  — BDD predates that workflow

"BDD is a great influence. M takes the 'behaviour as spec' idea and
extends it across distributed systems with AI as a first-class
participant in the generation and validation chain."

### "What if we don't use Kiro?"

"M is a methodology, not a Kiro feature. The reference implementation
uses Kiro because it's what we have. But the PAT format, the
decomposition pattern, the orchestration scripts — none of that is
Kiro-specific. You could use any AI assistant that can read a story
file and generate structured output. Kiro Powers just make it
repeatable and shareable."

### "What's the adoption path? Do we rewrite everything?"

"No. M is incremental. Start with one story on one project. Define
PATs for it, decompose it, implement against the contracts. You don't
need the full orchestration pipeline on day one. The left-shift —
PAT-driven development — works even in a single repo with no
multi-repo coordination. Add the orchestration when you need it."

### "Who owns the PATs?"

"The BA owns the story-level PATs — they're acceptance criteria in a
structured format. The lead dev owns the repo-level PATs — they're
technical contracts derived from the story. The developer implements
against them. AI generates and compiles them. Ownership follows the
existing SDLC roles — M doesn't invent new ones."
