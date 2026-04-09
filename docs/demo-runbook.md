# Demo Runbook — Methodology M (Friday 11 April 2026)

**Duration:** ~25 minutes (8 min slides + 17 min live demo)
**Format:** Slides first (theory), then live demo (practice)
**Principle:** The demo follows the SDLC logical flow from left to right.
Each act is a phase of the lifecycle. The work items may differ between
acts — that doesn't matter. What matters is the audience sees the full
pipeline: story → decompose → PATs → implement → validate → integrate →
merge → running software.

---

## Legend

| Icon | Meaning |
|------|---------|
| 💬 | Kiro Chat — presenter types a message to Kiro |
| 👻 | Kiro — AI agent acts autonomously |
| 🖥️ | Terminal — presenter runs a shell command |
| 🦊 | GitLab UI — presenter clicks/navigates in GitLab |
| 📝 | IDE Editor — presenter edits a file manually |
| 🌐 | Browser — presenter shows something in a browser |
| 👀 | Audience — what the audience should observe |
| 🎯 | Talking point — what to say to the audience |

---

# Part 0: Preparation (before the demo)

These steps reset the environment to a clean starting state so the
demo is repeatable. Do this 15–30 minutes before showtime.

## P1: Rewind all repos to story-zero-complete

TODO: rewind script / steps

## P2: Restore API MRs

TODO: patch/preload system — recreate the API feature branches and MRs
from saved patches so they appear as "already in progress" for the demo.

## P3: Verify starting state

TODO: checklist — what should be true before the demo starts:
- All repos at story-zero-complete tag
- API MRs open and failing (incomplete story — MFE MR missing)
- MFE has no MR yet
- Root repo MR !9 open with integration tests
- Docker images buildable

---

# Part 1: Slides — What is M? (~8 min)

Theory only. The live demo proves everything the slides claim.

Slide topics (rough):
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

# Part 2: Live Demo

## Act 1: The Landscape — What exists already (~2 min)

Set the scene. Show the project topology and the running app.

---

### D1: The project topology

🦊 Open the GitLab group `methodology-m/todo-m-workshop`. Show the 4 repos.

🎯 "This is a distributed todo app — deliberately simple. A shell that
composes a microfrontend via Module Federation, backed by two APIs:
one for reading, one for writing. Four repos, four components."

🦊 Open `todo-m-root` → show `project.yaml`.

🎯 "project.yaml is the single source of truth for the topology. It
declares every component and its current version. Right now everything
is at v0.1.0 — that's Story Zero, the infrastructure baseline."

🦊 Show `stories/TODOM-000.yaml` (readiness tracker).

🎯 "The readiness tracker shows which components have been validated
for which story, and at what version. All high-water marks are at
v0.1.0 — Story Zero is complete across the board."

🌐 Open the app in the browser (Docker Compose or pre-started).

👀 The Hello app — shell composing the MFE, which shows the Hello
component with the API message.

🎯 "This is what Story Zero built. A working composed system — but
it doesn't do anything useful yet. That's what Story 1 is for."

---

## Act 2: Story Decomposition + PATs — live (~4 min)

SDLC phase: a new story arrives, gets decomposed, PATs generated.
This is the planning phase of M — the audience sees it happen live.

---

### D2: A new story arrives — TODOM-002

🦊 Open `TODOM-002.md` in the workshop artefacts (or show it in the IDE).

🎯 "A new story just landed: 'Mark todos as complete.' Checkboxes,
strike-through styling, a progress summary. It touches all four
components — the read API needs to return a completed field, the
write API needs a PATCH endpoint, the MFE needs checkbox UI, and
the root needs integration tests for the round-trip."

🎯 "In a traditional setup, someone writes a Jira ticket, developers
interpret it differently, and you find out at integration time that
the API returns a different shape than the frontend expects. M
prevents that. Let's decompose this story."

---

### D3: Decompose into sub-tasks

💬 `Decompose TODOM-002 into sub-tasks.`

