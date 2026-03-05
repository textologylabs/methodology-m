# TODOM-000: Bootstrap M-Type Infrastructure

**Type:** Technical Story (Infrastructure)
**Status:** In Progress
**Created:** 2026-03-01

## Project

Name: `todo-m`
GitLab group: `methodology-m/todo-m-workshop`
Topology: distributed
CI platform: GitLab CI
Story management: local markdown
PAT framework: Cypress
Deployment: Docker Compose

Repos follow the pattern `todo-m-<component>`:

- `todo-m-root` — shell (embedded), module federation, story-level Cypress, project.yaml
- `todo-m-mfe` — todo microfrontend (referenced)
- `todo-m-api-read` — read API, GET endpoints (referenced)
- `todo-m-api-write` — write API, POST/PUT/DELETE endpoints (referenced)

## Summary

Scaffold and validate the complete M-type project infrastructure. This story proves that distributed multi-repo delivery works before any user-facing features are built. It is the least interesting from a feature perspective but the most critical from a systems perspective — all subsequent stories depend on this foundation.

## Acceptance Criteria

These are topology-agnostic user-outcome statements. They define what "working infrastructure" means.

1. Shell loads and renders
   - User navigates to the application
   - Shell renders without errors
   - Shell is ready to compose microfrontends

2. Microfrontend loads inside the shell
   - The shell composes the microfrontend
   - The microfrontend renders a greeting component
   - The greeting is visible to the user

3. Microfrontend displays data from the API
   - The microfrontend fetches data from the backend
   - The backend returns a message
   - The message is displayed to the user

4. API endpoints are operational
   - A read endpoint returns a success response with a message
   - A write endpoint accepts a request and returns a success response
   - Both endpoints are reachable from the frontend

5. All components are versioned and pinned
   - Each component has a semantic version tag
   - The project manifest pins all components to known versions
   - The topology is reproducible from the manifest alone

6. Story-level tests validate the composed system
   - Acceptance tests run against the fully composed system
   - All story-level acceptance criteria pass end-to-end
   - Integration is proven across all components
