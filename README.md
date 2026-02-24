# Methodology M

**AI-Driven Managed Multi-Team Delivery Method**

Version 1.0 — Draft

---

Methodology M is a delivery method for distributed software systems where a single user story spans multiple repos, multiple deployable units, and can only be verified in an integrated environment.

It builds on the AI-first SDLC concept of PATs (Pseudo Acceptance Tests) — change encapsulated with its validation — and extends it to the multi-repo, multi-team reality.

## What it covers

- **The Root Repo Model** — one orchestrating unit that manages all components, whether embedded or in separate repos. A single `project.yaml` is the source of truth for "what works together."
- **PAT Topology** — two levels of tests with distinct scopes. Story-level PATs validate user outcomes against the composed system. Repo-level PATs validate component contracts in isolation. PATs flow downward from user intent, not upward from implementation.
- **Distributed Trunk-Based Development** — every managed repo does trunk-based dev. The root repo's main branch is the distributed trunk — every commit is a complete, validated, deployable state.
- **Shadow Integration** — speculative integration testing triggered when a managed repo MR is raised. A topology MR on the root repo tests the combination before anything merges. Multi-component stories are validated together, pre-merge.
- **The Merge Transaction** — a deterministic CI pipeline that atomically merges all managed repo MRs for a story, updates the topology to real tags, and lands the validated combination on root repo main. Enforces a dual gate: behavioural (PATs green) and completeness (all sub-tasks present).
- **Kiro and GitLab CI Separation** — Kiro (IDE) handles the thinking phases where AI adds value: PAT generation, story decomposition, impact analysis, implementation guidance. GitLab CI handles the deterministic phases: building, testing, orchestrating, deploying. Clean boundary.
- **The M-Project Skill** — the methodology packaged as an installable Kiro skill that bootstraps an M-type project from scratch, including Story Zero.

## The key idea

An M-type project uses a root repo as the integration surface. The root repo contains the application shell, story-level PATs, and a topology file (`project.yaml`) that pins every component to a tested version. Shadow integration tests combinations before merge. A merge transaction lands complete stories atomically. The root repo's main branch only moves forward on fully validated combinations.

The methodology applies from the first commit. Story Zero — the bootstrapping story — uses the same PAT-driven flow as every subsequent story. There is no pre-methodology setup phase.

## Read the full methodology

[methodology-m.md](methodology-m.md)

## Status

This is a v1.0 draft. The core model is complete. A reference implementation (Todo app, four repos, GitLab CI) is planned to validate the methodology in practice.

## Background

Methodology M builds on the AI-first SDLC introduced in Part 1 ("From Code Completion to an AI-First SDLC Strategy"). PATs, the three-phase pipeline (Idea → Development → Deployment), and the principle that change travels with its validation are all established there. Methodology M extends these ideas to the distributed, multi-team case.

## Licence

This work is licensed under the [Creative Commons Attribution 4.0 International Licence (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt this material for any purpose, including commercially, as long as you give appropriate credit.
