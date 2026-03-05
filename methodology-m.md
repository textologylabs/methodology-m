# Methodology M: AI-Driven Managed Multi-Team Delivery Method

**Version 1.0 — Draft**

## Preface

Methodology M builds on the AI-first SDLC introduced in Part 1 — PATs as the core mechanism, change encapsulated with its validation, the three-phase pipeline (Idea → Development → Deployment). Part 1 assumed a simple case: one repo, one deployable, PATs living alongside the code.

Methodology M addresses the distributed reality: what happens when a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment. The answer is a complete delivery method — not just a process document, but a publishable skill that bootstraps itself.

An M-type project is any project following this methodology. The M stands for Managed change, Multi-team coordination, Multi-repo orchestration.

---

## 1. The Root Repo Model

### Everything is a root repo

There is no "simple case" and "complex case." There's one model. Every deliverable change lives in a root repo. The only variable is how the code gets there:

- **Embedded:** The code lives directly in the root repo. This is a typical repo today — it just happens to be a root repo that contains its own code.
- **Referenced:** Code that lives in separate repositories, watched and version-pinned by the root repo.

All components are managed by the root repo. The type — embedded or referenced — only describes where the code physically lives. From the outside, they look identical.

### Terminology

- **Root repo:** The orchestrating unit. Contains story-level PATs, topology, the shell/entry-point UI, and optionally other embedded code.
- **Managed repo:** Any component in the topology — whether embedded or referenced. All are managed by the root repo.
- **Self-contained root repo:** All components embedded. What most repos are today.
- **Composite root repo:** Has one or more referenced components. May also contain embedded code (hybrid).

### The shell belongs in the root repo

The application's entry point — the shell UI, the SPA host, the main layout — is embedded in the root repo. The shell is the integration surface. It composes the microfrontends, wires up routing, provides the chrome. Story-level PATs run against the composed system. The shell IS the composed system. The tests need to live where the shell lives.

This means the root repo is never just orchestration metadata. It always contains at least the shell — the thing that makes the system a system.

### The project file

Every root repo has a `project.yaml` — even self-contained ones. It's a complete map of all components, where they live, and how to get them.

```
# project.yaml — self-contained root repo
components:
  - name: ui-checkout
    type: embedded
    location: ./packages/ui-checkout
    tag: v1.0.0
    role: frontend
  - name: api-orders
    type: embedded
    location: ./packages/api-orders
    tag: v1.0.0
    role: backend
```

```
# project.yaml — composite/hybrid root repo
components:
  - name: ui-checkout
    type: embedded
    location: ./packages/ui-checkout
    tag: v1.2.0
    role: frontend
  - name: api-orders
    type: referenced
    location: gitlab.com/org/api-orders
    tag: v1.0.0
    role: backend
```

Key fields:
- **location:** Where the code lives. Relative path for embedded, remote URL for referenced.
- **type:** `embedded` or `referenced`.
- **tag:** The pinned version. Every component has one — explicit over implicit.

The project file is the source of truth for "what works together." Every commit to main represents a validated combination.

### Evolution: self-contained to composite

A self-contained root repo evolves into a composite one without restructuring. You move a component from `type: embedded` to `type: referenced`. The PAT levels were already separate. The CI contract was already the same. The only thing that changes is where the code comes from.

---

## 2. PAT Topology

### Two levels of PATs, two distinct scopes

- **Repo-level PATs:** "Does this component fulfil its contract?" Lives in the managed repo. Runs in the component's own pipeline. Tests the component in isolation — mocked data, Storybook, dev containers, API test suites.
- **Story-level PATs:** "Does this combination deliver user value?" Lives in the root repo. Runs against the composed system. Tests user outcomes through the shell. Can only run where the full system exists.

These are genuinely different artefacts testing different things. Story-level PATs cannot run in a managed repo — the managed repo doesn't have the full system. Repo-level PATs don't run in the root repo — they're component contracts, not user outcomes.

### PATs flow downward, not upward

Story-level PATs are written first, during the Idea phase. They're topology-agnostic — pure user-outcome statements.

Decomposition happens in three phases:

1. **Story-level PATs** — Pure user-outcome statements. No topology, no technical awareness. The BA writes these (or AI generates them from the story). They live in the root repo from the start.
2. **Architectural mapping** — Someone (or an AI agent) maps the story to the topology: which components are affected.
3. **PAT decomposition** — Story-level PATs decompose into repo-level PATs based on the mapping. Each component gets the subset of promises it needs to keep.

You don't write repo-level PATs and hope they add up to user value. You write user-level PATs and decompose them into repo-level contracts.

### Local integration testing

A managed repo dev who wants to see their work in the context of the full system checks out the root repo and configures it to point at their local managed repo instance. For MFEs, this is a one-line config change in the Module Federation remotes. For APIs, it's an environment variable pointing at the local service.

The root repo is always the integration surface. The managed repo is always the isolation surface.

### Story-level PATs to Cypress

The shell/integration developer works in the root repo, composes the system locally, validates story-level PATs with Playwright, and when satisfied, generates Cypress. The Cypress tests get committed to the root repo and become the permanent integration regression suite.

No AI in the pipeline, no PAT-to-Cypress transformation at CI time. The transformation happened during development, reviewed by a human.

