# TODOM-002: Mark todos as complete

**Type:** Story
**Status:** Open
**Priority:** Normal

## Summary

As a user, I want to mark todos as complete so I can track my progress.
Completed todos should be visually distinct (strike-through) and the
app should show a progress summary (e.g. "2 of 5 complete").

Toggling a todo's completion state should be instant — tap the checkbox,
see the change. The completed state persists across page reloads.

## Acceptance Criteria

1. Each todo item displays a checkbox
   - Unchecked for incomplete todos
   - Checked for completed todos
   - Checkbox has `data-testid="todo-checkbox-{id}"`

2. Clicking the checkbox toggles completion
   - Sends PATCH /todos/:id with `{ completed: true/false }`
   - UI updates immediately (optimistic or after response)
   - Completed todos show strike-through text styling

3. GET /todos returns completion state
   - Each todo object includes `completed` (boolean, default false)
   - Existing todos without a completed field default to false

4. Progress summary is displayed
   - Shows "2 of 5 complete" (or "0 of 3 complete")
   - Updates when a todo is toggled
   - Has `data-testid="todo-progress"`

5. Completion state persists
   - Reload the page — completed todos remain checked
   - The database stores the completed field

## UX Reference

- Checkbox to the left of each todo title
- Completed todos: checked box + strike-through text + muted colour
- Progress summary below the heading, next to the item count

## Components Affected

| Component | Role |
|-----------|------|
| todo-m-api-read | Return `completed` field in GET /todos |
| todo-m-api-write | PATCH /todos/:id to toggle completion |
| todo-m-mfe | Checkbox UI, strike-through, progress summary |
| todo-m-root | Story-level integration tests for the round-trip |
