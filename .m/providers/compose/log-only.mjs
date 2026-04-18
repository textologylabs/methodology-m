// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * compose/log-only — trace stub for the `compose.*` namespace.
 *
 * Does no real rendering. Emits a single trace file that records which
 * provider was dispatched and what top-level inputs it saw. Used in tests
 * and dry-run scenarios where the orchestrator's resolution + dispatch
 * logic needs verifying without exercising the full docker-compose
 * render path.
 *
 * Contract: see ./log-only.md. Function signature matches
 * compose.render_topology from .m/providers/provider-interface.md.
 */

export function render_topology(project) {
  const componentNames = project.components.map((c) => c.name).join(',');
  const content =
    `provider: compose/log-only\n` +
    `project: ${project.project}\n` +
    `group: ${project.group}\n` +
    `components: ${componentNames}\n`;

  return [
    {
      path: '.m-trace/compose-log-only.txt',
      content,
      mode: 0o644,
    },
  ];
}
