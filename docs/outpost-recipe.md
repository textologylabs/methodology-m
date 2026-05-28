# Outpost container recipe — pre-warming M at user scope

Outpost agents (SM, Dev, QA, Rev) run in disposable containers and must
be fluent in M from the first prompt. Per-project `.m/` installs (the
default) work for repos checked out inside the container, but the agent
also needs M available **before** any repo is cloned — for the very
first capability call where it bootstraps the workspace.

User-scope install solves this: `m init --user` writes
`~/.m/`, `~/.m-version`, and the matching wrappers into `~/.claude/`.
Skill discovery then resolves M's skills from the user-level fallback
on any working directory, even an empty one.

## Dockerfile sketch

```dockerfile
FROM node:20-slim

# 1. Install the CLI globally
RUN npm i -g methodology-m@1

# 2. Bake .claude/ so the agent runtime can find the wrappers
RUN mkdir -p /root/.claude

# 3. Pre-warm M at user scope. ~/.m/ becomes the fallback for any
#    project that doesn't pin its own version.
RUN m init --user

# 4. Optional: drop a project pin into the working tree at runtime
#    via `m init` after the agent clones the repo.
WORKDIR /workspace
```

The image now carries:

- `/root/.m/` — canonical layer (the M version this container speaks)
- `/root/.m-version` — pin file
- `/root/.claude/steering/m-steering.md` — points at `~/.m/m.md`
- `/root/.claude/skills/<capability>/SKILL.md` — point at
  `~/.m/capabilities/<capability>/SKILL.md`

## When the agent enters a project

Per ADR-0001, project-scope `.m/` is the source of truth when present.
The skill-discovery precedence (project → user → plugin) means a
project that has run `m init` overrides the container's pre-warmed
copy automatically. No conflict, no flag.

If a project has not run `m init`, the agent still operates from the
container's user-scope M — which is the desired behaviour for early
adopters who haven't pinned M into their repo yet.

## Refreshing wrappers on upgrade

```sh
npm i -g methodology-m@latest
m update --user --refresh-wrappers
```

`--refresh-wrappers` re-generates only the agent wrappers that don't
exist; hand-edits to existing wrappers are preserved.

## Constraints

- The image baking `m init --user` pins to the M version bundled with
  that CLI release. Rebuild the image to upgrade.
- User-scope wrappers reference `~/.m/`. If you symlink or move the
  home directory, regenerate the wrappers with `--refresh-wrappers`.
- This is a **user-scope fallback**, not a replacement for per-project
  pinning. Projects in long-lived development should still run
  `m init` to lock their M version into the repo.
