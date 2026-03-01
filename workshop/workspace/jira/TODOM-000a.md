# TODOM-000a: Bootstrap todo-m-root

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-000
**Component:** todo-m-root
**Repo:** todo-m-root

## Summary

Scaffold the root repo: shell, module federation config, story-level Cypress,
and project.yaml. Owns the topology-level PATs for TODOM-000.

## Acceptance Criteria (Repo-Level PATs)

1. Shell loads and displays content
   - User navigates to the application shell
   - Shell renders without errors
   - Shell is ready to compose microfrontends

2. All components are versioned and pinned
   - Each component has a semantic version tag (v0.1.0)
   - Root repo's project.yaml pins all components to v0.1.0
   - Topology is reproducible and deployable

3. Story-level tests validate the system
   - Cypress tests run against the composed system
   - All story-level PATs pass
   - Integration is proven end-to-end

## PAT Stubs

```
describe('TODOM-000 — todo-m-root', () => {
  it('shell loads and displays content', () => {
    // PAT 1: User navigates to the application shell
    // PAT 1: Shell renders without errors
    // PAT 1: Shell is ready to compose microfrontends
  })

  it('all components are versioned and pinned', () => {
    // PAT 5: Each component has a semantic version tag (v0.1.0)
    // PAT 5: Root repo project.yaml pins all components to v0.1.0
    // PAT 5: Topology is reproducible and deployable
  })

  it('story-level tests validate the system', () => {
    // PAT 6: Cypress tests run against the composed system
    // PAT 6: All story-level PATs pass
    // PAT 6: Integration is proven end-to-end
  })
})
```
