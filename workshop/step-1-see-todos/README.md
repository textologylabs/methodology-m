# Step 1: PROJ-001 — User can see a list of todos

## Type
Coordinated story (touches two referenced components)

## Starting State

- todo-mfe: scaffolded, renders placeholder
- todo-api-read: scaffolded, returns empty array
- todo-api-write: scaffolded, accepts but does nothing

```
# project.yaml (todo-root)
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

## Flow

### 1. BA writes the story

See [jira/PROJ-001.md](jira/PROJ-001.md)

### 2. AI generates story-level PATs

These are topology-agnostic — pure user outcomes.

File created in root repo: `pats/PROJ-001.pat.yaml`

```
story: PROJ-001
version: 1

acceptance:
  - id: AC-001
    when: user opens the app
    then: a list of todos is displayed
    steps:
      - navigate: /
      - assert: "[data-testid='todo-list']" is visible

  - id: AC-002
    when: todos exist
    then: each todo shows title and completion status
    steps:
      - navigate: /
      - assert: "[data-testid='todo-item']" count > 0
      - assert: "[data-testid='todo-title']" is visible
      - assert: "[data-testid='todo-status']" is visible

  - id: AC-003
    when: no todos exist
    then: empty state message is shown
    steps:
      - navigate: /
      - assert: "[data-testid='empty-state']" contains "No todos yet"
```

### 3. AI maps to topology and decomposes

AI reads project.yaml, identifies affected components:

- todo-api-read — needs GET /todos endpoint
- todo-mfe — needs to render the list
- shell — no change
- todo-api-write — no change

Sub-tasks created: [jira/PROJ-001a.md](jira/PROJ-001a.md), [jira/PROJ-001b.md](jira/PROJ-001b.md)

Repo-level PATs and implementation details: see [impl/](impl/)

Readiness manifest written to root repo:

```
# stories/PROJ-001.yaml
story: PROJ-001
status: pending

components:
  - name: todo-api-read
    subtask: PROJ-001a
    status: pending
  - name: todo-mfe
    subtask: PROJ-001b
    status: pending

story-pats:
  - pats/PROJ-001.pat.yaml
```

### 4. Reviews

- BA review: PATs match the intent ✓
- QA review: edge cases covered (empty state) ✓
- Dev review: feasible, no concerns ✓

Story is Ready for Dev.

### 5. Devs pick up sub-tasks

API dev (PROJ-001a) in todo-api-read:

```
→ Branches todo-api-read
→ Implements GET /todos endpoint
→ Repo-level PATs pass
→ Merges PR to todo-api-read main
→ Cuts release: todo-api-read@v1.0.0
```

MFE dev (PROJ-001b) in todo-mfe:

```
→ Branches todo-mfe
→ Implements todo list component
→ Repo-level PATs pass (using mocked data)
→ Merges PR to todo-mfe main
→ Cuts release: todo-mfe@v1.0.0
```

### 6. Root repo orchestrates

```
→ Detects todo-api-read@v1.0.0
→ Readiness manifest: PROJ-001 — 1/2 components done
→ Waits.

→ Detects todo-mfe@v1.0.0
→ Readiness manifest: PROJ-001 — 2/2 components done
→ Bumps topology atomically:
    todo-api-read: v0.1.0 → v1.0.0
    todo-mfe: v0.1.0 → v1.0.0
→ Runs ALL story-level Cypress tests (including PROJ-001)
→ Green
→ Topology commit lands on root repo main
```

### 7. Deploy

```
→ Release manager picks this topology commit
→ Pipeline: staging → NFT → canary → production
→ All components deployed at pinned versions:
    shell: v0.1.0 (unchanged)
    todo-mfe: v1.0.0
    todo-api-read: v1.0.0
    todo-api-write: v0.1.0 (unchanged)
```

## End State

```
# project.yaml (todo-root) after step 1
components:
  - name: shell
    type: embedded
    location: ./packages/shell
    tag: v0.1.0
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
    tag: v0.1.0
    role: backend
```

System displays a list of todos (or empty state message).
Tag: `v1.0.0-step-001`

## What this demonstrates
- Story-level PATs decomposing into repo-level PATs
- Two devs working independently in separate repos
- Root repo waiting for all sub-tasks before bumping topology
- Atomic topology commit (both components bumped together)
- Story-level Cypress tests validating the integrated system
- Manual deploy gate
