# TODOM-001a: api-read — Serve todo list

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-001
**Component:** todo-m-api-read
**Repo:** todo-m-api-read

## Summary

Implement GET /todos endpoint that returns the todo list. Returns an
empty array when no todos exist. Todos are stored in-memory (no
database for the reference implementation).

## Acceptance Criteria (Repo-Level PATs)

1. GET /todos returns the todo list
   - Endpoint returns 200 with a JSON array of todo objects
   - Each todo has an `id` and `title` field
   - Todos are returned in insertion order

2. Empty state returns empty array
   - When no todos exist, GET /todos returns 200 with `[]`
   - Response is still valid JSON with correct content-type

## PAT Stubs

```
describe('TODOM-001 — todo-m-api-read', () => {
  it('GET /todos returns the todo list', () => {
    // AC-001: Endpoint returns 200 with JSON array
    // AC-001: Each todo has id and title
  })

  it('Empty state returns empty array', () => {
    // AC-002: Returns 200 with []
  })
})
```