---

## 3. Distributed Trunk-Based Development

### The framing

This is one system, one product, physically distributed across repos. The components are tightly coupled by design — same users, same business domain, same release cadence.

- Every managed repo does trunk-based dev (short-lived feature branches, merge to main frequently)
- The root repo's main branch IS the distributed trunk — the current validated state of the whole system
- Every commit on the root repo's main is a complete, validated, deployable state

### Three distinct events

1. **Merge** — Dev merges MR to managed repo trunk. Repo-level PATs gate this. Each MR carries a sub-task ID in its title.
2. **Release** — Auto-tagged on every merge to main. CI bumps the version and creates a tag automatically. The dev doesn't manually tag anything.
3. **Deploy** — A human decision. Someone looks at the root repo's main and says "deploy this one."

### Auto-tagging: merge IS release

Every merge to main auto-tags. CI handles versioning. The dev's only job is to merge. Each auto-tag becomes the new "high water mark" for whatever sub-tasks it contains.

### Build vs Deployment

- **Build is independent.** Each managed repo builds and publishes its own artefact as part of its CI on every auto-tag. The repo owns its build process.
- **Deployment is concerted.** The root repo owns the deployment manifest. When a topology commit is deployed, it deploys the whole system at the pinned versions.

Repos own their build. The root repo owns the system state.

### Deployment strategy is out of scope

Methodology M delivers a validated, deployable topology — a commit on root repo main where every component version has been integration-tested together. That's where M's responsibility ends.

How that topology reaches production — blue/green, canary, rolling, `docker compose up`, Helm upgrade, copying files to a server — is a deployment strategy decision, orthogonal to the methodology. Deployment strategies are well-understood, project-specific, and not where M adds value. M's contribution is ensuring that whatever you deploy has been validated as a coherent whole.

---

## 4. CI/CD Orchestration

### The root repo watches its components

When a referenced component merges and tags a new version:

1. The root repo receives the event
2. Creates a PR bumping the topology to the new version
3. Runs story-level Cypress tests against the updated combination
4. If tests pass, the PR is green and can merge
5. Merged topology = validated combination = deployable

### Story readiness and orchestration

During the Idea phase, the AI writes a readiness tracker to the root repo:

```
# stories/PROJ-001.yaml
story: PROJ-001
description: User can see a list of todos
status: in-progress

components:
  - name: todo-api-read
    subtask: PROJ-001a
    high-water-mark: null
  - name: todo-mfe
    subtask: PROJ-001b
    high-water-mark: null

story-pats:
  - pats/PROJ-001.pat.yaml
```

As auto-tags land, high water marks update. When all components have a high water mark, the story is ready for integration.

### Readiness tracker lifecycle

```
pending        → just created, no high water marks yet
in-progress    → some high water marks, waiting for others
integrating    → all high water marks present, story-level tests running
failed         → story-level tests failed (with details)
validated      → tests passed, topology commit on main
archived       → moved to stories/done/ after production deploy
```

### Merge atomicity at the root level

The root repo's trunk receives complete stories only. When all sub-tasks for a story have released, the root repo makes one topology commit that pins all new component versions together. Every commit on the root repo's main is either the previous validated state or the previous state plus a complete story.

### Shadow integration: the logical MR

The model described above — wait for all components to merge, then bump topology and test — catches integration failures after the fact. By the time story-level tests fail, the managed repo MRs have already merged. The code is on trunk. Fixing it means another round of branch-implement-merge-tag, and in the meantime the failure creates noise and confusion.

Shadow integration prevents this by testing the combination before any managed repo MR merges. The mechanism is a topology MR on the root repo that mirrors the lifecycle of the managed repo MRs — a logical MR that spans repos.

**How it works:**

1. A dev raises an MR on a managed repo (e.g. `todo-api-read`, branch `feat/PROJ-001a`). The managed repo's MR pipeline builds and publishes a pre-release artefact (e.g. `todo-api-read:mr-42` or `v0.0.0-mr.42`).

2. The root repo detects the MR (via webhook), reads the sub-task ID from the MR title, and auto-creates a topology MR on the root repo. This MR pins `todo-api-read` to the pre-release artefact. Everything else stays at the current stable versions.

3. Root repo CI runs the full story-level Cypress suite against this speculative topology. The result is visible on the root repo's topology MR — green or red.

4. If a second dev raises an MR on `todo-mfe` for the same story (PROJ-001b), the existing root repo topology MR is updated — it now pins both `todo-api-read` and `todo-mfe` to their pre-release artefacts. Story-level tests re-run against the combined state.

5. The root repo topology MR becomes the story's integration dashboard. One MR shows: which components are involved, what state each is in, whether the combination passes integration tests.

**What this gives you:**

- Integration failures surface on the managed repo dev's timeline, not after merge. They see "root integration: failing" as a status check on their own MR. They can fix it before merging.
- Multi-component stories are tested together before any individual piece merges. The combination is validated speculatively.
- The root repo stays the integration surface. Managed repos don't need to know about the root repo's pipeline. The dependency direction is preserved — root watches managed, never the reverse.
- The mental model is familiar. It's an MR with CI. The fact that it spans repos is an implementation detail.

**Pre-release artefact contract:**

