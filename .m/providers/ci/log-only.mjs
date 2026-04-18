// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * ci/log-only — trace stub for the `ci.*` namespace.
 *
 * Does no real rendering. Emits a single trace file that records which
 * provider was dispatched, which scm provider it was paired with, and
 * what top-level inputs it saw. Used in tests and dry-run scenarios
 * where the orchestrator's resolution + dispatch logic needs verifying
 * without exercising the full pipeline render path.
 *
 * Contract: see ./log-only.md. Function signature matches
 * ci.render_pipeline from .m/providers/provider-interface.md.
 */

export function render_pipeline(project, scm) {
  const componentNames = project.components.map((c) => c.name).join(',');
  const content =
    `provider: ci/log-only\n` +
    `scm: ${scm}\n` +
    `project: ${project.project}\n` +
    `group: ${project.group}\n` +
    `components: ${componentNames}\n`;

  return [
    {
      path: '.m-trace/ci-log-only.txt',
      content,
      mode: 0o644,
    },
  ];
}
