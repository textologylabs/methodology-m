# TODOM-000b: Bootstrap todo-m-mfe

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-000
**Component:** todo-m-mfe
**Repo:** todo-m-mfe

## Summary

Scaffold the MFE repo: Hello component, API fetch, module federation export,
and repo-level CI. Owns the MFE rendering and fetch PATs for TODOM-000.

## Acceptance Criteria (Repo-Level PATs)

1. MFE loads and displays content
   - Shell successfully loads the todo-mfe microfrontend
   - MFE renders a "Hello" component
   - MFE is visible in the shell

2. MFE fetches from API
   - MFE makes a GET request to the API
   - API returns a message
   - MFE displays the message

## PAT Stubs

```
describe('TODOM-000 — todo-m-mfe', () => {
  it('MFE loads and displays content', () => {
    // PAT 2: Shell successfully loads the todo-mfe microfrontend
    // PAT 2: MFE renders a "Hello" component
    // PAT 2: MFE is visible in the shell
  })

  it('MFE fetches from API', () => {
    // PAT 3: MFE makes a GET request to the API
    // PAT 3: API returns a message
    // PAT 3: MFE displays the message
  })
})
```