Managed repo CI pipelines need one addition: publish a pre-release artefact on MR pipelines, not just on merge. For Docker images, this is a tag like `mr-42`. For npm packages, a pre-release version like `0.0.0-mr.42`. For MFEs, a build deployed to a preview URL. The root repo pulls these during speculative integration runs.

This is the only new requirement on managed repos — and it's a CI configuration change, not a conceptual one.

**The topology MR as living status document:**

The root repo CI maintains the topology MR description as a living summary of the story's integration state. When anyone on the team opens the MR, they see:

- The story ID and description
- A table of sub-tasks: component name, sub-task ID, managed repo MR link, artefact version, status (pending / in MR / merged)
- Gate status: completeness (3/3 sub-tasks present, or 2/3 — waiting on `todo-api-write`) and behavioural (story-level PATs passing / failing, with last run timestamp)
- Links to the managed repo MRs, so reviewers can navigate the full picture from one place

CI updates this description automatically as events arrive — new MRs detected, artefacts published, test runs completed, MRs merged. No one maintains it manually. It's always current.

This makes the topology MR the single point of visibility for a story's progress across the distributed system. No chasing across repos, no status meetings, no "where are we with PROJ-001?" in Slack. Open the MR, read the description.

### The merge transaction

When the root repo topology MR is green — all story-level tests pass against the combined pre-release artefacts — the story is ready to land. But landing it means merging multiple MRs across multiple repos atomically. This is a distributed transaction.

The coordinator is a GitLab CI pipeline on the root repo. It can be triggered automatically when both gates pass, or manually by a human who decides the timing is right.

**The sequence:**

1. Both gates pass: the completeness gate (all sub-tasks have pre-release artefacts in the topology MR) and the behavioural gate (story-level PATs green). The merge transaction pipeline is triggered.

2. The pipeline verifies that no managed repo MR has changed since the last passing integration run. If any MR head has moved, it re-triggers the shadow integration and waits for a green result before proceeding.

3. The pipeline merges managed repo MRs in dependency order — contract providers first (APIs before UIs). Each merge triggers the managed repo's auto-tag. This uses GitLab API calls (project access tokens configured during bootstrap).

4. The pipeline updates the root repo topology MR: swaps pre-release artefact references to the real tags produced by the auto-tagging.

5. Story-level Cypress suite runs one final time against the real tagged versions. This is the belt-and-braces check — pre-release and tagged artefacts should be identical (same commit), but the final run confirms it.

6. If green, the pipeline merges the root repo topology MR. Main moves forward. The story is validated.

**The dual gate: behaviour AND completeness**

A green story-level test suite is necessary but not sufficient. Story-level PATs validate observable behaviour — but not all sub-tasks produce observable behaviour. A component might change internal data formats, storage patterns, logging, or operational characteristics. These changes are invisible to PATs but essential to the story. If the topology MR is missing a sub-task's artefact, the tests might pass against the old version of that component — and fail in production when the other components expect the new one.

The merge transaction therefore enforces two gates:

- **Behavioural gate:** Story-level PATs pass against the speculative topology. The combination works.
- **Completeness gate:** Every sub-task in the readiness tracker has a corresponding pre-release artefact in the topology MR. All parts are present.

Both must pass before the merge transaction pipeline will initiate the merge sequence. PATs catch what's broken. The completeness check catches what's missing.

This places critical weight on the decomposition phase. If the Story Decomposer fails to identify an affected component — misses an invisible dependency, a data-flow coupling, a downstream service that needs updating — the readiness tracker won't track it, and the completeness gate won't catch its absence. The decomposition is the single point of failure for story integrity.

This is where AI impact analysis earns its keep. The Story Decomposer must trace data flows through the topology, not just map UI changes to components. It needs architectural knowledge: which services share data contracts, which components have implicit coupling through shared storage or event buses, which operational changes are prerequisites for behavioural ones. The `project.yaml` topology and the component contracts (API schemas, event definitions) are its inputs. The output must capture every component that needs to change — including the ones whose changes are invisible to the end user.

**Partial failure:**

If a managed repo MR fails to merge (conflict, pipeline failure), the pipeline stops and reports the state. Managed repo MRs that already merged are not rolled back — they don't need to be. The root repo main hasn't moved. The auto-tagged versions exist but aren't in the topology. The system is in a safe state.

The pipeline updates the root repo topology MR to reflect reality: merged components at real tags, unmerged components still at pre-release artefacts. The dev fixes the failing MR, the shadow integration re-runs, and the transaction can be retried.

This is not a two-phase commit. There's no rollback. The safety comes from the root repo's main being the only thing that matters for deployment — and it only moves forward on a fully validated combination. Partial merges on managed repos are harmless because the topology hasn't changed.

**Fully automated, human-gated:**

The merge transaction is deterministic — no judgement, no AI required. Check gates, merge in order, update topology, verify. A CI pipeline is the right tool. The only human decision is whether to enable auto-merge (both gates pass → transaction fires automatically) or require manual trigger (human reviews the green topology MR and clicks "go"). This is a project-level configuration choice, not a methodology decision.

---

## 5. Kiro and GitLab CI: Separation of Concerns

### The boundary

