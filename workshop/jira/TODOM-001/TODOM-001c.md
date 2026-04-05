# TODOM-001c: mfe — Todo list UI and add form

**Type:** Technical Sub-Task
**Status:** Pending
**Parent:** TODOM-001
**Component:** todo-m-mfe
**Repo:** todo-m-mfe

## Summary

Replace the Hello component with a Todo component that displays the
todo list fetched from api-read and provides a form to add new todos
via api-write. Handles empty state gracefully. All interactive elements
use data-testid attributes for stable test selectors.

## Acceptance Criteria (Repo-Level PATs)

1. Todo list renders with count
   - Fetches todos from GET /todos on mount
   - Renders each todo title in a list with `data-testid="todo-item"`
   - Shows item count with `data-testid="todo-count"` (e.g. "3 items")
   - List container has `data-testid="todo-list"`

2. Empty state is displayed
   - When API returns empty array, shows `data-testid="todo-empty-state"`
   - Message reads "No todos yet — add one below"
   - Add form is still visible below the empty state

3. Add form submits new todo
   - Text input with `data-testid="todo-input"` and placeholder "Add a new todo..."
   - Submit button with `data-testid="todo-add-button"` labelled "Add"
   - On submit: POST to /todos, then re-fetch the list
   - Input is cleared after successful submission
   - New todo appears in the list without page reload

4. Add button is disabled when input empty
   - Button is disabled when input value is empty string
   - Button becomes enabled when user types any character

## UX Reference

See `with-todos.png` and `without-todos.png` in the story folder for
the visual target. Key elements:
- Centred card layout with subtle shadow
- "Todo M" heading with item count subtitle
- Bullet-style list items
- Input + button row at bottom
- Disabled button state (greyed out) when input empty

## PAT Stubs

```
describe('TODOM-001 — todo-m-mfe', () => {
  it('renders todo list with count', () => {
    // AC-001: Fetches and displays todos
    // AC-001: Shows item count
  })

  it('displays empty state', () => {
    // AC-002: Shows "No todos yet" message
    // AC-002: Add form still visible
  })

  it('submits new todo and refreshes list', () => {
    // AC-003: Types title, clicks Add
    // AC-003: New todo appears in list
    // AC-003: Input cleared
  })

  it('disables Add button when input empty', () => {
    // AC-004: Button disabled on empty input
    // AC-004: Button enabled when text entered
  })
})
```
