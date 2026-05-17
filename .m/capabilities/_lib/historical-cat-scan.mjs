// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// Static scan over compiled CAT specs (pats/*.cy.js) on the root repo.
//
// Two callers:
//   - REMOVE (compile-story-pats Step 2) needs to find specs that
//     probe the to-be-removed component so they can be deleted from
//     the gate MR bundle (otherwise cypress's pats/**/*.cy.js glob
//     keeps running them against the smaller topology).
//   - RENAME (compile-story-pats Step 2) needs to find specs that
//     reference the to-be-renamed component's old identifier so
//     they can be rewritten in place to use the new one.
//
// Both operations work off the same scan; they only differ in what
// they do with the matches. Inline grep was acceptable while REMOVE
// was the sole caller; with RENAME landing as a second caller, the
// scan moves into a shared utility (closes I-062). The utility never
// touches the SCM — it returns matches and rewrites; the caller
// pushes them via `scm.push_or_update_files` with the appropriate
// `action` (`delete` for REMOVE, default create-or-update for
// RENAME).
//
// Not every structural verb is a caller. TYPE-CHANGE
// (embedded <-> referenced) preserves the component's name and
// port, so no compiled CAT on the root repo needs deleting or
// rewriting — it invokes neither scan path.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PATS_DIR = 'pats';
const SPEC_EXT = '.cy.js';

/**
 * Find compiled `.cy.js` specs referencing any of the given terms.
 *
 * Used by REMOVE to identify historical CATs probing the removed
 * component (component name + each declared port).
 *
 * @param {string} rootRepoDir — absolute path to the root repo
 *   working directory (the repo where `pats/` lives).
 * @param {string[]} terms — substrings to match against spec
 *   content. A spec is a match if ANY term appears anywhere in it
 *   (logical OR).
 * @returns {Array<{path, content}>} matches, in lexicographic path
 *   order. Paths are relative to `rootRepoDir` (e.g.
 *   `pats/TODOM-S02.cy.js`).
 */
export function findReferencing(rootRepoDir, terms) {
  if (!Array.isArray(terms) || terms.length === 0) return [];
  return scanPats(rootRepoDir).filter(({ content }) =>
    terms.some((t) => content.includes(t)),
  );
}

/**
 * Find compiled `.cy.js` specs referencing `oldTerm` and return the
 * rewritten content with every occurrence replaced by `newTerm`.
 *
 * Used by RENAME to in-place rebadge historical CATs to reference
 * the new component name. Matching is a literal-string `includes`
 * + `replaceAll` — same shape as REMOVE's scan, intentionally
 * dumb. False positives (e.g. the old name appearing in a comment)
 * are rewritten too; this is acceptable because the rewrite leaves
 * the comment internally consistent with the post-RENAME topology.
 *
 * @param {string} rootRepoDir — see `findReferencing`.
 * @param {string} oldTerm — substring to locate (e.g. `metrics:3004`
 *   or just `metrics`).
 * @param {string} newTerm — replacement (e.g. `telemetry:3004` or
 *   `telemetry`).
 * @returns {Array<{path, content}>} rewritten specs whose content
 *   differs from the original (i.e. specs that actually contained
 *   `oldTerm`). Paths are relative to `rootRepoDir`. Specs that
 *   don't contain `oldTerm` are filtered out — the caller should
 *   push these as standard `update` actions.
 */
export function rewriteReferencing(rootRepoDir, oldTerm, newTerm) {
  if (!oldTerm || newTerm === undefined) return [];
  return scanPats(rootRepoDir)
    .filter(({ content }) => content.includes(oldTerm))
    .map(({ path, content }) => ({
      path,
      content: content.replaceAll(oldTerm, newTerm),
    }));
}

function scanPats(rootRepoDir) {
  const dir = join(rootRepoDir, PATS_DIR);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((name) => name.endsWith(SPEC_EXT))
    .sort()
    .map((name) => {
      const path = `${PATS_DIR}/${name}`;
      const content = readFileSync(join(rootRepoDir, path), 'utf8');
      return { path, content };
    });
}