The methodology has two distinct automation layers with a clean separation: Kiro handles the phases where AI adds value (understanding stories, tracing dependencies, generating tests), GitLab CI handles the phases where deterministic automation is sufficient (building, testing, orchestrating, deploying). They meet in the middle at the git repo — Kiro produces files that CI consumes.

### GitLab CI: the orchestration layer

Everything from merge to deployment is GitLab CI. No AI in the loop.

- **Managed repo pipelines:** Build, run repo-level PATs, publish artefacts. On MR: publish pre-release artefact. On merge to main: auto-tag, publish release artefact.
- **Shadow integration:** Detect managed repo MRs (via webhooks), create/update topology MR on root repo, run story-level Cypress suite against speculative topology, report status.
- **Topology MR maintenance:** Update MR description with sub-task status, gate results, managed repo MR links. Templated from readiness tracker state.
- **Merge transaction:** When both gates pass (completeness + behavioural), merge managed repo MRs in dependency order, update topology to real tags, final verification run, merge topology MR.
- **Deployment pipeline:** Staging → NFT → canary → production. Manual gate between validated topology and deployment.

This is conventional CI/CD — pipelines, webhooks, API calls, scripts. The complexity is in the orchestration logic, not in AI reasoning.

### Kiro: the thinking layer

Kiro operates in the IDE during the human-interactive phases. Its value is in understanding intent, tracing impact, and generating structured artefacts that feed into the CI layer.

**Idea phase (root repo, BA/QA/dev):**

- **PAT Generator** — Reads a story ticket (local markdown or Jira via MCP), generates story-level PATs against the PAT.yaml schema. Knows the when/then structure, data-testid conventions, replaces/removes mechanics. Outputs a draft `pats/PROJ-XXX.pat.yaml` for human review.
- **Story Decomposer** — Reads story-level PATs + `project.yaml` topology + component contracts (API schemas, event definitions). Traces data flows to identify all affected components — including those with invisible changes (storage, operational, internal contracts). Produces sub-tasks, repo-level PATs, readiness tracker. The completeness of this decomposition is the single point of failure for story integrity; the merge transaction's completeness gate depends on it.

**Development phase (managed repo, individual dev):**

- **Repo Implementer** — Knows the repo-level PATs for the current sub-task. Guides implementation, validates against PATs via Playwright, generates Cypress when the dev is satisfied. Focused on a single component's contract.

**Cross-cutting (root repo, tech lead/dev):**

- **Ecosystem Briefing** — The morning briefing agent. Queries GitLab for recent activity (via MCP), cross-references with readiness trackers, synthesises a status summary. Which stories are in flight, which are blocked, which are ready. Awareness, not automation — the dev decides what to act on.

### Agents and hooks

Four specialist agents, living in `.kiro/agents/`:

- **PAT Generator**
- **Story Decomposer**
- **Repo Implementer**
- **Ecosystem Briefing**

Hooks trigger agents based on developer actions in the IDE:

- `fileCreated` on `jira/*.md` → PAT Generator
- `fileCreated` on `pats/*.pat.yaml` → Story Decomposer
- `userTriggered` → Validate Implementation, Generate Cypress, Project Briefing

### What Kiro does NOT do

- Merge code across repos — that's the CI merge transaction pipeline
- Update readiness trackers from tag events — that's CI webhooks
- Maintain topology MR descriptions — that's CI templating
- Run story-level tests in the pipeline — that's CI
- Deploy — that's CI with a manual gate

The line is simple: if it requires understanding intent or generating novel artefacts, it's Kiro. If it's executing a deterministic sequence, it's CI.

### The Ecosystem Briefing as developer workflow

The briefing is the bridge between the CI layer and the developer's day. The agent reads the state that CI has produced (readiness trackers, topology MR statuses, recent tags) and presents it as a human-readable summary. It might suggest actions — "PROJ-001 is ready for integration, want to review the topology MR?" — but it doesn't execute them. The dev reviews, decides, acts.

No auto-commit, no pushing — everything is information and suggestion, not automation.

---

## 6. The M-Project Skill

### What it is

The knowledge of how to create an M-type project from scratch, packaged as a Kiro skill — a publishable, installable module following the open Agent Skills standard.

### Instantiation parameters

The skill asks questions during bootstrap, like `create-react-app` or `npm init`. The methodology stays identical regardless of the answers — the parameters only affect the physical scaffolding.

- **Topology mode:** `distributed` (separate repos from day one) or `monolith-first` (everything embedded, split story template included)
- **Component catalogue:** what you're building — names, roles, types
- **CI platform:** GitLab CI, GitHub Actions, or none
- **Story management:** local markdown (`jira/` folder) or Jira via MCP
- **PAT test framework:** Cypress, Playwright, or both
- **Deployment model:** Docker Compose, Kubernetes/Helm, or none

### What it generates

- Root repo with `project.yaml`, shell package, `.kiro/` folder (agents, hooks, steering)
- Managed repo stubs (or instructions for creating them)
- Story Zero (PROJ-000) with PAT, sub-tasks, readiness tracker — adapted to the topology mode
- CI pipeline configs for the chosen platform
- Deployment templates for the chosen model

### The layering

