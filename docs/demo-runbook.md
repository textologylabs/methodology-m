# Demo Runbook — Methodology M (Friday 11 April 2026)

**Duration:** ~20 minutes (10 min slides + 10 min live demo)
**Format:** Slides first (theory), then live demo (practice)

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
- API MRs open and failing (HEAD structural failure)
- MFE has no MR yet
- Root repo MR !9 open with integration tests + HEAD gate
- Docker images buildable

---

# Part 1: Slides — Methodology M Theory (~10 min)

10 slides. Content TBD — focused session needed.

Slide topics (rough):
1. Title / intro
2. The problem: distributed systems, integration pain
3. What is Methodology M?
4. Key concepts: stories, PATs, sub-tasks, components
5. The development cycle: implement → validate → integrate
6. Shadow integration: speculative post-merge composition
7. Structural vs logical failure
8. HEAD component: who drives integration
9. The merge transaction: atomic multi-repo merge
10. Summary / transition to live demo

---

# Part 2: Live Demo

## Act 1: Orientation — What exists already (~3 min)

Walk the audience through the project and Story 0, then set up Story 1.

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

---

### D2: How Story 0 was built (quick walkthrough)

🦊 Open `jira/TODOM-000.md` in the root repo.

🎯 "Every feature starts as a story. This one bootstrapped the entire
system — repos, CI pipelines, orchestration wiring. Let me show you
how it was decomposed."

🦊 Show `jira/TODOM-000a.md` through `TODOM-000d.md` (quick scroll).

🎯 "The story was decomposed into sub-tasks — one per component. Each
sub-task has its own acceptance criteria expressed as PATs — Preliminary
Acceptance Tests. These are the contract the developer implements against."

🦊 Show `pats/TODOM-000.pat.yaml`.

🎯 "PATs are machine-readable. They define what 'done' looks like at the
story level. During development, they get compiled into real runnable
tests — we call those CATs, Compiled Acceptance Tests."

---

### D3: Story 1 — where we are now

🦊 Show `TODOM-001` story (from the workshop artefacts or root repo).

🎯 "Story 1 is the first real feature: view and add todos. It was
decomposed into four sub-tasks — one for each component. The API
team has already implemented their parts."

🦊 Open the MR list. Show the 3 open MRs — 2 API (red), 1 root (green).

🎯 "Two API MRs are open. They pass their own repo-level tests. But
look — they're red. Shadow integration is blocking them. Let's see why."

🦊 Click into one of the failed shadow pipelines on the root repo.
Navigate to the `shadow:integration` job log. Find the HEAD failure message.

👀 The audience sees:
```
HEAD component: todo-m-mfe (MR present: false)
✗ STRUCTURAL FAILURE: HEAD component todo-m-mfe has no MR for TODOM-001
  The HEAD component drives integration — shadow cannot pass without it.
  Supporting MRs are expected to fail until HEAD is present.
```

🎯 "The PAT yaml declares the MFE as the HEAD component — it's the one
that drives the user-facing integration. Until the HEAD shows up, there's
nothing meaningful to test end-to-end. The system knows this. It's not
a bug — it's a structural failure. The topology is incomplete."

🎯 "So let's complete it."

---

## Act 2: Implement the HEAD — following the M cycle (~7 min)

From here we follow Methodology M strictly. Every step is a deliberate
phase of the development cycle.

---

### D4: Implement TODOM-001c

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

👀 The Todo component code appears in the editor.

---

### D5: Validate against PATs locally

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🎯 "Next step: validate. Before we write any tests, we check that the
implementation actually satisfies the PATs. In M, this is a visual
check — does it look right, does it behave right?"

🖥️ Start the dev server (or use a pre-started one).

🌐 Open the MFE in the browser. Show:
- Todo list renders (or empty state if no API running)
- Input and button are present
- data-testid attributes visible in DevTools

🎯 "The component renders, the structure matches the PAT contract.
In a real workflow you'd also run the APIs locally and test the full
flow. For the demo, we'll let shadow integration do that."

**(Skip this step if tight on time — go straight to D7)**

---

### D6: Compile PATs into CATs

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

💬 `Compile the PAT stubs into runnable tests for TODOM-001c.`

👻 Kiro generates:
- `pats/TODOM-001c.spec.jsx` — unit CATs (vitest + Testing Library)
- Mocked API responses, component-level assertions
- Tests match the PAT stubs 1:1