👻 Kiro reads the story and project.yaml, identifies the four affected
components, and generates sub-task files — one per component:
- `TODOM-002a.md` — todo-m-root (integration tests, PAT yaml)
- `TODOM-002b.md` — todo-m-mfe (checkbox UI, progress summary)
- `TODOM-002c.md` — todo-m-api-read (return completed field)
- `TODOM-002d.md` — todo-m-api-write (PATCH endpoint)

🎯 (While Kiro works) "M reads the topology from project.yaml and
decomposes the story into one sub-task per affected component. Each
sub-task gets its own acceptance criteria, data-testid attributes,
API contracts. The developers don't interpret the story — they
implement against a contract."

📝 Open one of the generated sub-task files (e.g. TODOM-002b — the MFE).

👀 The audience sees: clear acceptance criteria, specific data-testid
values, API endpoint contracts, expected behaviour for edge cases.

🎯 "This isn't a vague ticket. It's a spec. Every data-testid, every
endpoint, every edge case — specified before a line of code is written."

---

### D4: Generate PAT stubs

💬 `Generate PAT stubs for TODOM-002.`

👻 Kiro generates pseudocode test stubs for each component — the PAT
contract in executable-ish form.

📝 Open a PAT stub file. Show the pseudocode.

🎯 "PATs are pseudocode tests — they describe the expected behaviour
without committing to a test framework. When a developer picks up
their sub-task, these stubs get compiled into real runnable tests
using whatever framework the repo uses. Vitest for the MFE, supertest
for the APIs. The contract stays the same; the executable form adapts."

🎯 "The BA owns the story. M decomposes it into contracts. Now let's
see what happens when a developer picks one up."

---

## Act 3: PAT-Driven Implementation (~4 min)

SDLC phase: a developer picks up a sub-task and implements it.
We switch to Story 1 here — it's already been through decomposition
and the APIs are already implemented. The MFE is the missing piece.

---

### D5: Story 1 — where we are now

🦊 Show `TODOM-001` story (from the workshop artefacts or root repo).

🎯 "Story 1 went through the same decomposition process you just saw.
View and add todos — four sub-tasks, four components. The API team
has already implemented their parts. Let's see where things stand."

🦊 Open the MR list. Show the 3 open MRs — 2 API (red), 1 root (green).

🎯 "Two API MRs are open. They pass their own repo-level tests. But
look — they're red. AOT integration is blocking them. Let's see why."

🦊 Click into one of the failed AOT pipelines on the root repo.
Navigate to the `shadow:integration` job log. Find the failure message.

👀 The audience sees:
```
Story TODOM-001: 3 of 4 components present (todo-m-mfe missing)
✗ INCOMPLETE STORY: not all components have MRs for TODOM-001
  AOT integration requires all affected components to participate.
  Missing: todo-m-mfe
```

🎯 "The story touches four components. Three have MRs — but the MFE
is missing. AOT integration can't run a meaningful end-to-end test
with a gap in the topology. Every component in a multi-part change
is equal — the system won't proceed until they're all present."

🎯 "So let's fill the gap."

---

### D6: Implement TODOM-001c

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

💬 `Implement TODOM-001c.`

🎯 "One sub-task ID — that's all the developer (or AI) needs. The first
thing they do is read the sub-task file to understand the contract:
acceptance criteria, data-testid attributes, API endpoints. Then the
PAT stubs — pseudocode tests that describe the expected behaviour.
This isn't a vague ticket. It's a spec."

👻 Kiro reads the sub-task and PATs, then implements the Todo component:
- Replaces Hello component with Todo component
- Fetches from GET /todos on mount, renders the list
- Shows item count ("3 items" / "No items yet")
- Empty state with friendly message
- Add form: input + button, POST to /todos, re-fetch list
- Button disabled when input empty
- data-testid attributes on every interactive element

🎯 (While Kiro works) "Kiro is implementing against the PAT contract.
Every data-testid, every behaviour, every edge case is specified in
the sub-task. The AI doesn't guess what to build — the PAT tells it.
This is what we mean by PAT-driven development."

