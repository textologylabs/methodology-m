# TODOM-001d: shell — End-to-end compose validation

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-001
**Component:** todo-m-root (shell)
**Repo:** todo-m-root

## Summary

Validate that the full composed system works end-to-end for TODOM-001.
The shell composes the MFE which communicates with both APIs. The
story-level Cypress tests run against the Docker Compose environment
and verify the complete add-and-view flow.

No code changes to the shell itself are expected — the shell already
composes the MFE via Module Federation. This sub-task is about
story-level integration validation.

## Acceptance Criteria (Repo-Level PATs)

1. Composed system works end-to-end
   - Shell loads and composes the MFE
   - MFE renders the todo list (fetched from api-read)
   - User can add a todo (submitted to api-write)
   - New todo appears in the list (round-trip through both APIs)
   - Full flow works in Docker Compose environment

## PAT Stubs

```
describe('TODOM-001 — story-level integration', () => {
  it('full add-and-view flow works end-to-end', () => {
    cy.visit('/')
    cy.get('[data-testid="app-shell"]').should('be.visible')
    cy.get('[data-testid="todo-list"]').should('be.visible')
    cy.get('[data-testid="todo-input"]').type('End-to-end test')
    cy.get('[data-testid="todo-add-button"]').click()
    cy.get('[data-testid="todo-list"]').should('contain', 'End-to-end test')
  })
})
```