- **Skill** (user-level) — knows how to create an M-type project. Loaded on demand. Publishable.
- **Steering** (project-level) — the project constitution. Generated by the skill, tailored to the chosen parameters.
- **Agents** (project-level) — the phase specialists. Generated during bootstrap.
- **Hooks** (project-level) — the triggers. Generated during bootstrap, adapted to instantiation parameters.

The skill creates the project. The project sustains itself through steering, agents, and hooks.

---

## 7. Story Zero: Project Genesis

### The bootstrapping story

The very first story in an M-type project is PROJ-000 — a technical bootstrapping story that proves the infrastructure works. It uses the same PAT-driven flow as every story that follows. No special case. No "set things up manually, then start using the process." The methodology applies from the first commit.

This is important. If Story Zero were a manual setup phase — create repos, wire pipelines, hope it works — then the methodology would start at Story One. Every team would have a different "how we got here" story, and the foundations would be untested. Instead, Story Zero is an M-type story. It has PATs, sub-tasks, a readiness tracker, shadow integration, a merge transaction. The scaffolding is the implementation. The PAT validates that it works.

### Starting state: nothing

A tech lead has the M-project skill installed. Nothing else exists.

```
"Create an M-type project called todo-app with a shell, a todo-mfe,
 a todo-api-read, and a todo-api-write. Distributed, GitLab CI,
 local markdown, Cypress, Docker Compose."
```

The skill scaffolds:
- Root repo (`todo-root`) with `project.yaml`, `.kiro/` folder (agents, hooks, steering), shell package stub
- Managed repo stubs for `todo-mfe`, `todo-api-read`, `todo-api-write`
- Story Zero already written: story ticket (`jira/PROJ-000.md`), story-level PAT (`pats/PROJ-000.pat.yaml`), sub-tasks, readiness tracker

At this point, nothing works. The repos exist but contain only scaffolding. The `project.yaml` has null tags — nothing has been released yet. The story-level PATs would fail if you ran them — there's nothing to test against.

### The Idea phase — already done

The skill generated the Idea phase artefacts during bootstrap:

Story-level PAT (topology-agnostic, pure user outcomes):

```
story: PROJ-000
version: 1

acceptance:
  - id: AC-001
    when: user navigates to the app
    then: shell loads and displays content from the MFE
    steps:
      - navigate: /
      - assert: "[data-testid='app-shell']" is visible
      - assert: "[data-testid='mfe-content']" is visible

  - id: AC-002
    when: MFE loads
    then: it fetches from the API and displays the response
    steps:
      - navigate: /
      - assert: "[data-testid='api-message']" contains "Hello"
```

Decomposition into sub-tasks:

| Sub-task  | Component      | Work                                        |
|-----------|----------------|---------------------------------------------|
| PROJ-000a | todo-api-read  | Hello endpoint (`GET /hello`)               |
| PROJ-000b | todo-api-write | Placeholder endpoint (`POST /placeholder`)  |
| PROJ-000c | todo-mfe       | Hello component, fetches from API           |
| PROJ-000d | todo-root      | Shell, Module Federation host, Cypress      |

Readiness tracker:

```
story: PROJ-000
status: pending

components:
  - name: todo-api-read
    subtask: PROJ-000a
    high-water-mark: null
  - name: todo-api-write
    subtask: PROJ-000b
    high-water-mark: null
  - name: todo-mfe
    subtask: PROJ-000c
    high-water-mark: null
  - name: shell
    subtask: PROJ-000d
    high-water-mark: null

story-pats:
  - pats/PROJ-000.pat.yaml
```

This is the same structure as any story. The fact that the "implementation" is scaffolding rather than feature code is irrelevant to the methodology.

### The Development phase — four devs, four repos

Each dev picks up a sub-task and works in their managed repo. The flow is identical to any subsequent story.

**Alex (PROJ-000a) in todo-api-read:**
- Scaffolds Node.js/Express, implements `GET /hello` → `{ "message": "Hello from API Read" }`
- Adds `.gitlab-ci.yml` with build, test, auto-tag stages
- Repo-level PAT: "GET /hello returns 200 with message field"
- Raises MR → managed repo pipeline builds, publishes pre-release artefact
- Root repo detects MR, creates/updates topology MR for PROJ-000

**Jordan (PROJ-000b) in todo-api-write:**
- Scaffolds Node.js/Express, implements `POST /placeholder` → 200 OK
- Repo-level PAT: "POST /placeholder returns 200"
- Raises MR → pre-release artefact published → topology MR updated

**Sam (PROJ-000c) in todo-mfe:**
- Scaffolds React with Module Federation, implements component that fetches from API
- Repo-level PAT: "Given API returns message, component displays it" (mocked)
- Raises MR → pre-release artefact published → topology MR updated

**Casey (PROJ-000d) in todo-root:**
- Implements shell as Module Federation host
- Configures remotes to load `todo-mfe`, wires API URL via environment
- Composes system locally, validates story-level PATs via Playwright
- Generates Cypress from PATs, commits to `cypress/integration/PROJ-000.cy.js`

### Shadow integration validates the combination

As MRs are raised, the root repo's topology MR accumulates pre-release artefacts from all four sub-tasks. Story-level Cypress tests run against the speculative topology — shell loading MFE, MFE calling API, the full stack composed from MR artefacts.

The topology MR description shows the status:

