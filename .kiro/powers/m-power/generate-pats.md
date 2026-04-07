# M Power: generate-pats

**Capability:** Generate story-level PATs from a story file

## What it does

Reads a story file, generates a `pat.yaml` file following the PAT.yaml schema
defined in Methodology M. The PAT file is the machine-readable, structured
expression of the story's acceptance criteria — the source of truth that drives
decomposition, implementation, and validation.

Story-level PATs are topology-agnostic. They describe user outcomes, not
component behaviour. No technical implementation details, no component names.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `story-file` | path | Yes | Path to the source story markdown file |
| `workspace` | path | No | Output folder for generated artefacts |

## Execution

### Step 1 — Read the story

Read the story file. Extract:
- Story ID
- Acceptance criteria (from the story's AC section)

### Step 2 — Generate PAT draft

Transform each acceptance criterion into a PAT entry following the schema:

```
story: <story-id>
version: 1

acceptance:
  - id: AC-001
    when: <user action or state>
    then: <expected outcome>
    steps:
      - navigate: <path>
      - assert: "[data-testid='<id>']" <check>
      ...
```

Rules for generation:
- `when`/`then` are plain English, topology-agnostic
- `steps` are ordered and deterministic, suitable for direct test translation
- All interactive elements use `data-testid` attributes for stable selectors
- Each AC gets a unique `id` within the story (AC-001, AC-002, etc.)
- No component names, no API paths, no technical details in `when`/`then`
- `steps` may reference technical details (URLs, selectors) as these are
  the concrete validation mechanism

### Step 2a — Detect PAT conflicts with existing stories

Before finalising the PAT draft, scan existing PAT files in the workspace
(or root repo `pats/` folder) for conflicts with the new story's ACs.

A conflict exists when:
- A new AC changes behaviour that an existing AC asserts (e.g. "renders
  Hello" → "renders Todo list")
- A new AC removes a feature that an existing AC validates
- A new AC changes the UI structure that existing ACs depend on (e.g.
  different data-testid attributes, different page layout)

For each conflict, add a `replaces` or `removes` declaration to the
new AC:

```
  - id: AC-001
    when: user opens the app
    then: todo list is displayed with item count
    replaces: TODOM-000/AC-001    # was: MFE renders Hello component
    steps:
      ...
```

- `replaces: <story-id>/AC-<id>` — the new AC supersedes the old one.
  The old AC's compiled test should be updated or replaced.
- `removes: <story-id>/AC-<id>` — the old AC is no longer valid and
  its compiled test should be deleted.

**This step is critical for test suite integrity.** Without it, old
compiled tests (CATs) will fail when new stories change behaviour,
causing CI failures that look like bugs but are actually stale tests.

### Step 3 — Present for review

Show the generated PAT to the user. Wait for confirmation or changes.

The PAT is a critical artefact — it drives everything downstream. The user
must review and approve before it's written.

### Step 4 — Write to workspace

On confirmation, write `<story-id>.pat.yaml` to the workspace folder.

## PAT.yaml schema

```
story: <story-id>
version: 1

acceptance:
  - id: <unique-id>
    when: <trigger condition>
    then: <expected outcome>
    steps:
      - navigate: <path>
      - click: "[data-testid='<id>']"
      - type: "[data-testid='<id>']" value "<text>"
      - assert: "[data-testid='<id>']" is visible
      - assert: "[data-testid='<id>']" contains "<value>"
      - assert: "[data-testid='<id>']" count > 0
      - wait: "[data-testid='<id>']" is visible
    replaces: <old-ac-id>          # optional
    removes: <old-ac-id>           # optional
```

## Notes

- Story-level PATs are topology-agnostic — pure user outcomes
- The PAT file is the input to `decompose-story`, not the story prose
- PATs live in the root repo under `pats/` in a real project; in the
  workshop they land in the workspace folder
- `replaces` and `removes` are used when stories modify existing behaviour
- The `version` field is the schema version (always 1 for now), not the
  story version
