# todo-mfe — PROJ-001b

## Sub-task
Render todo list with title, status, and empty state

## Repo-level PATs
- Given todos data, renders list items with `data-testid='todo-item'` showing title and status
- Given empty data, renders element with `data-testid='empty-state'` containing "No todos yet"

## Implementation notes

Component: `TodoList`

Fetches from `GET /todos` (API URL from environment config).

Renders:
- `[data-testid='todo-list']` — the list container
- `[data-testid='todo-item']` — one per todo
- `[data-testid='todo-title']` — the title text within each item
- `[data-testid='todo-status']` — completion indicator within each item
- `[data-testid='empty-state']` — shown when array is empty, contains "No todos yet"

Repo-level PATs use mocked data (no real API call). The story-level PATs in the root repo test the real integration.

## Release
Tag: `todo-mfe@v1.0.0`
