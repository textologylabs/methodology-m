# Releasing Methodology M

The sequence to ship a new `vX.Y.Z` of `methodology-m`.

## Source of truth

- **Version:** `cli/package.json` `version` field. The git tag must
  match exactly (`vX.Y.Z` ↔ `"X.Y.Z"`).
- **Notes:** `CHANGELOG.md` at the repo root. The `[Unreleased]`
  section is empty between releases; the implementation PR fills in
  a new `## [X.Y.Z] — YYYY-MM-DD` section above it.
- **Distribution:** `cli/scripts/snapshot-dist.mjs` runs as
  `prepublishOnly` and copies `.m/` + `CHANGELOG.md` into
  `cli/dist-m/`. The npm package ships `bin/`, `src/`, `dist-m/`,
  `templates/`.

## Sequence

### 1. Implementation PR

Lands the work itself. Should also:

- Add the `## [X.Y.Z] — YYYY-MM-DD` section to `CHANGELOG.md`.
- Bump `cli/package.json` `version` to `X.Y.Z`.
- Mark the row in `docs/roadmap.md` shipped.
- Flip the relevant `I-NNN` entry in
  `docs/improvements-and-ideas.md` to Resolved + add the row to
  the Resolved table.

If the PR ships "evidence only" (no new code, like v0.12.0) the bump
is still required. The tag must land on a commit whose
`cli/package.json` version matches.

### 2. Bump follow-up PR (only if step 1 missed the bump)

```
git checkout -b chore/bump-cli-vX.Y.Z
# edit cli/package.json
git add cli/package.json
git commit -m "🔧 vX.Y.Z: bump cli/package.json"
git push -u origin chore/bump-cli-vX.Y.Z
gh pr create --title "🔧 vX.Y.Z: bump cli/package.json to X.Y.Z" --body "..."
```

### 3. Tag

After main has both the implementation and the bump:

```
git checkout main && git pull
git tag -a vX.Y.Z -m "vX.Y.Z — <one-line summary>

<paragraph: scope, evidence link, deferred items>"
git push origin vX.Y.Z
```

The tag is annotated (`-a`), not lightweight. The message body
mirrors the GitHub Release notes intro.

### 4. GitHub Release

```
gh release create vX.Y.Z --title "vX.Y.Z — <I-NNN topic>" --notes "..."
```

Notes format: lead with the I-NNN headline, then `### L4 evidence`
and `### L5 evidence` subsections (if applicable), then `### PRs`
listing the implementation + bump PR numbers. Mirror the v0.12.0
release as the template.

### 5. npm publish (manual — Captain handles 2FA)

```
cd cli
npm publish
```

`prepublishOnly` rebuilds `dist-m/` from the live `.m/` tree before
upload, so a fresh snapshot ships every time.

Post-publish sanity check:

```
npm view methodology-m version    # should print X.Y.Z
```

### 6. Workshop gate MR (if the release shipped a structural story)

Releases that ride on workshop evidence (e.g. v0.12.0 → TODOM-S02)
leave an open gate MR on `methodology-m/todo-m-workshop/todo-m-root`.
Squash-merge it with a clean message after the release tag is up.

## Common pitfalls

- **Forgetting the bump.** v0.12.0 (#19) shipped without a bump
  because the PR was framed as "no new code." Caught manually in
  step 2; #20 fixed it. To prevent recurrence: include the bump
  in every implementation PR by default, even doc-only ones tagged
  to a release.
- **Tag/version mismatch.** If the tag points at a commit whose
  `cli/package.json` is still the previous version, `npm publish`
  publishes the wrong number. Always verify with
  `git show vX.Y.Z:cli/package.json | grep version` before
  publishing.
- **`CHANGELOG.md` not in `dist-m/`.** snapshot-dist explicitly
  copies it; if you edit `entries[]` in `snapshot-dist.mjs`, do
  not drop the `CHANGELOG.md` row.
- **2FA blocking automation.** npm publish requires Captain's OTP;
  do not try to script around it.
