# Tasks

## Task 1: Update project.yaml with ports and compose section
- [x] 1.1 Add `port` field to each component entry in project.yaml (shell=3000, mfe=3001, api-read=3002, api-write=3003)
- [x] 1.2 Add `compose` section with `local` strategy entry referencing existing scripts (scripts/start-all.sh, scripts/stop-all.sh)
- [x] 1.3 Add `compose` section with `integration` strategy entry specifying docker-compose strategy, docker-compose.yml file, and health check endpoints

## Task 2: Create backend Dockerfiles and .dockerignore files
- [x] 2.1 Create `Dockerfile` in todo-m-api-read: node:20-alpine base, copy package files, npm ci --omit=dev, copy src/, expose 3002, CMD node src/server.js
- [x] 2.2 Create `.dockerignore` in todo-m-api-read: exclude node_modules, .git, dist
- [x] 2.3 Create `Dockerfile` in todo-m-api-write: node:20-alpine base, copy package files, npm ci --omit=dev, copy src/, expose 3003, CMD node src/server.js
- [x] 2.4 Create `.dockerignore` in todo-m-api-write: exclude node_modules, .git, dist

## Task 3: Create MFE Dockerfile, nginx config, and .dockerignore
- [x] 3.1 Create `nginx.conf` in todo-m-mfe: listen on 3001, serve static files from /usr/share/nginx/html, add CORS headers (Access-Control-Allow-Origin: *) for remoteEntry.js
- [x] 3.2 Create `Dockerfile` in todo-m-mfe: multi-stage build — stage 1 node:20-alpine with npm ci + webpack build (API_URL=http://localhost:3002), stage 2 nginx:alpine copying dist and nginx.conf
- [x] 3.3 Create `.dockerignore` in todo-m-mfe: exclude node_modules, .git, dist

## Task 4: Create Shell Dockerfile, nginx config, and .dockerignore
- [x] 4.1 Create `nginx.conf` in packages/shell: listen on 3000, serve static files from /usr/share/nginx/html, SPA fallback to index.html
- [x] 4.2 Create `Dockerfile` in packages/shell: multi-stage build — stage 1 node:20-alpine with npm ci + webpack build (MFE_URL=http://localhost:3001), stage 2 nginx:alpine copying dist and nginx.conf
- [x] 4.3 Create `.dockerignore` in packages/shell: exclude node_modules, .git, dist

## Task 5: Create docker-compose.yml
- [x] 5.1 Create `docker-compose.yml` in root repo with four services (shell, mfe, api-read, api-write), build contexts using relative paths, port mappings, PORT env vars for backends, and shell depends_on mfe/api-read/api-write

## Task 6: Add NPM compose scripts to root repo package.json
- [x] 6.1 Add `compose:docker:build`, `compose:docker`, and `compose:docker:stop` scripts to root repo package.json

## Task 7: Update .gitignore
- [x] 7.1 Verify root repo .gitignore does not need updates for Docker artefacts (no generated files to ignore — Dockerfiles and configs are tracked)