🎯 "PATs are the contract. CATs are the executable version. Every PAT
stub becomes a real test. The framework choice is per-repo — this MFE
uses vitest and Testing Library. An API would use supertest."

---

### D7: Run CATs — repo-level confidence

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🖥️ `npm test`

👀 All tests pass.

🎯 "Green at the repo level. The MFE satisfies its own contract. But
we don't know yet if it works with the rest of the system. That's
what shadow integration is for."

---

### D8: Commit, push, raise MR — trigger shadow integration

📂 `ref-projects/todo-m-workshop/pass1/todo-m-mfe`

🖥️ Commit all changes, push to feature branch, raise MR on GitLab.

🎯 "The moment this MR is created, a webhook fires. The root repo's
shadow integration pipeline starts. It's going to compose all four
components from their story branches — the speculative post-merge
state. If this passes, we know the feature works end-to-end."

🦊 Show the MR on GitLab — pipeline starting.

🎯 "Notice: the MFE's own repo pipeline runs too — that's the CATs
we just wrote. But the interesting pipeline is on the root repo."

---

### D9: Watch shadow integration — the payoff

🦊 Navigate to `todo-m-root` → CI/CD → Pipelines. Find the triggered
pipeline (source: trigger).

🎯 "Here it is. The root repo is composing the system. Let's watch
the job log."

🦊 Click into the `shadow:integration` job. Watch the log stream:

👀 The audience sees (in order):
1. Branch resolution — each repo resolved to its story branch
2. Root repo self-bootstrap — pulls integration tests from story branch
3. **HEAD component: todo-m-mfe (MR present: true)** ← the key moment
4. Docker compose build — all 4 images
5. Health checks — all 4 services healthy
6. TODOM-000 baseline tests — all pass
7. TODOM-001 story tests — GET /todos, POST /todos round-trip, validation, shell + MFE

🎯 (At HEAD detection) "There it is — the HEAD component has arrived.
Last time this said 'MR present: false' and failed structurally.
Now the MFE is here, so the gate opens and the real tests run."

🎯 (At test results) "Every acceptance criterion from the story is
verified against the composed system. API round-trip works. Validation
works. The shell composes the MFE. This is end-to-end confidence."

👀 Job passes. `shadow:report-status` pushes success back to the MFE MR.

---

### D10: The cascade — API MRs go green

🦊 Navigate back to the MR list. Show all MRs.

👀 The API MRs that were red are now green.

🎯 "The APIs didn't change. Not a single line of code. But the HEAD
arrived, shadow integration passed, and the success status was pushed
back to every MR in the story. Red to green, automatically."

🎯 "This is the core insight of Methodology M: you don't ask 'are we
ready to integrate?' — the system tells you."

---

### D11: Merge

🦊 Merge the MRs. (Order: root first, then APIs, then MFE — or cascade
if implemented.)

🎯 "All gates are green. We merge. In a full M setup, this would be a
merge transaction — atomic, all-or-nothing across all repos. For the
demo, we'll merge them in sequence."

TODO: determine if cascade merge is feasible. If so, replace with
single-click merge of HEAD triggering the rest.

---

### D12: The running app

🌐 Open the app in the browser (Docker Compose).

👀 The todo app works:
- List shows existing todos (or empty state)
- Type a title, click Add
- New todo appears in the list

🎯 "From story to running software. Every step traceable: story →
sub-tasks → PATs → implementation → CATs → shadow integration →
merge. No guesswork. No 'hey, is your MR ready?' messages. The
system orchestrates itself."

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

| Section | Target | Notes |
|---------|--------|-------|
| Part 1: Slides | 10 min | Keep it tight, no tangents |
| D1–D3: Orientation | 3 min | Quick tour, set the scene |
| D4: Implement | 2.5 min | Kiro reads contract + implements, presenter narrates |
| D5: Validate locally | 1 min | Skip if tight on time |
| D6–D7: CATs | 1 min | Compile + run, quick |
| D8: Push MR | 30 sec | Mechanical |
| D9: Watch pipeline | 2 min | The money shot — narrate the log |
| D10: Cascade green | 30 sec | Show the MR list, red → green |
| D11: Merge | 30 sec | Click merge |
| D12: Running app | 1 min | The finale |
| Questions | 5 min | Buffer |
| **Total** | **~22 min** | Trim D5 if over time |

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
