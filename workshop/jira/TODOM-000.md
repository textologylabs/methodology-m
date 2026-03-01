# TODOM-000: Bootstrap M-Type Infrastructure

**Type:** Technical Story (Infrastructure)
**Status:** In Progress
**Created:** 2026-03-01

## Project

Name: `todo-m`
GitLab group: `methodology-m/todo-m-workshop`

Repos follow the pattern `todo-m-<component>`:

- `todo-m-root` — shell, module federation, story-level Cypress, project.yaml
- `todo-m-mfe` — todo microfrontend
- `todo-m-api-read` — read API (GET endpoints)
- `todo-m-api-write` — write API (POST/PUT/DELETE endpoints)

## Summary

Scaffold and validate the complete M-type project infrastructure. This story proves that distributed multi-repo delivery works before any user-facing features are built. It is the least interesting from a feature perspective but the most critical from a systems perspective — all subsequent stories depend on this foundation.

## Acceptance Criteria (Story-Level PATs)

These are topology-agnostic user-outcome statements. They define what "working infrastructure" means.

1. Shell loads and displays content
   - User navigates to the application shell
   - Shell renders without errors
   - Shell is ready to compose microfrontends

2. MFE loads and displays content
   - Shell successfully loads the todo-mfe microfrontend
   - MFE renders a "Hello" component
   - MFE is visible in the shell

3. MFE fetches from API
   - MFE makes a GET request to the API
   - API returns a message
   - MFE displays the message

4. API endpoints respond
   - GET /hello returns 200 with a message field
   - POST /placeholder returns 200 OK
   - Both endpoints are accessible from the MFE

5. All components are versioned and pinned
   - Each component has a semantic version tag (v0.1.0)
   - Root repo's project.yaml pins all components to v0.1.0
   - Topology is reproducible and deployable

6. Story-level tests validate the system
   - Cypress tests run against the composed system
   - All story-level PATs pass
   - Integration is proven end-to-end
