---
inclusion: manual
---

# Workshop Steering — Todo M Reference Implementation

**Project:** todo-m-workshop

This steering file provides workshop-specific context and decisions for building the Methodology M reference implementation.

## Project Context

- **Project Name:** todo-m-workshop
- **GitLab Group:** `todo-m-workshop`
- **Visibility:** Public
- **Description:** Reference implementation for Methodology M — distributed, multi-repo delivery

## Application

Building a Todo application to demonstrate Methodology M:

- **Shell:** SPA host (Module Federation)
- **MFE:** Todo microfrontend (React)
- **API Read:** GET /todos endpoint (Node.js/Express)
- **API Write:** POST/PATCH/DELETE endpoints (Node.js/Express)

## Story Zero (PROJ-000)

The bootstrapping story that proves the M-type infrastructure works.

**Story-level PATs:**
- Shell loads and displays content from MFE
- MFE fetches from API and displays response
- All components pinned to validated versions in project.yaml

**Sub-tasks:**
- PROJ-000a: todo-api-read — GET /hello endpoint
- PROJ-000b: todo-api-write — POST /placeholder endpoint
- PROJ-000c: todo-mfe — Hello component + fetch
- PROJ-000d: todo-root — Shell + Module Federation + Cypress

## Technology Stack

- **Shell:** Vanilla JS or lightweight framework
- **MFE:** React
- **APIs:** Node.js + Express
- **CI/CD:** GitLab CI
- **Tests:** Cypress (story-level), Jest/Vitest (repo-level)
- **Local Composition:** Docker Compose

## Key Decisions

- **Auto-tag on merge:** CI handles versioning, no manual tagging
- **Local markdown for Jira:** `jira/` folder in root repo, version-controlled
- **Sequential implementation:** Simulate four devs by implementing sub-tasks one at a time
- **Replayable:** Every step documented with exact tool payloads in `workspace-script.md`