🎯 "Implementation and PAT validation are the same thing in M. You
implement towards the contract, you check your work against it as
you go. It's a loop, not two separate phases."

👀 The Todo component code appears in the editor. Kiro validates
against the PATs as part of implementation — checking the component
renders, the data-testid attributes are present, the behaviour
matches the contract.

**(Skip this step if tight on time — go straight to D9)**

---

### D7: Compile PATs into CATs

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

📝 Quick side-by-side: open the PAT stub (pseudocode in the sub-task)
next to the compiled CAT (real test code). Let the audience see the
transformation.

🎯 "On the left, the PAT — pseudocode describing the expected behaviour.
On the right, the CAT — a real runnable test compiled from that PAT.
Same contract, different form."

💬 `Compile the PAT stubs into runnable tests for TODOM-001c.`

👻 Kiro generates:
- `pats/TODOM-001c.spec.jsx` — unit CATs (vitest + Testing Library)
- Mocked API responses, component-level assertions
- Tests match the PAT stubs 1:1

🎯 "PATs are the contract. CATs are the executable version. Every PAT
stub becomes a real test. The framework choice is per-repo — this MFE
uses vitest and Testing Library. An API would use supertest."

---

### D8: Run CATs — repo-level confidence

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🖥️ `npm test`

👀 All tests pass.

🎯 "Green at the repo level. The MFE satisfies its own contract. But
we don't know yet if it works with the rest of the system. That's
what AOT integration is for."

---

### D9: Commit, push, raise MR — trigger AOT integration

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🖥️ Commit all changes, push to feature branch, raise MR on GitLab.

🎯 "The moment this MR is created, a webhook fires. The root repo's
AOT integration pipeline starts. It's going to compose all four
components from their story branches — the speculative post-merge
state. If this passes, we know the feature works end-to-end."

🦊 Show the MR on GitLab — pipeline starting.

🎯 "Notice: the MFE's own repo pipeline runs too — that's the CATs
we just wrote. But the interesting pipeline is on the root repo."

---

## Act 4: AOT Integration + Cascade Merge (~5 min)

SDLC phase: integration and landing. The system coordinates itself.

---

### D10: Watch AOT integration — the payoff

🦊 Navigate to `todo-m-root` → CI/CD → Pipelines. Find the triggered
pipeline (source: trigger).

🎯 "Here it is. The root repo is composing the system. Let's watch
the job log."

🦊 Click into the `shadow:integration` job. Watch the log stream:

👀 The audience sees (in order):
1. Branch resolution — each repo resolved to its story branch
2. Root repo self-bootstrap — pulls integration tests from story branch
3. **Story TODOM-001: 4 of 4 components present** ← the key moment
4. Docker compose build — all 4 images
5. Health checks — all 4 services healthy
6. TODOM-000 baseline tests — all pass
7. TODOM-001 story tests — GET /todos, POST /todos round-trip, validation, shell + MFE

🎯 (At completeness check) "There it is — all four components are
present. Last time this said '3 of 4' and failed because the MFE
was missing. Now the story is complete, so the real tests run."

🎯 (At test results) "Every acceptance criterion from the story is
verified against the composed system. API round-trip works. Validation
works. The shell composes the MFE. This is end-to-end confidence."

👀 Job passes. `shadow:report-status` pushes success back to the MFE MR.

---

### D11: The cascade — API MRs go green

🦊 Navigate back to the MR list. Show all MRs.

👀 The API MRs that were red are now green.

🎯 "The APIs didn't change. Not a single line of code. But the MFE
arrived, the story became complete, AOT integration passed, and the
success status was pushed back to every MR in the story. Red to
green, automatically."

🎯 "This is the core insight of Methodology M: you don't ask 'are we
ready to integrate?' — the system tells you."

---

### D12: Merge

🦊 Merge any one MR → cascade automatically merges the rest.
(Fallback: merge in sequence — root first, then APIs, then MFE.)

🎯 "All gates are green. We merge. And when you commit to one piece,
you commit to the whole story — cascade merge lands them all."

