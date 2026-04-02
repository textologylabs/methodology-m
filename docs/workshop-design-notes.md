# Workshop Design Notes

Design rationale and planning notes for the workshop structure.
Extracted from the workshop script to keep the playbook clean.

---

## Stage 1 Live Demo Strategy

TODOM-000c (todo-m-api-read) is the live demo component — the simplest
one. One endpoint, no UI, clean PAT-to-AT transformation. The presenter
works in the local clone following a normal dev workflow:

1. `cd` into the local clone of `todo-m-api-read`
2. Create a feature branch: `git checkout -b feat/TODOM-000c-implement`
3. Ask Kiro to implement the endpoint
4. `npm install` and verify with `curl` (smoke test)
5. Ask Kiro to transform PAT stubs into acceptance tests
6. `npm test` — show tests passing
7. Commit, push, open MR on GitLab
8. Show CI pipeline running and passing
9. Merge the MR

After the live demo, pre-baked commits land the remaining components
(TODOM-000d, TODOM-000b, TODOM-000a) so we can move to integration
without repeating the same cycle three more times.

---

## PAT-to-CAT Technology Choices

PATs are pseudo (framework-agnostic intent). CATs are compiled
(framework-specific, CI-runnable). The compilation target depends on
the component role:

| Repo | PAT Stubs Say | AT Framework | Why |
|------|---------------|--------------|-----|
| todo-m-api-read | "GET /hello returns 200 with message field" | supertest + vitest | HTTP contract testing, no browser needed |
| todo-m-api-write | "POST /placeholder returns 200 OK" | supertest + vitest | Same — pure API contract |
| todo-m-mfe | "MFE renders Hello component" | vitest + Testing Library | Component-level, mocked API, fast |
| todo-m-root | "Shell loads, MFE visible, API message displays" | Cypress | Story-level, composed system, browser required |

Key insight for the audience: PATs are framework-agnostic. The same
acceptance criterion expressed in PAT.yaml becomes a supertest CAT in
an API repo and a Cypress CAT in the root repo. The methodology doesn't
prescribe Cypress everywhere — it prescribes PATs everywhere. The
compilation target varies; the contract doesn't.

---

## M Power Capabilities by Stage

### Stage 0 (Scaffolding)
- `setup-workspace` — creates the GitLab group
- `bootstrap-root-repo` — creates root repo, seeds with project.yaml and Story Zero
- `generate-pats` — generates story-level PATs from acceptance criteria
- `decompose-story` — decomposes story into component sub-tasks
- `scaffold-repo` — creates managed repos with pluggable CI pipelines, branch protection, access tokens
- `wire-orchestration` — connects managed repos to root repo (webhooks, triggers, tokens, root CI pipeline)

### Stage 1 (Development)
- `generate-acceptance-tests` — compiles PAT stubs into CATs using the repo-appropriate framework
- `tag-release` — tags a managed repo at a version, updates root repo's project.yaml

### Not an M Power capability
- Implementation is normal development work. The sub-task file and managed
  repo steering guide the AI, but there is no `implement-component` power.
  The methodology prescribes the contract (PATs) and the validation
  (CATs), not how you write code.

### Deferred (Stage 2+)
- `create-readiness-tracker` — creates the readiness manifest in the root repo

---

## Why CATs, Not Unit Tests First?

A natural question: "why jump straight to compiled acceptance tests
instead of unit tests?" In M, PATs are the contract — they define what
"done" means for a sub-task. Unit tests are a developer concern that
emerge naturally during implementation. The methodology cares about PATs
because they validate the story. So the dev cycle is: implement the
thing, then prove it meets the contract by compiling PATs into CATs.

Unit tests may appear along the way (and should), but they're not what M
tracks. The readiness tracker advances when CATs pass, not when unit
tests pass.