```
PROJ-000: System Bootstrap

Component       Sub-task   MR     Artefact       Status
todo-api-read   PROJ-000a  !1     mr-1           ✓
todo-api-write  PROJ-000b  !1     mr-1           ✓
todo-mfe        PROJ-000c  !1     mr-1           ✓
shell           PROJ-000d  —      (embedded)     ✓

Completeness: 4/4
Behavioural:  GREEN
```

### Merge transaction lands the story

Both gates pass. The merge transaction pipeline fires:

```
→ Merges todo-api-read MR → auto-tag v0.1.0
→ Merges todo-api-write MR → auto-tag v0.1.0
→ Merges todo-mfe MR → auto-tag v0.1.0
→ Updates topology MR: all components pinned to v0.1.0
→ Final story-level Cypress run against real tags
→ Green → merges topology MR to root repo main
```

### End state

```
# project.yaml (todo-root) after Story Zero
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v0.1.0
    role: frontend-host
  - name: todo-mfe
    type: referenced
    location: gitlab.com/org/todo-mfe
    tag: v0.1.0
    role: frontend
  - name: todo-api-read
    type: referenced
    location: gitlab.com/org/todo-api-read
    tag: v0.1.0
    role: backend
  - name: todo-api-write
    type: referenced
    location: gitlab.com/org/todo-api-write
    tag: v0.1.0
    role: backend
```

The M-type project exists. The distributed plumbing is proven. CI pipelines work. Shadow integration works. The merge transaction works. Story-level PATs validate the composed system. Every subsequent story builds on this baseline.

### What Story Zero proves

The methodology works from day zero. There is no pre-methodology setup phase. The same flow that delivers user stories — PATs, decomposition, readiness tracking, shadow integration, merge transaction — also delivers the project's foundations. If Story Zero passes, the team knows the entire pipeline is live. If it fails, they know before any real feature work begins.

---

## 8. Scenarios

Real-world scenarios demonstrating the methodology in action. Each uses the Todo reference implementation topology: shell (embedded), todo-mfe (referenced), todo-api-read (referenced), todo-api-write (referenced).

### Scenario 1: Coordinated story, two devs

**PROJ-001: User can see a list of todos**

Touches: todo-api-read + todo-mfe. Demonstrates the full flow — shadow integration, logical MR, merge transaction.

```
Idea phase:
  → Story-level PATs written (topology-agnostic)
  → Story Decomposer maps to topology → todo-api-read + todo-mfe
  → Sub-tasks: PROJ-001a (API), PROJ-001b (MFE)
  → Readiness tracker written to root repo

API dev (PROJ-001a) raises MR on todo-api-read:
  → MR pipeline builds, publishes pre-release artefact todo-api-read:mr-12
  → Root repo detects MR via webhook
  → Root repo auto-creates topology MR:
      pins todo-api-read to mr-12, everything else at stable versions
  → Story-level Cypress runs against speculative topology
  → Green — API change is backward-compatible with current MFE

MFE dev (PROJ-001b) raises MR on todo-mfe:
  → MR pipeline builds, publishes pre-release artefact todo-mfe:mr-8
  → Root repo detects MR, updates existing topology MR:
      now pins both todo-api-read:mr-12 AND todo-mfe:mr-8
  → Story-level Cypress re-runs against combined state
  → Green — the combination works

Topology MR description (maintained by CI):
  ┌─────────────────────────────────────────────────┐
  │ PROJ-001: User can see a list of todos          │
  │                                                 │
  │ Component       Sub-task   MR     Artefact      │
  │ todo-api-read   PROJ-001a  !12    mr-12    ✓    │
  │ todo-mfe        PROJ-001b  !8     mr-8     ✓    │
  │                                                 │
  │ Completeness: 2/2                               │
  │ Behavioural:  GREEN (2026-02-24T10:30:00Z)      │
  └─────────────────────────────────────────────────┘

Merge transaction (CI pipeline, auto-triggered on dual gate pass):
  → Verifies MR heads haven't changed since last green run
  → Merges todo-api-read MR → auto-tag v1.0.0
  → Merges todo-mfe MR → auto-tag v1.0.0
  → Updates topology MR: todo-api-read@v1.0.0, todo-mfe@v1.0.0
  → Final story-level Cypress run against real tags
  → Green → merges topology MR to root repo main

End state: root repo main has validated topology with both components
at v1.0.0. Ready to deploy.
```

What this demonstrates: shadow integration testing the combination before any MR merges, the topology MR as a living dashboard, the merge transaction landing everything atomically.

### Scenario 2: Single-component story

**PROJ-005: API returns todo count in response headers**

Touches: todo-api-read only. A backward-compatible addition.

```
Idea phase:
  → Story-level PATs written
  → Story Decomposer maps to topology → only todo-api-read
  → Single sub-task: PROJ-005a. No decomposition needed.
  → Readiness tracker: one component

API dev raises MR on todo-api-read:
  → MR pipeline builds, publishes pre-release artefact
  → Root repo creates topology MR pinning todo-api-read to pre-release
  → Story-level Cypress runs ALL tests (not just this story's)
  → Existing tests pass (nothing broke) + new test passes
  → Green

Merge transaction:
  → Completeness: 1/1. Behavioural: green.
  → Merges todo-api-read MR → auto-tag v1.1.0
  → Updates topology, final run, merges
```

