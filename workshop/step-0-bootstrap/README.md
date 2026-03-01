# Step 0: PROJ-000 — System Bootstrap (Story Zero)

## Type
Technical bootstrapping story (M-type project genesis)

## Purpose

Story Zero proves the M-type project infrastructure works before any real user stories begin. It uses the same PAT-driven flow as every subsequent story — no special case, no "we'll start using PATs from story 1."

The output is a working hello-world through the full stack: shell loads MFE, MFE calls API, response displays. If this works, the distributed plumbing is proven.

## Starting State

Nothing exists yet. Sarah (tech lead) has the M-project skill installed and runs:

```
"Create an M-type project called todo-app with a shell, a todo-mfe, 
 a todo-api-read, and a todo-api-write. Distributed, GitLab CI, 
 local markdown, Cypress, Docker Compose."
```

The skill scaffolds:
- Empty `todo-root` repo with `project.yaml`, `.kiro/` folder, shell package stub
- Instructions/stubs for `todo-mfe`, `todo-api-read`, `todo-api-write`
- Story Zero (PROJ-000) already written: jira ticket, story-level PAT, sub-tasks, readiness tracker

At this point, nothing works. The repos exist but contain only scaffolding. The `project.yaml` points at `v0.0.0` tags that don't exist yet.

## Flow

### 1. Story ticket exists

See [jira/PROJ-000.md](jira/PROJ-000.md)

### 2. Story-level PAT exists

File: `pats/PROJ-000.pat.yaml` (in root repo)

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

### 3. Sub-tasks assigned

Four devs, four sub-tasks:

| Sub-task | Dev | Repo | Work |
|----------|-----|------|------|
| PROJ-000a | Alex | todo-api-read | Hello endpoint |
| PROJ-000b | Jordan | todo-api-write | Placeholder endpoint |
| PROJ-000c | Sam | todo-mfe | Hello component, fetches from API |
| PROJ-000d | Casey | todo-root | Shell, Module Federation, Cypress |

See [jira/PROJ-000a.md](jira/PROJ-000a.md), [jira/PROJ-000b.md](jira/PROJ-000b.md), [jira/PROJ-000c.md](jira/PROJ-000c.md), [jira/PROJ-000d.md](jira/PROJ-000d.md)

### 4. Readiness tracker created

```
# stories/PROJ-000.yaml (in root repo)
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

### 5. Devs implement their sub-tasks

**Alex (PROJ-000a) in todo-api-read:**
- Scaffolds Node.js/Express project
- Implements `GET /hello` → `{ "message": "Hello from API Read" }`
- Adds `.gitlab-ci.yml` with build, test, auto-tag stages
- Repo-level PAT: "GET /hello returns 200 with message field"
- Merges to main → CI auto-tags `v0.1.0`

**Jordan (PROJ-000b) in todo-api-write:**
- Scaffolds Node.js/Express project
- Implements `POST /placeholder` → returns 200 OK
- Adds `.gitlab-ci.yml`
- Repo-level PAT: "POST /placeholder returns 200"
- Merges to main → CI auto-tags `v0.1.0`

**Sam (PROJ-000c) in todo-mfe:**
- Scaffolds React project with Module Federation plugin (exposes `./App`)
- Implements component that fetches from API and displays message
- Adds `.gitlab-ci.yml`
- Repo-level PAT: "Given API returns message, component displays it" (mocked)
- Merges to main → CI auto-tags `v0.1.0`

**Casey (PROJ-000d) in todo-root:**
- Implements shell as Module Federation host
- Configures remotes to load `todo-mfe` from published URL
- Configures MFE's API URL via environment
- Adds `docker-compose.yml` for local composition
- Runs story-level PATs via Playwright against composed system
- Generates Cypress from PATs, commits to `cypress/integration/PROJ-000.cy.js`
- Updates `project.yaml` to pin all components at `v0.1.0`

### 6. Root repo orchestrates

```
→ Detects todo-api-read@v0.1.0 → updates readiness tracker
→ Detects todo-api-write@v0.1.0 → updates readiness tracker
→ Detects todo-mfe@v0.1.0 → updates readiness tracker
→ Casey commits shell + topology bump + Cypress
→ CI runs story-level Cypress tests
→ Green
→ Tag: v0.1.0
```

### 7. Story Zero complete

The M-type project exists. All subsequent stories build on this baseline.

## End State

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

Tag: `v0.1.0-story-zero-complete`

## What Story Zero Proves

1. **Distributed plumbing works** — Module Federation loads the MFE, MFE calls the API, shell composes them
2. **CI pipelines work** — each repo builds, tests, auto-tags on merge
3. **Root repo orchestration works** — readiness tracker, topology management, story-level Cypress
4. **PAT flow works** — even for a technical story, we wrote PATs, decomposed, validated

## Workshop/Demo Notes

### Fully automated via GitLab MCPs

With the existing `@zereight/mcp-gitlab` plus the supplementary GitLabX MCP (see `gitlabx-mcp.md`), TARS can automate the entire workshop setup with zero manual GitLab UI work:

**Existing MCP handles:**
- Create the four GitLab projects
- Push initial scaffolding code to each repo
- Create branches, raise MRs, merge them
- Create releases/tags
- Create issues for sub-tasks
- Fork repos (for workshop replay)

**GitLabX MCP handles:**
- Create workshop namespace (GitLab group) for isolation
- Configure project settings (merge method, squash, pipeline requirements)
- Protect main branches with appropriate access levels
- Set CI/CD variables (API URLs, registry credentials, cross-repo tokens)
- Add webhooks on managed repos (tag_push_events → root repo pipeline)
- Create project access tokens for cross-repo CI communication

**Nothing requires manual setup** on gitlab.com (shared runners, container registry enabled by default).

### Workshop flow

```
Setup:   TARS creates group, repos, settings, webhooks, code — fully automated
Demo:    Branch, implement, MR, merge, watch orchestration — live
Teardown: TARS deletes the group — cascades to all projects
```

### Replay options

- **From zero:** TARS runs the full setup, does Story Zero live (30-60 min)
- **From baseline:** TARS forks at `v0.1.0-story-zero-complete`, applies settings/webhooks, starts with PROJ-001
- **Hybrid:** Walk through Story Zero commits, replay one sub-task live, then start PROJ-001

## Files in this step

- `jira/PROJ-000.md` — the story ticket
- `jira/PROJ-000a.md` — sub-task: todo-api-read
- `jira/PROJ-000b.md` — sub-task: todo-api-write
- `jira/PROJ-000c.md` — sub-task: todo-mfe
- `jira/PROJ-000d.md` — sub-task: todo-root shell
- `impl/todo-api-read.md` — implementation notes
- `impl/todo-api-write.md` — implementation notes
- `impl/todo-mfe.md` — implementation notes
- `impl/todo-root.md` — implementation notes (shell, Cypress generation)