TODO: determine if cascade merge is feasible for the demo. If not,
merge in sequence and narrate the cascade concept.

---

## Act 5: The Running App (~2 min)

SDLC phase: delivery. The payoff.

---

### D13: The running app

🌐 Open the app in the browser (Docker Compose).

👀 The todo app works:
- List shows existing todos (or empty state)
- Type a title, click Add
- New todo appears in the list

🎯 "Remember the Hello app we saw at the start? Same URL, same shell,
same composition. But now it's a real feature — built, tested, and
integrated across four repos."

🎯 "From story to running software. Every step traceable: story →
sub-tasks → PATs → implementation → CATs → AOT integration →
cascade merge. No guesswork. No 'hey, is your MR ready?' messages.
The system orchestrates itself."

---

### D14: Replayability (closing moment)

🖥️ Run the rewind script:
```
GITLAB_TOKEN=$M_GROUP_TOKEN sh workshop/scripts/demo-rewind.sh
```

👀 All repos reset, MRs recreated, API MRs go red again.

🎯 "Everything you just saw? Reset in 30 seconds. The whole workshop
is replayable — rewind to the tag, apply the patches, and you're
back to the starting state. This is how M stays honest: if you can't
replay it, you didn't capture it."

---

# Post-Demo

- Take questions
- Point to the methodology paper for deeper reading
- Mention that the entire workshop is replayable (story-zero-complete tag)
- If asked about tooling: "The orchestration is GitLab CI + shell scripts.
  The AI assistance is Kiro. But M is methodology, not tooling — you could
  do this with GitHub Actions and Copilot, or Jenkins and no AI at all."

---

# Timing Notes

| Section | Target | SDLC Phase | Notes |
|---------|--------|------------|-------|
| Part 1: Slides | 8 min | Theory | Keep it tight, no tangents |
| **Act 1: Landscape** | | | |
| D1: Topology + running app | 2 min | Context | project.yaml, readiness tracker, app |
| **Act 2: Decomposition** | | | |
| D2: New story — TODOM-002 | 1 min | Planning | Show the story, set up the problem |
| D3: Decompose into sub-tasks | 2 min | Planning | Live M Power decomposition |
| D4: Generate PAT stubs | 1 min | Planning | Pseudocode test contracts |
| **Act 3: Implementation** | | | |
| D5: Story 1 + incomplete story | 1.5 min | Development | Red MRs, missing component log |
| D6: Implement TODOM-001c | 3 min | Development | Kiro reads contract + implements |
| D7: PAT → CAT side-by-side | 30 sec | Development | Visual transformation moment |
| D8: Run CATs | 30 sec | Development | npm test, green, move on |
| D9: Push MR | 30 sec | Development | Mechanical |
| **Act 4: AOT + Cascade** | | | |
| D10: Watch pipeline | 2 min | Integration | The money shot — narrate the log |
| D11: Cascade green | 30 sec | Integration | MR list, red → green |
| D12: Merge | 30 sec | Integration | Cascade merge |
| **Act 5: Running App** | | | |
| D13: Running app (after) | 1 min | Delivery | Before/after callback |
| D14: Rewind | 30 sec | Delivery | Replayability — the closing punch |
| Q&A | 5 min | — | Buffer |
| **Total** | **~30 min** | | Tight but doable |

---

# Risk Mitigation

- **Pipeline takes too long:** Have a pre-recorded screencast of the
  pipeline passing as backup. Or pre-trigger it and show the result.
- **Network issues:** Have screenshots of key GitLab screens ready.
- **Kiro is slow:** Pre-implement the MFE, have the code ready on a
  branch. `git checkout` the pre-baked branch if AI takes too long.
- **Docker build fails:** Have a local compose already running as fallback.
- **Tests fail unexpectedly:** Have the last successful pipeline URL
  bookmarked to show the audience what it looks like when it works.
- **M Power decomposition fails or is slow:** Have pre-generated
  TODOM-002 sub-task files ready. Show them as "here's what M produced"
  if the live generation stalls.
