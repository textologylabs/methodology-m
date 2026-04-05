# Requirements Document

## Introduction

Docker Compose integration for the todo-m distributed system (improvement item I-014). This feature adds production-like Docker images and a docker-compose.yml to the root repo, enabling all four components (shell, mfe, api-read, api-write) to be assembled and run as containers. The existing process-based local compose remains unchanged. Docker compose serves as the "integration" compose strategy for CI shadow integration testing.

## Glossary

- **Root_Repo**: The todo-m-root repository that orchestrates the distributed system, contains the shell as an embedded package, and owns compose configuration
- **Shell**: The React + webpack Module Federation host application, embedded in Root_Repo at packages/shell/, served on port 3000
- **MFE**: The React + webpack Module Federation remote application (todo-m-mfe), exposing remoteEntry.js on port 3001
- **API_Read**: The Express backend serving GET /hello on port 3002
- **API_Write**: The Express backend serving POST /placeholder on port 3003
- **Docker_Compose_File**: The docker-compose.yml in Root_Repo that defines all four service containers and their networking
- **Dockerfile**: A per-component file that defines how to build a production-like Docker image for that component
- **Nginx_Config**: An nginx configuration file used by frontend containers (Shell, MFE) to serve static webpack build output
- **Project_YAML**: The project.yaml topology manifest in Root_Repo that declares components, ports, and compose strategies
- **Compose_Section**: The compose block in Project_YAML that declares local and integration compose strategies
- **Build_Script**: The npm script compose:docker:build in Root_Repo that builds all Docker images
- **Start_Script**: The npm script compose:docker in Root_Repo that starts the Docker composed system
- **Stop_Script**: The npm script compose:docker:stop in Root_Repo that stops the Docker composed system
- **Health_Check**: A verification that a container is serving its expected content on its designated port

## Requirements

### Requirement 1: Project YAML Compose Section

**User Story:** As a developer, I want project.yaml to declare both local and integration compose strategies with component ports, so that tooling can derive compose configuration from a single source of truth.

#### Acceptance Criteria

1. THE Project_YAML SHALL include a port field for each component entry (shell=3000, mfe=3001, api-read=3002, api-write=3003)
2. THE Project_YAML SHALL include a compose section with a local strategy entry referencing the existing process-based scripts (scripts/start-all.sh, scripts/stop-all.sh)
3. THE Project_YAML SHALL include a compose section with an integration strategy entry specifying docker-compose as the strategy and docker-compose.yml as the file
4. THE Compose_Section integration entry SHALL declare health check endpoints for each component using the component service name and port

### Requirement 2: Backend Dockerfiles

**User Story:** As a developer, I want production-like Dockerfiles for api-read and api-write, so that each backend can be built into a container image that runs with Node.js.

#### Acceptance Criteria

1. THE API_Read Dockerfile SHALL use a Node.js base image, copy package.json and package-lock.json, install production dependencies, copy source files, and set the entrypoint to run src/server.js
2. THE API_Write Dockerfile SHALL use a Node.js base image, copy package.json and package-lock.json, install production dependencies, copy source files, and set the entrypoint to run src/server.js
3. WHEN the API_Read container starts, THE API_Read container SHALL listen on port 3002 and respond to GET /hello with a JSON message
4. WHEN the API_Write container starts, THE API_Write container SHALL listen on port 3003 and respond to POST /placeholder with a JSON status

### Requirement 3: Frontend Dockerfiles and Nginx Configuration

**User Story:** As a developer, I want production-like Dockerfiles for the shell and MFE that build webpack output and serve it via nginx, so that frontend containers behave like production deployments.

#### Acceptance Criteria

1. THE MFE Dockerfile SHALL use a multi-stage build: a Node.js stage that runs webpack production build, and an nginx stage that copies the built output into the nginx serving directory
2. THE Shell Dockerfile SHALL use a multi-stage build: a Node.js stage that runs webpack production build with MFE_URL set to http://localhost:3001, and an nginx stage that copies the built output into the nginx serving directory
3. THE MFE Nginx_Config SHALL serve static files from the webpack build output directory on port 3001, including remoteEntry.js
4. THE Shell Nginx_Config SHALL serve static files from the webpack build output directory on port 3000
5. WHEN a browser requests remoteEntry.js from the MFE container on port 3001, THE MFE container SHALL return the Module Federation remote entry file with correct CORS headers
6. THE MFE Nginx_Config SHALL include CORS headers (Access-Control-Allow-Origin) to permit the Shell to load remoteEntry.js cross-origin from localhost:3001

### Requirement 4: Docker Compose File

**User Story:** As a developer, I want a docker-compose.yml in the root repo that wires all four components together, so that the entire system can be started with a single command.

#### Acceptance Criteria

1. THE Docker_Compose_File SHALL define four services: shell, mfe, api-read, and api-write
2. THE Docker_Compose_File SHALL map each service to its designated host port (shell=3000, mfe=3001, api-read=3002, api-write=3003)
3. THE Docker_Compose_File SHALL specify build contexts that reference each component's directory relative to the root repo (packages/shell for shell, sibling directories for mfe, api-read, api-write)
4. THE Docker_Compose_File SHALL declare the shell service as depending on the mfe, api-read, and api-write services
5. WHEN docker compose up is executed, THE Docker_Compose_File SHALL start all four containers with each accessible on its designated localhost port

### Requirement 5: NPM Compose Scripts

**User Story:** As a developer, I want npm scripts in the root repo to build, start, and stop the Docker composed system, so that Docker compose operations follow the same npm script convention as local compose.

#### Acceptance Criteria

1. THE Root_Repo package.json SHALL include a compose:docker:build script that runs docker compose build
2. THE Root_Repo package.json SHALL include a compose:docker script that runs docker compose up in detached mode
3. THE Root_Repo package.json SHALL include a compose:docker:stop script that runs docker compose down
4. WHEN a developer runs npm run compose:docker, THE Start_Script SHALL start all four containers in the background and return control to the terminal

### Requirement 6: Module Federation in Docker

**User Story:** As a developer, I want Module Federation to work in the Docker composed system the same way it works in local dev, so that the browser can load the MFE remote entry from the shell.

#### Acceptance Criteria

1. WHEN the Shell container is built, THE Shell Dockerfile SHALL set MFE_URL to http://localhost:3001 so that the webpack build bakes in the correct Module Federation remote URL for browser access
2. WHEN the MFE container is built, THE MFE Dockerfile SHALL set API_URL to http://localhost:3002 so that the webpack build bakes in the correct API endpoint for browser access
3. WHEN a user opens http://localhost:3000 in a browser with all containers running, THE Shell SHALL load and render the MFE Hello component via Module Federation
4. WHEN the MFE Hello component renders, THE MFE SHALL fetch data from http://localhost:3002/hello and display the API response message

### Requirement 7: Integration Test Compatibility

**User Story:** As a developer, I want the existing Cypress integration tests to run against the Docker composed system, so that the same tests validate both local and containerised environments.

#### Acceptance Criteria

1. WHEN all Docker containers are running, THE Root_Repo Cypress tests SHALL pass against http://localhost:3000 without modification
2. THE Root_Repo SHALL preserve the existing integration-test npm script for future CI integration with Docker compose
