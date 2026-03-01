# Reference Implementation — Planning Document

## Purpose

Build a working reference implementation that proves the root repo model, PAT-driven workflow, and distributed trunk-based development. Not just a demo — a replayable playground where the methodology can be demonstrated end-to-end by running stories through the system.

Two distinct goals:

1. **Exploration:** Build it out, discover what works, refine the model against reality. This is where we learn.
2. **Replay:** Once refined, the whole thing should be scriptable — someone can follow the playbook, run the stories, and see the methodology in action. A teaching tool, not just a proof of concept.

## The Replay Problem

Building it once proves it works. But for the reference implementation to be useful as a companion to the article, it needs to be replayable:

- Someone reads the article, clones the repos, and follows a script
- The script walks them through: creating stories, writing PATs, implementing, releasing, watching the root repo orchestrate
- Each step is documented with "what you should see" and "why this matters"
- Ideally, the repos can be reset to a starting state and replayed from scratch

This means we need to think about:
- Git history as a teaching tool (tags/branches marking each phase)
- A walkthrough document that narrates the journey
- Possibly a "starting state" tag that people can reset to
- Clear separation between infrastructure (one-time setup) and stories (replayable)

## Architecture

A Todo app — simple enough that the domain is invisible, complex enough to demonstrate the model.

### Components

- **Shell (SPA host)** — embedded in the root repo. Hosts the microfrontend.
- **Todo MFE** — referenced, separate repo. The microfrontend that renders the todo UI.
- **Todo API Read** — referenced, separate repo. Node.js microservice for read operations (GET todos).
- **Todo API Write** — referenced, separate repo. Node.js microservice for write operations (POST, PATCH, DELETE).

### Why this shape

- Embedded + referenced components in the same root repo (hybrid)
- Frontend and backend split across repos (the common real-world case)
- Microfrontend architecture (demonstrates the integration testing problem)
- CQRS-lite microservice split (read vs write) — realistic, and creates richer scenarios:
  - "Show todos" → todo-api-read + todo-mfe
  - "Add a todo" → todo-api-write + todo-mfe
  - "Mark todo complete" → todo-api-write + todo-mfe (+ possibly todo-api-read)
  - Not every story touches every component — which is the common case
- Four components is enough to show coordination without drowning in complexity

### Topology

