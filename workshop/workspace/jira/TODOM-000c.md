# TODOM-000c: Bootstrap todo-m-api-read

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-000
**Component:** todo-m-api-read
**Repo:** todo-m-api-read

## Summary

Scaffold the read API repo: GET /hello endpoint, repo-level CI, and contract
test. Owns the GET endpoint slice of PAT 4 for TODOM-000.

## Acceptance Criteria (Repo-Level PATs)

1. GET /hello endpoint responds
   - GET /hello returns 200 with a message field
   - Endpoint is accessible from the MFE

## PAT Stubs

```
describe('TODOM-000 — todo-m-api-read', () => {
  it('GET /hello returns 200 with message field', () => {
    // PAT 4: GET /hello returns 200 with a message field
    // PAT 4: Endpoint is accessible from the MFE
  })
})
```
