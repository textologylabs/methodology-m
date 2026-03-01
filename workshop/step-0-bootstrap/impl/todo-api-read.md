# todo-api-read — PROJ-000a

## Sub-task
Scaffold todo-api-read with hello endpoint

## Repo-level PATs
- GET /hello returns 200 with JSON containing `message` field
- Response message equals "Hello from API Read"

## Implementation

### Project structure
```
todo-api-read/
  src/
    index.js          # Express app, /hello endpoint
  package.json
  .gitlab-ci.yml
  Dockerfile
  README.md
```

### Endpoint
```
GET /hello
Response: { "message": "Hello from API Read" }
Status: 200
```

### CI pipeline (.gitlab-ci.yml)
```
stages:
  - build
  - test
  - release

build:
  stage: build
  script:
    - npm ci
    - npm run build

test:
  stage: test
  script:
    - npm test

release:
  stage: release
  only:
    - main
  script:
    - npm version patch --no-git-tag-version
    - VERSION=$(node -p "require('./package.json').version")
    - git tag "v$VERSION"
    - git push origin "v$VERSION"
```

### Docker
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src ./src
EXPOSE 3001
CMD ["node", "src/index.js"]
```

## Release
Tag: `todo-api-read@v0.1.0`