Feels identical to working in a monolith. The dev doesn't think about the root repo. The machinery is invisible. Backward compatibility isn't declared — the story-level tests prove it by passing.

### Scenario 3: Breaking change caught by shadow integration

**PROJ-006: Refactor todo response format**

Touches: todo-api-read only (dev thinks). Actually breaks todo-mfe.

```
API dev raises MR on todo-api-read:
  → Changes the JSON response shape (renames 'title' to 'name')
  → Repo-level PATs pass — the API works in isolation
  → MR pipeline publishes pre-release artefact

Root repo creates topology MR:
  → Pins todo-api-read to pre-release artefact
  → Story-level Cypress runs against speculative topology
  → FAIL — todo-mfe expects 'title', gets 'name'
  → Topology MR is RED

The dev sees "root integration: failing" on their managed repo MR.
Nothing has merged. Nothing is broken. The dev has options:

  Option A: Fix the API to maintain backward compatibility.
    → Push fix to MR branch
    → New pre-release artefact published
    → Root repo re-runs shadow integration
    → Green → proceed with merge transaction

  Option B: This is actually a multi-component change.
    → Story goes back through Idea phase with proper decomposition
    → Story Decomposer identifies todo-api-read + todo-mfe
    → MFE dev raises MR adapting to new response format
    → Both MRs appear in the topology MR
    → Shadow integration tests the combination
    → Green → merge transaction lands both
```

This is the scenario that justifies shadow integration. Without it, the API MR merges, auto-tags, the root repo bumps topology, story-level tests fail — and now the breaking change is on trunk. With shadow integration, the failure surfaces on the dev's MR before merge. Prevention, not cure.

### Scenario 4: Two independent stories in the same component

**Story A (PROJ-007): Improve error messages** → touches todo-api-read
**Story B (PROJ-008): Add search endpoint** → touches todo-api-read

Two devs, same repo, different stories. Trunk-based dev means their work interleaves.

```
Dev 1 (Story A) raises MR on todo-api-read:
  → Root repo creates topology MR for PROJ-007
  → Shadow integration: green

Dev 2 (Story B) raises MR on todo-api-read:
  → Root repo creates separate topology MR for PROJ-008
  → Shadow integration: green

Dev 1's MR merges first (via PROJ-007 merge transaction):
  → todo-api-read auto-tags v1.2.0
  → PROJ-007 topology MR lands on root main

Dev 2's MR now has a stale base:
  → Dev 2 rebases onto todo-api-read main (includes v1.2.0 changes)
  → New pre-release artefact published
  → PROJ-008 topology MR re-runs shadow integration
  → Green → merge transaction proceeds
  → todo-api-read auto-tags v1.3.0 (includes both stories)
  → PROJ-008 topology MR lands on root main
```

Each story has its own topology MR, its own shadow integration, its own merge transaction. They don't interfere. The root repo's main receives two sequential topology commits, each independently valid. A release manager can deploy either — or skip straight to the second, since v1.3.0 includes v1.2.0's changes.

### Scenario 5: Merge transaction partial failure

**PROJ-009: User can delete a todo** → touches todo-api-write + todo-mfe

Both MRs are green in shadow integration. Merge transaction begins.

```
Merge transaction starts:
  → Merges todo-api-write MR → auto-tag v1.1.0 ✓
  → Attempts to merge todo-mfe MR → CONFLICT (another MR landed
    on todo-mfe main between shadow integration and now)
  → Pipeline stops. Reports state.

Current state:
  → todo-api-write: merged at v1.1.0 (on managed repo trunk)
  → todo-mfe: MR still open, conflict
  → Root repo main: unchanged (still at previous validated topology)

This is safe because:
  → todo-api-write@v1.1.0 exists but isn't in the root topology
  → The system is still running the previous validated combination
  → Nothing is deployed, nothing is broken

Resolution:
  → MFE dev resolves conflict, pushes to MR branch
  → New pre-release artefact published
  → Shadow integration re-runs (todo-api-write now at real tag v1.1.0,
    todo-mfe at updated pre-release)
  → Green → merge transaction retries
  → todo-mfe MR merges → auto-tag v1.2.0
  → Topology updated to real tags, final run, merged
```

This demonstrates why the merge transaction doesn't need rollback. The root repo main is the only thing that matters for deployment, and it only moves forward on fully validated combinations. Partial merges on managed repos are harmless — the artefacts exist but aren't in the topology.

---

## Appendices

### A. PAT.yaml schema reference

```
story: PROJ-XXX                    # story ID
version: 1                         # schema version

acceptance:
  - id: AC-001                     # unique within the story
    when: <user action or state>   # trigger condition (plain English)
    then: <expected outcome>       # observable result (plain English)
    steps:                         # ordered test steps
      - navigate: /path            # navigate to URL
      - click: "[data-testid='x']" # interact with element
      - type: "[data-testid='x']" value "text"  # input text
      - assert: "[data-testid='x']" is visible   # visibility check
      - assert: "[data-testid='x']" contains "y" # content check
      - assert: "[data-testid='x']" count > 0    # count check
      - wait: "[data-testid='x']" is visible      # wait for element
    replaces: AC-old-id            # optional: supersedes a previous AC
    removes: AC-old-id             # optional: explicitly removes a previous AC
```

