import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect which AI agent runtimes are present in the target directory.
 * Returns an array of detected runtime names.
 */
export function detectAgents(target) {
  const agents = [];

  // Claude Code — .claude/ directory or CLAUDE.md
  if (
    existsSync(join(target, '.claude')) ||
    existsSync(join(target, 'CLAUDE.md'))
  ) {
    agents.push('claude');
  }

  // Kiro — .kiro/ directory
  if (existsSync(join(target, '.kiro'))) {
    agents.push('kiro');
  }

  return agents;
}
