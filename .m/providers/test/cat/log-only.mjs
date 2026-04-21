// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * test/cat/log-only — trace stub for the `test.cat.*` namespace.
 *
 * Does no real compilation. Emits a single trace file that records
 * which provider was dispatched and what top-level PAT inputs it saw.
 * Used in tests and dry-run scenarios where the compile-story-pats
 * orchestrator's resolution + dispatch logic needs verifying without
 * exercising the full Cypress render path.
 *
 * Contract: see ./log-only.md. Function signature matches
 * test.cat.compile_story_pat from .m/providers/provider-interface.md.
 */

export const spec_extension = '.trace.txt';

export function compile_story_pat(pat) {
  const acIds = Array.isArray(pat?.acceptance)
    ? pat.acceptance.map((ac) => ac.id).join(',')
    : '';
  const content =
    `provider: test/cat/log-only\n` +
    `story: ${pat?.story ?? ''}\n` +
    `version: ${pat?.version ?? ''}\n` +
    `acceptance: ${acIds}\n`;

  return {
    path: `pats/${pat?.story ?? 'unknown'}${spec_extension}`,
    content,
    mode: 0o644,
  };
}
