# TODOM-001b: api-write — Accept new todos

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-001
**Component:** todo-m-api-write
**Repo:** todo-m-api-write

## Summary

Implement POST /todos endpoint that accepts a new todo with a title.
Validates that the title is non-empty. Stores the todo in a shared
in-memory store (shared with api-read via a simple module or
environment-based approach for the reference implementation).

Note: In this reference implementation, api-read and api-write share
an in-memory array. In a real system this would be a database. The
write API adds to the store; the read API reads from it. For Docker
Compose, both services share state via a simple JSON file or the
read API polls the write API — keep it minimal.

## Acceptance Criteria (Repo-Level PATs)

1. POST /todos creates a new todo
   - Endpoint accepts `{ "title": "..." }` in the request body
   - Returns 201 with the created todo (including generated `id`)
   - The todo is retrievable via GET /todos afterwards

2. Empty title is rejected
   - POST /todos with empty or missing title returns 400
   - Response includes an error message
   - No todo is created

## PAT Stubs

```
describe('TODOM-001 — todo-m-api-write', () => {
  it('POST /todos creates a new todo', () => {
    // AC-003: Accepts { title } and returns 201
    // AC-003: Created todo has id and title
  })

  it('Empty title is rejected', () => {
    // AC-004: Returns 400 for empty/missing title
    // AC-004: Includes error message
  })
})
```