Conventions:
- All interactive elements use `data-testid` attributes for stable selectors.
- `when`/`then` are plain English — topology-agnostic, no technical implementation details.
- `steps` are ordered and deterministic — suitable for direct Cypress translation.
- Story-level PATs live in the root repo under `pats/`.
- Repo-level PATs live in the managed repo under `pats/` with the same schema but scoped to component behaviour.

### B. project.yaml schema reference

```
components:
  - name: <component-name>         # unique identifier
    type: embedded | referenced     # where the code lives
    location: <path-or-url>         # relative path (embedded) or remote URL (referenced)
    tag: <semver>                   # pinned version (e.g. v1.0.0)
    role: <role>                    # frontend | backend | frontend-host | worker | etc.
```

Rules:
- Every component has all five fields — no optional fields, no implicit defaults.
- `location` for embedded: relative path from root repo (e.g. `./packages/shell`).
- `location` for referenced: full remote URL (e.g. `gitlab.com/org/todo-mfe`).
- `tag` is always explicit. No `latest`, no branch references on main.
- During shadow integration, the topology MR may temporarily pin to pre-release artefacts (e.g. `v0.0.0-mr.42`). These are never merged to main — the merge transaction replaces them with real tags.
- Every commit on main represents a validated combination — all tags resolve to tested, released artefacts.

### C. Readiness tracker schema reference

```
story: PROJ-XXX                     # story ID
description: <story description>    # human-readable summary
status: pending | in-progress | integrating | failed | validated | archived

components:
  - name: <component-name>          # matches project.yaml component name
    subtask: PROJ-XXXa              # sub-task ID
    high-water-mark: <tag> | null   # latest auto-tagged version satisfying this sub-task

story-pats:
  - pats/PROJ-XXX.pat.yaml          # reference to story-level PAT file(s)

# Present only when status is 'failed':
failure:
  run: <ISO-8601 timestamp>         # when the integration run happened
  topology-attempted:                # the combination that was tested
    <component-name>: <tag>
  failing-tests:                     # which PAT acceptance criteria failed
    - pats/PROJ-XXX.pat.yaml#AC-002
  summary: <human-readable failure description>
```

Lifecycle:
- `pending` → created during Idea phase, no high water marks yet.
- `in-progress` → at least one high water mark present, waiting for others.
- `integrating` → all high water marks present, story-level tests running.
- `failed` → story-level tests failed. `failure` block captures details. Retries automatically on new high water marks.
- `validated` → tests passed, topology commit landed on root repo main.
- `archived` → moved to `stories/done/` after production deploy. Full audit trail preserved.

### D. Glossary

- **M-type project:** A project following Methodology M.
- **Root repo:** The orchestrating unit containing story-level PATs, topology (`project.yaml`), and the shell. Never just metadata — always contains at least the application entry point.
- **Managed repo:** Any component in the topology, whether embedded or referenced. All are managed by the root repo.
- **Self-contained root repo:** A root repo where all components are embedded. What most repos are today.
- **Composite root repo:** A root repo with one or more referenced components. May also contain embedded code (hybrid).
- **Story-level PAT:** User-outcome validation that runs against the composed system in the root repo. Topology-agnostic — written in terms of user behaviour, not components.
- **Repo-level PAT:** Component-contract validation that runs in isolation in the managed repo. Derived from story-level PATs during decomposition.
- **Topology:** The `project.yaml` — the source of truth for what works together. Every commit on root repo main represents a validated combination.
- **Topology MR:** A merge request on the root repo that pins components to specific versions. During shadow integration, pins to pre-release artefacts. After merge transaction, pins to real tags.
- **Shadow integration:** Speculative integration testing triggered when a managed repo MR is raised. Creates/updates a topology MR on the root repo to test the combination before any managed repo MR merges.
- **Logical MR:** The topology MR viewed as a single cross-repo change. Mirrors the lifecycle of a normal MR but spans multiple repos. The story's integration dashboard.
- **Merge transaction:** The deterministic CI pipeline that atomically merges all managed repo MRs for a story, updates the topology to real tags, and lands the validated combination on root repo main.
- **Dual gate:** The two conditions that must pass before a merge transaction: the behavioural gate (story-level PATs green) and the completeness gate (all sub-tasks have artefacts in the topology MR).
- **Behavioural gate:** Story-level PATs pass against the speculative topology. The combination works.
- **Completeness gate:** Every sub-task in the readiness tracker has a corresponding artefact in the topology MR. All parts are present.
- **Pre-release artefact:** A build artefact published from a managed repo MR pipeline (not from a merge to main). Used by shadow integration for speculative testing. Never deployed to production.
- **Readiness tracker:** Per-story manifest tracking which components have released and the story's integration status. Lives in the root repo under `stories/`.
- **High water mark:** The latest auto-tagged version satisfying a sub-task. Updated automatically as managed repo MRs merge and auto-tag.
- **Story Zero (PROJ-000):** The bootstrapping story that scaffolds and validates the M-type project infrastructure. Proves the distributed plumbing works before real stories begin.
- **Ecosystem Briefing:** A Kiro agent that queries GitLab for recent project activity, cross-references with readiness trackers, and presents a human-readable status summary.
