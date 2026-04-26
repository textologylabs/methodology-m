# Methodology M: AI-Driven Managed Multi-Team Delivery Method

**Version 1.1 — Draft (March 1, 2026)**

## Preface

Methodology M builds on the AI-first SDLC described in [Requirements as Code: Redesigning the SDLC for AI](https://thesingularitychronicles.hashnode.dev/requirements-as-code-redesigning-the-sdlc-for-ai). That article introduced a fundamental redesign of the software delivery lifecycle around three ideas:

- **PATs (Pseudo Acceptance Tests)** — structured, machine-readable validation criteria written in YAML. Like pseudocode describes an algorithm without being tied to a language, a PAT describes acceptance validation without being tied to a test framework. PATs travel with the code — the same artefact that describes what to build also describes how to prove it works.
- **Change encapsulated with its validation** — every story carries its PATs, its implementation, and its generated test code (Cypress) in a single commit. No separate test phase, no validation chasing after the change.
- **The three-phase pipeline (Idea → Development → Deployment)** — stories flow linearly through specification (where PATs are written and reviewed), implementation (where AI validates against PATs in real-time via Playwright, then generates deterministic Cypress tests), and deployment (where the full regression suite gates promotion through environments).

That article assumed a simple case: one repo, one deployable, PATs living alongside the code.

Methodology M takes those theoretical foundations and turns them into a practical delivery method — one that works in the real world, where a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment. The methodology itself is packaged as an AI agent skill — a reusable, installable module that can scaffold a new project from scratch, generating the repo structure, CI pipelines, and agent configuration needed to start delivering stories on day one.

An M-type project is any project following this methodology. The M stands for Managed change, Multi-team coordination, Multi-repo orchestration.

---

## 1. The Root Repo Model

### Everything is a root repo

At the centre of every M-type project is a root repo — the coordination point for the entire system. It holds the topology (which deliverables exist and at what versions), the story-level PATs that validate user outcomes, the readiness trackers that monitor story progress, and the application shell that composes everything into a running system. The project's deliverables — the individual units that make up the system, such as UI, API, shared libraries, etc. — can live in the root repo or in separate repositories:

- **Embedded:** The code lives directly in the root repo.
- **Referenced:** The code lives in its own separate repository, tracked by version in the root repo.

From the root repo's perspective, both types look identical — it coordinates them the same way. A project can start with everything embedded and gradually extract deliverables into their own repositories as the team or codebase grows, without changing the methodology.

> For definitions of terms specific to the methodology — root repo, managed repo, topology, PAT, and others — see the [Glossary](#d-glossary).

### The application entry point

The application's entry point — the shell UI, the SPA host, the main layout — is embedded in the root repo. The shell is the integration surface. It composes the microfrontends, wires up routing, provides the chrome. Story-level PATs run against the composed system, so they live in the root repo alongside the shell that composes it.

In theory, the shell could live in its own separate repository. In practice, embedding it in the root repo is a pragmatic choice — story-level PATs need to run against the composed system, and having the shell local means the root repo can compose and test the full application without pulling in another repository just to have an entry point.

### The project manifest

Every root repo has a `project.yaml` — the project manifest. It maps every deliverable in the system: its name, where the code lives, and which version was last validated as working with everything else. The manifest on `main` is always deployable to production.

```
# project.yaml — self-contained root repo
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v1.0.0
    role: frontend-host
  - name: todo-mfe
    type: embedded
    location: ./packages/todo-mfe
    tag: v1.0.0
    role: frontend
  - name: todo-api-read
    type: embedded
    location: ./packages/todo-api-read
    tag: v1.0.0
    role: backend
  - name: todo-api-write
    type: embedded
    location: ./packages/todo-api-write
    tag: v1.0.0
    role: backend
```

```
# project.yaml — composite root repo
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v1.0.0
    role: frontend-host
  - name: todo-mfe
    type: referenced
    location: gitlab.com/org/todo-mfe
    tag: v1.0.0
    role: frontend
  - name: todo-api-read
    type: referenced
    location: gitlab.com/org/todo-api-read
    tag: v1.0.0
    role: backend
  - name: todo-api-write
    type: referenced
    location: gitlab.com/org/todo-api-write
    tag: v1.0.0
    role: backend
```

Key fields:
- **location:** Where the code lives. Relative path for embedded, remote URL for referenced.
- **type:** `embedded` or `referenced`.
- **tag:** The pinned version. Every component has one — explicit over implicit.

The project manifest is the source of truth for "what works together." The tags represent the current known working state of the system — each one points to a version of a deliverable that has been validated as part of the whole.

### Embedded vs referenced

Whether a deliverable is embedded or referenced is an implementation detail — logically they're equivalent. The same workflows, validation, and coordination apply to both. Even the application entry point, which is typically embedded in the root repo for practical reasons, could live in its own repository if the project called for it. This means a project can start with everything embedded and extract deliverables into their own repositories later, without changing how the team works.

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

The root repo is where things are integrated. The managed repo is where things are built in isolation.

### From PATs to regression tests

During development, the AI agent works directly from the PATs — reading the acceptance criteria, executing the steps against the running system via MCP tools, and using the results to guide implementation. The PAT is both the specification and the live validation mechanism throughout the build process.

As the implementation stabilises, the agent autonomously distils PATs into 
deterministic acceptance tests — concrete test code that CI can execute without AI. 
The pattern is similar to a hotspot compiler: the PAT is the interpreted form 
(flexible, adaptive, works against incomplete implementations), and the acceptance 
test is the compiled form (fixed, fast, deterministic). The agent decides which 
parts of the implementation are solid enough to codify, and may generate tests that 
initially fail, giving the developer concrete targets to work towards. The 
methodology does not prescribe when this happens — only that by the time an MR is 
raised, every PAT must have a corresponding passing acceptance test committed to 
the repo as the permanent regression suite. No AI runs in the pipeline — CI 
executes the committed tests as-is.

---

## 3. Distributed Trunk-Based Development

### One product, many repos

- Every managed repo does trunk-based dev (short-lived feature branches, merge to main frequently)
- The root repo's main branch is the master trunk — it pulls all the disparate managed repo trunks together into one logical unit. Every commit on root main represents a validated, deployable combination of all components at specific versions.
- The project manifest (`project.yaml`) on main is the contract — it explicitly pins each component to the version that was validated as part of that combination. This explicitness is what makes the guarantees in [Section 4](#4-cicd-orchestration) possible.
- The root repo's main branch is the master trunk — it pulls all the disparate managed repo 
  trunks together into one logical unit. Every commit on root main represents a validated, 
  deployable combination of all components at specific versions.
- The project manifest (`project.yaml`) on main is the contract — it explicitly pins each 
  component to the version that was validated as part of that combination. This explicitness 
1. **Managed MRs raised** — Each dev raises an MR on their managed repo. The MR pipeline runs repo-level PATs; the MR cannot merge until they pass (the deliverable works in isolation). The MR title carries a sub-task ID, which is how the root repo links it to the right story. Managed MRs stay open until all sub-tasks for the story are present and integration tests pass, at which point they merge together as part of the coordinated story landing.

### The lifecycle of a change

A story's journey from code to deployable state follows four steps:

1. **Managed MRs raised** — Each dev raises an MR on their managed repo. The MR pipeline runs 
repo-level PATs; the MR cannot merge until they pass (the deliverable works in isolation). 
The MR title carries a sub-task ID, which is how the root repo links it to the right story. 
Topology MRs are merged onto the root repo's main as stories complete, each one representing a complete, validated story. This is analogous to how a single-repo SPA merges feature branches to main — except here, each "feature" is a story that spans multiple repos, and the merge validates the entire distributed system, not just one repo. When a deployment is triggered, it releases all the stories that have merged to root main since the last deployment — similar to how a SPA deployment releases all the feature branches merged to main since the last release.
pass, at which point they merge together as part of the coordinated story landing.

2. **Shadow integration** — As managed MRs are raised, the root repo automatically creates a topology MR that tests the combination. Each managed MR publishes a pre-release artefact, and the topology MR pins to these. Story-level PATs run against the speculative combination. While the story is incomplete (not all managed MRs present), story-level PATs may fail — this is expected. The dev sees two statuses on their managed MR: their own repo-level PATs (green — my work is correct in isolation) and the story-level integration status (pending/failing/green — the full story isn't ready yet). This visibility gives devs a clear signal of where things stand without blocking their work.

3. **Merge transaction** — Once all managed MRs are present and the topology MR goes green (both the completeness gate and the behavioural gate pass), the merge transaction fires. It merges all managed MRs atomically in dependency order, CI auto-tags each one, the topology MR is updated to reference the real tags, and a final validation run confirms the combination. The topology MR then merges to root repo main. This is a distributed mega-MR — the topology MR and all its managed MRs form a single logical change that lands together. See [Section 4](#4-cicd-orchestration) for the full mechanism.

4. **Deployment** — Someone (or an automated trigger) decides to deploy the current system state. This can be human-triggered, timed, or automatic — the methodology does not prescribe when or how.

### Last Known Good State (LKGS)

The root repo's HEAD on main is the Last Known Good State of the entire distributed system — the distributed HEAD. The manifest at this commit describes a validated combination of all deliverables at specific versions, proven to work together by story-level PATs.

Topology MRs are merged onto the root repo's main as stories complete, each one representing 
a complete, validated story. This is analogous to how a single-repo SPA merges feature branches 
to main — except here, each "feature" is a story that spans multiple repos, and the merge 
validates the entire distributed system, not just one repo. When a deployment is triggered, 
it releases all the stories that have merged to root main since the last deployment — similar 
to how a SPA deployment releases all the feature branches merged to main since the last release. 

### Build vs deployment

2. Creates a PR on a feature branch that bumps the topology to the new versiond publishes its own artefact as part of its CI on every release tag. The repo owns its build process.
- **Deployment is concerted.** The root repo owns the system state. When a deployment is triggered, it deploys the whole system at the versions described by the LKGS.

### Deployment strategy is out of scope

Methodology M delivers a validated, deployable topology — the LKGS on root repo main, where every deliverable version has been integration-tested together. That's where M's responsibility ends.

How that topology reaches production — blue/green, canary, rolling, `docker compose up`, Helm upgrade, copying files to a server — is a deployment strategy decision, orthogonal to the methodology. Deployment strategies are well-understood, project-specific, and not where M adds value. M's contribution is ensuring that whatever you deploy has been validated as a coherent whole.

---

## 4. CI/CD Orchestration

### The root repo watches its components

When a referenced component merges and tags a new version:

1. The root repo receives the event
2. Creates a PR on a feature branch that bumps the topology to the new version
3. Runs story-level Cypress tests against the updated combination
   **[TODO-1: Clarify when/how story-level PATs are converted to Cypress and by whom]**
4. If tests pass, the PR is green and can merge
5. Merged topology = validated combination = deployable

### Story readiness and orchestration

During the Idea phase, the AI writes a readiness tracker to the root repo:

```
story: PROJ-000
status: pending

components:
  - name: todo-api-read
    subtask: PROJ-000a
    latest-version: null
  - name: todo-api-write
    subtask: PROJ-000b
    latest-version: null
  - name: todo-mfe
    subtask: PROJ-000c
    latest-version: null
  - name: shell
    subtask: PROJ-000d
    latest-version: null

story-pats:
  - pats/PROJ-000.pat.yaml
```

As components auto-tag, the readiness tracker records the latest version for each. When all components have a version, the story is ready for integration.

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

A naive approach to multi-repo coordination would be: wait for all sub-tasks to release, 
then merge a topology MR that pins all new component versions together. This ensures every 
commit on root main represents a complete, validated combination — never a partial story or 
incomplete integration.

### Shadow integration: the logical MR

The model described above — wait for all components to merge, then bump topology and test — catches integration failures after the fact. By the time story-level tests fail, the managed repo MRs have already merged. The code is on trunk. Fixing it means another round of branch-implement-merge-tag, and in the meantime the failure creates noise and confusion.

Shadow integration prevents this by testing the combination before any managed repo MR merges. The mechanism is a topology MR on the root repo that mirrors the lifecycle of the managed repo MRs — a logical MR that spans repos.

**How it works:**

1. A dev raises an MR on a managed repo (e.g. `todo-api-read`, branch `feat/PROJ-001a`). The managed repo's MR pipeline builds and publishes a snapshot artefact (e.g. `todo-api-read:mr-42` or `v0.0.0-mr.42`). The pipeline records the commit SHA of the MR branch head.

2. The root repo detects the MR (via webhook), reads the sub-task ID from the MR title, and auto-creates a topology MR on the root repo. This MR pins `todo-api-read` to the snapshot artefact and records the branch head SHA. Everything else stays at the current stable versions.

3. Root repo CI runs the full story-level Cypress suite against this speculative topology. The result is visible on the root repo's topology MR — green or red. The topology MR stores the tested head SHAs for all managed repo MRs.

4. If a second dev raises an MR on `todo-mfe` for the same story (PROJ-001b), the existing root repo topology MR is updated — it now pins both `todo-api-read` and `todo-mfe` to their pre-release artefacts. Story-level tests re-run against the combined state.

5. The root repo topology MR becomes the story's integration dashboard. One MR shows: which components are involved, what state each is in, whether the combination passes integration tests.

**What this gives you:**

- Integration failures surface on the managed repo dev's timeline, not after the story lands. They see the story integration status on their own MR and can fix issues on their branch while the story is still in flight.
- Multi-component stories are tested together before any individual piece merges. The combination is validated speculatively.
- The root repo stays the integration surface. Managed repos don't need to know about the root repo's pipeline. The dependency direction is preserved — root watches managed, never the reverse.
- The mental model is familiar. It's an MR with CI. The fact that it spans repos is an implementation detail.

**Merge protection: managed MRs merge atomically, not individually**

Managed repo MRs are never merged by individual devs. They stay open, accumulating feedback from shadow integration, until the merge transaction lands the full story. In a distributed system, individual MR merges create coordination problems — each repo would move forward independently, breaking the guarantee that the root repo's main always reflects a validated combination. Instead, the methodology enforces a concerted merge: all managed MRs for a story merge together, atomically, as a single logical transaction. See [The merge transaction](#the-merge-transaction) for the mechanism.

The dev sees two distinct statuses on their managed MR:

- **Repo-level PATs: green** — "my deliverable works in isolation." This is the dev's responsibility.
- **Story integration: pending / failing / green** — "the full story isn't ready yet / is failing / works together." This is informational during development and becomes the gate at merge transaction time. When integration fails, the Story Integrator investigates the failure, identifies which components are broken, and assigns teams to fix them.

The merge transaction only fires when both the completeness gate (all managed MRs present and pipeline pass, meaning repo-level PATs are green) and the behavioural gate (story-level PATs green) pass. At that point, it merges all managed MRs atomically. No individual dev decides when to merge — the system decides when the story is ready.

This is the enforcement mechanism that makes the entire model trustworthy. The guarantee that "the manifest on `main` is always deployable" is structurally enforced by the merge transaction, not by individual merge discipline.

**Pre-release artefact contract:**

Managed repo CI pipelines need one addition to their standard build process: publish a snapshot build on MR pipelines, not just on merge to main. For Docker images, this is a tag like `mr-42`. For npm packages, a pre-release version like `0.0.0-mr.42`. For MFEs, a build deployed to a preview URL. The root repo pulls these snapshot artefacts during speculative integration runs.

The snapshot artefact tag identifies the build, but the real tracking mechanism is the commit SHA of the MR branch head. The pipeline records this SHA when the snapshot is published, and the topology MR stores it. During the merge transaction, the pipeline verifies that each MR branch head still points to the same SHA that was tested — if any branch has moved to a new commit, shadow integration re-runs before proceeding.

This is the only requirement M imposes on managed repos.

**The topology MR as living status document:**

The root repo CI maintains the topology MR description as a living summary of the story's integration state. When anyone on the team opens the MR, they see:

- The story ID and description
- A table of sub-tasks: component name, sub-task ID, managed repo MR link, artefact version, status (pending / in MR / merged)
- Gate status: completeness (3/3 sub-tasks present, or 2/3 — waiting on `todo-api-write`) and behavioural (story-level PATs passing / failing, with last run timestamp)
- Links to the managed repo MRs, so reviewers can navigate the full picture from one place

CI updates this description automatically as events arrive — new MRs detected, artefacts published, test runs completed, MRs merged. No one maintains it manually. It's always current.

This makes the topology MR the single point of visibility for a story's progress across the distributed system. No chasing across repos, no status meetings, no "where are we with PROJ-001?" in Slack. Open the MR, read the description. With Jira-Git integration, the story ticket links directly to the topology MR, making it the natural hub for tracking the story from ticket to merge.

### The merge transaction

When the root repo topology MR is green — all story-level tests pass against the combined pre-release artefacts — the story is ready to land. But landing it means merging multiple MRs across multiple repos atomically. This is a distributed transaction.

The coordinator is a GitLab CI pipeline on the root repo. It can be triggered automatically when both gates pass, or manually by a human who decides the timing is right.

**The sequence:**

1. Both gates pass: the completeness gate (all sub-tasks have pre-release artefacts in the topology MR) and the behavioural gate (story-level PATs green). The merge transaction pipeline is triggered.

2. The pipeline verifies that no managed repo MR has changed since the last passing integration run. For each managed repo MR in the topology, it compares the current branch head commit SHA against the SHA that was tested during shadow integration. If any branch head has moved to a new commit, it re-triggers the shadow integration against the new snapshot artefacts and waits for a green result before proceeding.

3. The pipeline merges managed repo MRs in dependency order — contract providers first (APIs before UIs). Each merge triggers the managed repo's auto-tag. This uses GitLab API calls (project access tokens configured during bootstrap). See [Footnote 1](#footnotes) on circular dependencies.

4. The pipeline updates the root repo topology MR: swaps pre-release artefact references to the real tags produced by the auto-tagging.

5. Story-level Cypress suite runs one final time against the real tagged versions. This is the belt-and-braces check — pre-release and tagged artefacts should be identical (same commit), but the final run confirms it.
   **[TODO-2: Revisit whether this final validation run is necessary or can be optimized away]**

6. If green, the pipeline merges the root repo topology MR. Main moves forward. The story is validated.

**The dual gate: behaviour AND completeness**

A green story-level test suite is necessary but not sufficient. Story-level PATs validate observable behaviour — but not all sub-tasks produce observable behaviour. A component might change internal data formats, storage patterns, logging, or operational characteristics. These changes are invisible to PATs but essential to the story. If the topology MR is missing a sub-task's artefact, the tests might pass against the old version of that component — and fail in production when the other components expect the new one.

The merge transaction therefore enforces two gates:

- **Behavioural gate:** Story-level PATs pass against the speculative topology. The combination works.
- **Completeness gate:** Every sub-task in the readiness tracker has a corresponding pre-release artefact in the topology MR. All parts are present.

Both must pass before the merge transaction pipeline will initiate the merge sequence. PATs catch what's broken. The completeness check catches what's missing.

This places critical weight on the decomposition phase. If the Story Decomposer fails to identify an affected component — misses an invisible dependency, a data-flow coupling, a downstream service that needs updating — the readiness tracker won't track it, and the completeness gate won't catch its absence. The decomposition is the single point of failure for story integrity. If this happens, the Story Integrator will discover it when story-level tests fail during shadow integration and will need to expand the story's scope to include the missing component.

This is where AI impact analysis earns its keep. The Story Decomposer must trace data flows through the topology, not just map UI changes to components. It needs architectural knowledge: which services share data contracts, which components have implicit coupling through shared storage or event buses, which operational changes are prerequisites for behavioural ones. The `project.yaml` topology and the component contracts (API schemas, event definitions) are its inputs. The output must capture every component that needs to change — including the ones whose changes are invisible to the end user.

**Partial failure:**

If a managed repo MR fails to merge (conflict, pipeline failure), the pipeline stops and reports the state. Managed repo MRs that already merged are not rolled back — they don't need to be. The root repo main hasn't moved. The auto-tagged versions exist but aren't in the topology. The system is in a safe state.

The pipeline updates the root repo topology MR to reflect reality: merged components at real tags, unmerged components still at pre-release artefacts. The dev fixes the failing MR, the shadow integration re-runs, and the transaction can be retried.

This is not a two-phase commit. There's no rollback. The safety comes from the root repo's main being the only thing that matters for deployment — and it only moves forward on a fully validated combination. Partial merges on managed repos are harmless because the topology hasn't changed.

**Fully automated, human-gated:**

The merge transaction is deterministic — no judgement, no AI required. Check gates, merge in order, update topology, verify. A CI pipeline is the right tool. The only human decision is whether to enable auto-merge (both gates pass → transaction fires automatically) or require manual trigger (human reviews the green topology MR and clicks "go"). This is a project-level configuration choice, not a methodology decision.

**Serializing merge transactions:**

Multiple stories can have merge transactions in flight simultaneously — each on its own topology MR. However, when they both attempt to merge to root main, only one can succeed; the second will have a stale base and must rebase and re-validate. To avoid this collision, serialize merge transactions at the root repo level using GitLab's `resource_group` in the merge transaction pipeline:

```
merge_transaction:
  stage: merge
  resource_group: distributed_merge
  script:
    # merge logic
```

This ensures only one merge transaction can execute at a time. The second waits for the first to complete, then proceeds. The topology MR still rebases onto the new root state (standard trunk-based dev), but the merge transaction itself doesn't collide. This keeps the orchestration simpler and prevents wasted merge attempts.

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
- **Story Decomposer** — Reads story-level PATs + `project.yaml` topology + component contracts (API schemas, event definitions). Traces data flows to identify all affected components — including those with invisible changes (storage, operational, internal contracts). Produces sub-tasks, repo-level PATs, readiness tracker. The completeness of this decomposition is the single point of failure for story integrity; the merge transaction's completeness gate depends on it. For best results, Kiro should be opened as a multi-folder workspace with all project repos added, giving the Decomposer access to design documents, architecture notes, and knowledge writeups in each repo — this context dramatically improves decomposition accuracy.

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

The skill orchestrates a sequence of atomic capabilities, each building on the previous:

1. **Workspace** — GitLab group/subgroup for the project
2. **Root repo** — `project.yaml`, shell package stub, `.kiro/` folder (agents, hooks, steering), Story Zero committed to `jira/`
3. **Story-level PATs** — generated from Story Zero, committed to `pats/` in the root repo
4. **Decomposition** — sub-tasks, managed repo stubs, readiness tracker
5. **CI pipeline configs** for the chosen platform
6. **Deployment templates** for the chosen model

The root repo is the source of truth from step 2 onwards. Each subsequent step reads from and writes to it.

### The layering

- **Skill** (user-level) — knows how to create an M-type project. Loaded on demand. Publishable.
- **Steering** (project-level) — the project constitution. Generated by the skill, tailored to the chosen parameters.
- **Agents** (project-level) — the phase specialists. Generated during bootstrap.
- **Hooks** (project-level) — the triggers. Generated during bootstrap, adapted to instantiation parameters.

The skill creates the project. The project sustains itself through steering, agents, and hooks.

---

## 7. Story Zero: Project Genesis

### The bootstrapping story

The very first story in an M-type project is PROJ-000 — a technical bootstrapping story that proves the infrastructure works. It uses the same PAT-driven flow as every story that follows. No special case. No "set things up manually, then start using the process." The methodology bootstraps itself: if Story Zero passes, the team knows the entire pipeline is live and trustworthy. If it fails, they know before any real feature work begins.

This is important. If Story Zero were a manual setup phase — create repos, wire pipelines, hope it works — then the methodology would start at Story One. Every team would have a different "how we got here" story, and the foundations would be untested. Instead, Story Zero is an M-type story. It has PATs, sub-tasks, a readiness tracker, shadow integration, a merge transaction. The scaffolding is the implementation. The PAT validates that it works.

### Starting state: Story Zero

A tech lead has the M-project skill installed and has written Story Zero — a markdown file describing the project. Story Zero is the single input to bootstrap. Its `## Project` section contains the metadata the skill needs:

- Project name
- GitLab group path
- Component catalogue (names, roles, embedded/referenced)
- Topology mode, CI platform, PAT framework, deployment model

The skill extracts these from the story. Anything missing, it asks for. No separate configuration file, no implicit knowledge — the story is self-describing.

```
# PROJ-000: Bootstrap M-Type Infrastructure

## Project

Name: `todo-app`
GitLab group: `org/todo-app-project`
Topology: distributed
CI platform: GitLab CI
Story management: local markdown
PAT framework: Cypress
Deployment: Docker Compose

Repos follow the pattern `todo-app-<component>`:

- `todo-app-root` — shell (embedded), module federation, story-level Cypress, project.yaml
- `todo-app-mfe` — todo microfrontend (referenced)
- `todo-app-api-read` — read API (referenced)
- `todo-app-api-write` — write API (referenced)

## Summary
...

## Acceptance Criteria
...
```

The tech lead points the skill at this file:

```
"Bootstrap the root repo using M Power. Use the story file at jira/PROJ-000.md."
```

### The bootstrap sequence

Bootstrap is not a single big-bang operation — it follows a defined sequence where the root repo is created first and becomes the source of truth immediately. Each step builds on the previous one, and the user has decision points between steps.

**Step 1: Create workspace** — The skill creates the GitLab group (or subgroup) for the project. This is the container for all repos.

**Step 2: Bootstrap root repo** — The skill creates the root repo (`todo-root`) and seeds it with:
- `project.yaml` — the project manifest, with all component tags set to null (nothing released yet)
- `jira/PROJ-000.md` — Story Zero, committed to the root repo
- `.kiro/` folder — agents, hooks, steering
- Conventional folder structure (`pats/`, `stories/`, `packages/shell/`)

The root repo is now the source of truth. The story lives in the codebase, not in a scratch file or external system.

**Step 3: Decompose story** — The skill maps Story Zero's acceptance criteria onto components, generates sub-task markdown files for each, and stages the readiness tracker. No PATs are authored yet — that's the next step.

**Step 4: Generate PATs** — With the decomposition in hand, the skill runs `generate-pats` to produce both the story-level `PROJ-000.pat.yaml` and one `<sub-task-id>.pat.yaml` per sub-task, anchored to the parent via `parent-story:` / `derives-from:` fields.

**Step 5: Compile story PATs + raise integration gate** — `compile-story-pats` dispatches the story PAT through the project's `test.cat.*` provider (e.g. `cypress`), writes the compiled spec, bundles it with the readiness tracker and any structural artefacts, creates the root-repo story branch, and raises the integration-gate MR. The gate is live from the moment the story is decomposed.

At this point, nothing works. The repos exist but contain only scaffolding. The `project.yaml` has null tags — nothing has been released yet. The story-level PATs would fail if you ran them — there's nothing to test against.

This sequencing resolves the bootstrap paradox: PATs need to live in the root repo, but the root repo doesn't exist until bootstrap creates it. By making root repo creation the first step, the chicken-and-egg problem dissolves. Each capability stays atomic — `bootstrap-root-repo` creates and seeds, `decompose-story` decomposes, `generate-pats` authors contracts, `compile-story-pats` establishes the gate, `generate-acceptance-tests` compiles sub-task PATs into repo-level specs — and the skill orchestrates them in the right order.

### The Idea phase — already done

The skill generated the Idea phase artefacts during bootstrap:

Story-level PAT (infrastructure validation — integration connectivity, not features):

```
story: PROJ-000
version: 1

acceptance:
  - id: AC-001
    when: shell loads
    then: it composes the MFE
    steps:
      - navigate: /
      - assert: "[data-testid='mfe-container'] is visible"

  - id: AC-002
    when: MFE loads
    then: it can call the read API
    steps:
      - navigate: /
      - assert: API call to /api/read succeeds
      - assert: response status is 200

  - id: AC-003
    when: read API is called
    then: it can query the database
    steps:
      - GET /api/read
      - assert: response contains data from database
      - assert: response status is 200

  - id: AC-004
    when: write API is called
    then: it accepts requests
    steps:
      - POST /api/write with test payload
      - assert: response status is 200 or 201
```

Decomposition into sub-tasks:

| Sub-task  | Component      | Work                                        |
|-----------|----------------|---------------------------------------------|
| PROJ-000a | todo-api-read  | Scaffold API, connect to database           |
| PROJ-000b | todo-api-write | Scaffold API, accept POST requests          |
| PROJ-000c | todo-mfe       | Scaffold MFE, call read API                 |
| PROJ-000d | todo-root      | Scaffold shell, compose MFE via Module Fed  |

Readiness tracker:

```
story: PROJ-000
status: pending

components:
  - name: todo-api-read
    subtask: PROJ-000a
    latest-version: null
  - name: todo-api-write
    subtask: PROJ-000b
    latest-version: null
  - name: todo-mfe
    subtask: PROJ-000c
    latest-version: null
  - name: shell
    subtask: PROJ-000d
    latest-version: null

story-pats:
  - pats/PROJ-000.pat.yaml
```

This is the same structure as any story. The fact that the "implementation" is scaffolding rather than feature code is irrelevant to the methodology.

### The Development phase — four devs, four repos

Each dev picks up a sub-task and works in their managed repo. The flow is identical to any subsequent story.

**Alex (PROJ-000a) in todo-api-read:**
- Scaffolds Node.js/Express, connects to database
- Implements `GET /api/read` endpoint that queries the database
- Repo-level PAT: "GET /api/read returns data from database"
- Raises MR → managed repo pipeline builds, publishes pre-release artefact
- Root repo detects MR, creates/updates topology MR for PROJ-000

**Jordan (PROJ-000b) in todo-api-write:**
- Scaffolds Node.js/Express, connects to database
- Implements `POST /api/write` endpoint that accepts requests
- Repo-level PAT: "POST /api/write accepts payload and returns 200"
- Raises MR → pre-release artefact published → topology MR updated

**Sam (PROJ-000c) in todo-mfe:**
- Scaffolds React with Module Federation
- Implements component that calls `GET /api/read` and displays response
- Repo-level PAT: "Component calls API and displays response"
- Raises MR → pre-release artefact published → topology MR updated

**Casey (PROJ-000d) in todo-root:**
- Implements shell as Module Federation host
- Configures remotes to load `todo-mfe`, wires API URL via environment
- Repo-level PAT: "Shell loads and composes MFE"
- Raises MR → pre-release artefact published → topology MR updated

### Shadow integration validates the combination

As MRs are raised, the root repo's topology MR accumulates pre-release artefacts from all four sub-tasks. Story-level Cypress tests run against the speculative topology — shell composing MFE, MFE calling API, API querying database. The infrastructure is validated end-to-end.

The topology MR description shows the status:

```
PROJ-000: Infrastructure Bootstrap

Component       Sub-task   MR     Artefact       Status
todo-api-read   PROJ-000a  !1     mr-1           ✓
todo-api-write  PROJ-000b  !1     mr-1           ✓
todo-mfe        PROJ-000c  !1     mr-1           ✓
shell           PROJ-000d  !1     mr-1           ✓

Completeness: 4/4
Behavioural:  GREEN (infrastructure wiring validated)
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
# Story-level PAT — lives in root repo at pats/<story-id>.pat.yaml
story: PROJ-XXX                    # story ID
version: 1                         # schema version

acceptance:
  - id: AC-001                     # unique within the story
    when: <user action or state>   # trigger condition (plain English)
    then: <expected outcome>       # observable result (plain English)
    steps:                         # ordered test steps
      - navigate: /path            # navigate to URL
      - click: "[data-testid='x']"                  # interact with element
      - type: "[data-testid='x'] value 'text'"      # input text
      - assert: "[data-testid='x'] is visible"      # visibility check
      - assert: "[data-testid='x'] contains 'y'"    # content check
      - assert: "[data-testid='x'] count > 0"       # count check
      - wait: "[data-testid='x'] is visible"        # wait for element
    replaces: PROJ-YYY/AC-001      # optional: supersedes an AC from a previous story
    removes:  PROJ-YYY/AC-001      # optional: explicitly removes an AC from a previous story
```

Sub-task PATs share the same schema. They differ in the top-level
branch — `sub-task:`, `parent-story:`, and `component:` replace the
story-level `story:`:

```
# Sub-task PAT — lives in managed repo at pats/<sub-task-id>.pat.yaml
sub-task: PROJ-001a
parent-story: PROJ-001
component: mfe
version: 1

acceptance:
  - id: AC-001
    when: ...
    then: ...
    steps: ...
```

Conventions:
- All interactive elements use `data-testid` attributes for stable selectors.
- `when`/`then` are plain English — topology-agnostic, no technical implementation details.
- `steps` are ordered and deterministic — compiled by the project's active `test.cat.*` provider. The reference `cypress` provider handles browser steps (`navigate`/`click`/`type`/`assert`/`wait`) and HTTP steps (`http`/`expect-status`/`expect-body-contains`, since v0.11.0/I-045) within a single `.cy.js` output.
- **Step values are authored as yaml double-quoted scalars** so the selector's `[` and inner `'` parse cleanly. Inner text uses single quotes and cannot contain a single quote.
- Story-level PATs live in the root repo under `pats/`.
- Sub-task PATs live in each managed repo under `pats/` with the same schema but scoped to what the component can verify in isolation.

### B. Project manifest (`project.yaml`) schema reference

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
    latest-version: <tag> | null    # latest auto-tagged version satisfying this sub-task

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
- `pending` → created during Idea phase, no versions yet.
- `in-progress` → at least one component has released a version, waiting for others.
- `integrating` → all components have versions, story-level tests running.
- `failed` → story-level tests failed. `failure` block captures details. Retries automatically on new versions.
- `validated` → tests passed, topology commit landed on root repo main.
- `archived` → moved to `stories/done/` after production deploy. Full audit trail preserved.

### D. Glossary

- **M-type project:** A project following Methodology M.
- **Root repo:** The orchestrating unit containing story-level PATs, the project manifest (`project.yaml`), and the shell. Never just metadata — always contains at least the application entry point.
- **Managed repo:** Any component in the topology, whether embedded or referenced. All are managed by the root repo.
- **Self-contained root repo:** A root repo where all components are embedded. What most repos are today.
- **Composite root repo:** A root repo with one or more referenced components. May also contain embedded code (hybrid).
- **Story-level PAT:** User-outcome validation that runs against the composed system in the root repo. Topology-agnostic — written in terms of user behaviour, not components.
- **Repo-level PAT:** Component-contract validation that runs in isolation in the managed repo. Derived from story-level PATs during decomposition.
- **Topology:** The project manifest (`project.yaml`) — the source of truth for what works together. Every commit on root repo main represents a validated combination.
- **Topology MR:** A merge request on the root repo that pins components to specific versions. During shadow integration, pins to pre-release artefacts. After merge transaction, pins to real tags.
- **Shadow integration:** Speculative integration testing triggered when a managed repo MR is raised. Creates/updates a topology MR on the root repo to test the combination before any managed repo MR merges.
- **Logical MR:** The topology MR viewed as a single cross-repo change. Mirrors the lifecycle of a normal MR but spans multiple repos. The story's integration dashboard.
- **Merge transaction:** The deterministic CI pipeline that atomically merges all managed repo MRs for a story, updates the topology to real tags, and lands the validated combination on root repo main.
- **Dual gate:** The two conditions that must pass before a merge transaction: the behavioural gate (story-level PATs green) and the completeness gate (all sub-tasks have artefacts in the topology MR).
- **Behavioural gate:** Story-level PATs pass against the speculative topology. The combination works.
- **Completeness gate:** Every sub-task in the readiness tracker has a corresponding artefact in the topology MR. All parts are present.
- **Pre-release artefact:** A build artefact published from a managed repo MR pipeline (not from a merge to main). Used by shadow integration for speculative testing. Never deployed to production.
- **Readiness tracker:** Per-story manifest tracking which components have released and the story's integration status. Lives in the root repo under `stories/`.
- **Latest-version:** The latest auto-tagged version satisfying a sub-task. Updated automatically as managed repo MRs merge and auto-tag. Tracked in the readiness tracker.
- **Story Zero (PROJ-000):** The bootstrapping story that scaffolds and validates the M-type project infrastructure. Proves the distributed plumbing works before real stories begin.
- **Story Owner:** A dev team member accountable for a story from creation through deployment. Single point of coordination; owns scope decisions and merge readiness.
- **Story Integrator:** Investigates and resolves integration failures during shadow integration. Analyzes failures, identifies root causes, and assigns fixes to component owners.
- **Component Owner:** Responsible for the quality and correctness of a managed repo. Implements sub-tasks, ensures repo-level PATs pass, and communicates breaking changes.
- **Story Decomposer:** A Kiro agent that traces data flows through the topology, generates sub-tasks, derives repo-level PATs, and creates the readiness tracker.
- **Ecosystem Briefing:** A Kiro agent that queries GitLab for recent project activity, cross-references with readiness trackers, and presents a human-readable status summary.

---

## Footnotes

**[1] Circular dependencies in the topology**

The merge transaction assumes an acyclic dependency graph — it merges managed repo MRs in dependency order (providers before consumers). If circular dependencies exist between managed repos (A depends on B, B depends on A), the merge transaction cannot determine a valid merge order and will fail.

This is a design constraint that needs explicit handling. Options:

- Enforce acyclic topology as a hard requirement (fail fast if a story introduces a cycle)
- Detect cycles and reject the story during decomposition
- Allow cycles but require explicit handling (e.g., simultaneous merge of circular components)

**Decision pending:** This will be addressed in a future revision based on real-world usage patterns.
## 6. Roles and Responsibilities

The methodology defines clear roles that span the development lifecycle. These are responsibilities, not necessarily full-time positions — a person can hold multiple roles, and roles can be shared across a team.

### Story Owner

The Story Owner is a member of the dev team accountable for a story from creation through deployment. They are the single point of coordination for the story.

**Responsibilities:**

- **Idea phase:** Works with BA/QA to refine the story and validate story-level PATs before decomposition
- **Decomposition:** Ensures the Story Decomposer (AI agent) has identified all affected components; challenges the decomposition if it seems incomplete
- **Development coordination:** Tracks progress across sub-tasks; unblocks devs; ensures sub-task owners understand their scope
- **Integration:** Monitors shadow integration status; alerts the team to integration failures early
- **Merge readiness:** Verifies both gates pass before approving the merge transaction; owns the decision to land the story
- **Post-merge:** Confirms the story is deployable; coordinates with deployment team if needed

The Story Owner is not necessarily the most senior person — they're the person who knows the story best and can make quick decisions about scope, priority, and readiness.

### Story Integrator

The Story Integrator investigates and resolves integration failures during shadow integration.

**Responsibilities:**

- **Failure investigation:** When story-level tests fail, analyzes the failure to identify which component(s) are broken
- **Root cause analysis:** Determines whether the failure is a bug in the implementation, a missing component, or a decomposition error
- **Team assignment:** Assigns the fix to the appropriate component owner or escalates to the Story Owner if scope expansion is needed
- **Re-validation:** Confirms that fixes resolve the failure and that shadow integration passes before the merge transaction proceeds

The Story Integrator is typically a senior dev or tech lead with architectural knowledge of the system.

### Component Owner

Each managed repo has a Component Owner responsible for the quality and correctness of that component.

**Responsibilities:**

- **Implementation:** Implements sub-tasks for their component; ensures repo-level PATs pass
- **MR quality:** Raises clean MRs with clear commit history; responds to review feedback
- **Dependency awareness:** Understands which other components depend on their component; communicates breaking changes early
- **Release readiness:** Ensures the component is ready to auto-tag and release when the merge transaction fires

Component Owners are the devs working on each managed repo.

### Story Decomposer (AI Agent)

The Story Decomposer is a Kiro agent that runs during the Idea phase.

**Responsibilities:**

- **Impact analysis:** Traces data flows through the topology to identify all affected components
- **Sub-task generation:** Creates sub-tasks for each affected component with clear scope
- **Repo-level PAT derivation:** Decomposes story-level PATs into repo-level contracts for each component
- **Readiness tracker creation:** Generates the readiness tracker that tracks story progress

The Story Decomposer's output is reviewed by the Story Owner before decomposition is considered complete.

### Story Owner vs. Story Integrator

These roles are distinct:

- **Story Owner** is accountable for the story's success end-to-end. They make decisions about scope, timing, and readiness.
- **Story Integrator** is responsible for investigating and fixing integration failures. They report to the Story Owner.

In a small team, the same person might hold both roles. In a larger team, they're separate — the Story Owner focuses on coordination, the Story Integrator focuses on technical troubleshooting.

---

