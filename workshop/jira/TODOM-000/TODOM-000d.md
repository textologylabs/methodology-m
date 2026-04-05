# TODOM-000d: Bootstrap todo-m-api-write

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-000
**Component:** todo-m-api-write
**Repo:** todo-m-api-write

## Summary

Scaffold the write API repo: POST /placeholder endpoint, repo-level CI, and
contract test. Owns the POST endpoint slice of PAT 4 for TODOM-000.

## Acceptance Criteria (Repo-Level PATs)

1. POST /placeholder endpoint responds
   - POST /placeholder returns 200 OK
   - Endpoint is accessible from the MFE

## PAT Stubs

```
describe('TODOM-000 — todo-m-api-write', () => {
  it('POST /placeholder returns 200 OK', () => {
    // PAT 4: POST /placeholder returns 200 OK
    // PAT 4: Endpoint is accessible from the MFE
  })
})
```