```
# project.yaml (after architecture split)
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

## Technology

- Shell: vanilla SPA or lightweight framework (just needs to host the MFE)
- Todo MFE: React (or similar — the framework doesn't matter)
- Todo API: Node.js + Express (minimal)
- CI/CD: GitLab CI (primary), with notes on GitHub Actions equivalents (mutatis mutandis)
- Tests: Cypress for story-level PATs in the root repo, component-level testing framework for repo-level PATs

Technology choices are deliberately boring. The methodology is the point, not the stack.

## Platform

GitLab as primary (mirrors the company setup). The reference implementation should document where GitLab-specific choices are made and what the GitHub equivalent would be.

## AI Role

AI (Kiro) is used during the human phases:
- Idea phase: generating PATs, decomposing stories, impact analysis
- Development phase: implementing against PATs, validating with Playwright
- The CI/CD pipelines are conventional — no AI in the automation

This is an honest representation of where AI fits today. The article can note that as AI tooling matures in CI/CD platforms, more of this could be automated.

## Phases

### Phase 1: Foundation

Set up the infrastructure — repos, topology, pipelines. No stories yet.

- Create the root repo with project.yaml (all components embedded initially)
- Scaffold the shell, MFE, and API as embedded packages
- Set up GitLab CI for the root repo (repo-level + story-level PAT stages)
- Document the starting architecture
- Tag: `v0.0.0-foundation`

### Phase 2: First Story (Self-Contained)

Run the first story through the system while everything is still embedded. Proves the model works in the simple case.

- User story: "User can see a list of todos"
- Story-level PATs
- Implementation
- Cypress tests generated from PATs
- Full pipeline run
- Tag: `v1.0.0`

### Phase 3: Architecture Split

Split the MFE and API into separate repos. The root repo evolves from self-contained to composite.

- Create separate GitLab repos for Todo MFE and Todo API
- Move code out, update project.yaml (embedded → referenced)
- Set up repo-level CI pipelines in each new repo
- Set up root repo CI to watch for releases
- Verify existing story-level PATs still pass against the new topology
- Tag: `v1.0.0-split`

### Phase 4: Distributed Stories

Run stories through the distributed setup. Each scenario from the thinking doc gets a real story.

- Story touching only the API (Scenario 1/4)
- Story touching only the MFE (Scenario 1)
- Story touching both — coordinated release (Scenario 2)
- Accidental breaking change caught by story-level tests (Scenario 5)
- Two independent stories in the same component (Scenario 3)

Each story is documented with:
- The user story and acceptance criteria
- The PAT decomposition
- The readiness manifest
- What happened in each repo
- What the root repo did
- The outcome

### Phase 5: Deployment Pipeline

Add the deployment stages (simulated — no real infrastructure needed).

- Staging environment (could be docker-compose)
- Story-level Cypress tests run in staging
- Canary simulation
- Manual deploy gate
- Demonstrate: topology commit → deploy → all components at pinned versions

### Phase 6: Playbook and Replay

Package everything for replayability.

- Walkthrough document narrating each phase
- "Starting state" tags for each phase
- Reset script (clone repos, checkout starting tags)
- "Run this story" scripts with expected outcomes
- Article references specific commits/tags as evidence

## Stories Backlog (Draft)

Stories to run through the system, in rough order:

1. "User can see a list of todos" — first story, self-contained phase (all embedded)
2. "User can add a new todo" — second story, still self-contained
3. (Architecture split happens here — MFE, API read, API write become separate repos)
4. "User can mark a todo as complete" — first distributed story, touches todo-api-write + todo-mfe
5. "API returns todo count in response headers" — todo-api-read only, backward-compatible
6. "User can filter todos by status" — todo-mfe + todo-api-read
7. "User can delete a todo" — todo-api-write + todo-mfe, coordinated
8. "API changes date format in response" — todo-api-read change that breaks todo-mfe (caught by story-level tests)
9. "User can edit a todo title" — todo-api-write + todo-mfe, concurrent with another story

## Replayability and Workshop Demos

### The goal

Rewind the entire system to a specific state and carry out a story live — branching, implementing, raising MRs, merging, watching the root repo orchestrate. Not just before/after snapshots — the actual work, done in front of an audience.

### Tagging as system-level snapshots

Every meaningful state gets a tag on the root repo:

```
v0.0.0-foundation     — empty scaffold, topology, pipelines
v1.0.0-story-002      — after "user can see todos" (self-contained)
v1.1.0-story-003      — after "user can add a todo" (self-contained)
v1.1.0-split           — after architecture split (same functionality, new topology)
v1.2.0-story-004      — after first distributed story
```

The root repo tag is the single entry point for the entire system state. The project file at that tag pins the exact versions of all managed repos. One tag resolves everything.

### The merge problem

During a live demo, you need to merge to main — that's part of the flow. But you can't merge to the reference repos and then rewind. Main has moved forward.

### Solution: disposable forks

Before each workshop, fork the root repo and all managed repos into a disposable demo namespace:

```
setup-workshop.sh story-004
  → Reads topology at v1.1.0-split (the starting state for story 004)
  → Forks root repo into demo-workshop-feb/ at that tag
  → Forks each managed repo at their pinned refs
  → Result: a complete, isolated copy of the system at the right state

teardown-workshop.sh
  → Deletes all forks in the demo namespace
```

During the demo: branch, implement, raise MRs, merge, break things — all on the forks. Full freedom. The reference repos stay pristine.

### Benefits

- Run the workshop multiple times with different audiences — fresh forks each time
- No cleanup headaches — delete the namespace and it's gone
- The reference repos are the "textbook" — always at their tagged states, always replayable
- Each story can be demoed independently by forking from its starting tag

### Workshop flow

1. Run setup script → forks created at starting state
2. Show the audience the current state (topology, existing PATs, backlog)
3. Introduce the story (open the jira/ file)
4. Implement live — branch, code, raise MRs, merge
5. Watch the root repo orchestrate (topology bump, story-level tests)
6. Show the validated state
7. After workshop: run teardown script

## Open Questions

- How do we simulate the "root repo watches for releases" in GitLab CI? Webhooks? Scheduled pipeline? Manual trigger for the demo?
- Do we need actual deployment targets or can we simulate with docker-compose + smoke tests?
- How detailed should the PAT.yaml files be for the reference implementation? Full schema or simplified?
- Should the walkthrough be a separate document or embedded in the root repo README?
- How do we handle the Jira dependency? Use a `jira/` folder in the root repo with one markdown file per ticket. Self-contained, version-controlled, replayable. Each file follows a consistent template (title, description, AC, sub-tasks). The article can note "in a real setup, this would be Jira."
- Replay granularity: can someone replay a single story, or do they need to replay from the beginning?
