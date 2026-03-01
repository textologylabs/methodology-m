# todo-api-read — PROJ-001a

## Sub-task
Implement GET /todos endpoint

## Repo-level PATs
- GET /todos returns 200 with array of objects containing `title` (string) and `completed` (boolean) fields
- GET /todos returns empty array when no todos exist

## Implementation notes

Endpoint: `GET /todos`

Response shape:
```
[
  { "id": "uuid", "title": "Buy milk", "completed": false },
  { "id": "uuid", "title": "Walk the dog", "completed": true }
]
```

Empty case returns `[]` with 200.

For this step, data can be in-memory (no database yet). A hardcoded seed list is fine — the PATs just need the shape to be correct.

## Release
Tag: `todo-api-read@v1.0.0`
