# todo-api-write — PROJ-000b

## Sub-task
Scaffold todo-api-write with placeholder endpoint

## Repo-level PATs
- POST /placeholder returns 200 OK

## Implementation

### Project structure
```
todo-api-write/
  src/
    index.js          # Express app, /placeholder endpoint
  package.json
  .gitlab-ci.yml
  Dockerfile
  README.md
```

### Endpoint
```
POST /placeholder
Response: { "status": "ok" }
Status: 200
```

### CI pipeline (.gitlab-ci.yml)
Same structure as todo-api-read — build, test, release stages with auto-tagging.

### Docker
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src ./src
EXPOSE 3002
CMD ["node", "src/index.js"]
```

## Notes
This service is a placeholder for Story Zero. Real write endpoints (POST /todos, PATCH /todos/:id, DELETE /todos/:id) come in later stories (PROJ-002 onwards).

## Release
Tag: `todo-api-write@v0.1.0`
