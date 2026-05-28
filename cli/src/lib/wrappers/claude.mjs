import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * Generate Claude Code wrapper files:
 *   .claude/steering/m-steering.md
 *   .claude/skills/<name>/SKILL.md  (one per M capability)
 *
 * Only creates files that don't already exist — respects project ownership.
 *
 * Templates carry `{{M_ROOT}}` placeholders that resolve to the path
 * where M's canonical layer lives, relative to the agent. The default
 * `.m` is correct for project-scope installs (the canonical layer
 * sits at `<target>/.m/`). User-scope installs (M2.10) pass an
 * absolute path like `~/.m` so the wrappers point at the agent's
 * user-level M instead.
 */
export function generateClaudeWrappers(target, { mRoot = '.m' } = {}) {
  const created = [];
  const skipped = [];
  const templatesDir = join(import.meta.dirname, '..', '..', '..', 'templates', 'claude');

  const writeWrapper = (srcPath, destPath) => {
    if (existsSync(destPath)) return false;
    mkdirSync(join(destPath, '..'), { recursive: true });
    const content = readFileSync(srcPath, 'utf8').replaceAll('{{M_ROOT}}', mRoot);
    writeFileSync(destPath, content);
    return true;
  };

  // Steering wrapper (single file)
  const steeringSrc = join(templatesDir, 'steering', 'm-steering.md');
  const steeringDest = join(target, '.claude', 'steering', 'm-steering.md');
  const steeringLabel = '.claude/steering/m-steering.md';
  if (writeWrapper(steeringSrc, steeringDest)) created.push(steeringLabel);
  else skipped.push(steeringLabel);

  // Skill wrappers (one directory per capability)
  const skillsTemplateDir = join(templatesDir, 'skills');
  if (existsSync(skillsTemplateDir)) {
    for (const name of readdirSync(skillsTemplateDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;

      const src = join(skillsTemplateDir, name.name, 'SKILL.md');
      const dest = join(target, '.claude', 'skills', name.name, 'SKILL.md');
      const label = `.claude/skills/${name.name}/SKILL.md`;

      if (!existsSync(src)) continue;
      if (writeWrapper(src, dest)) created.push(label);
      else skipped.push(label);
    }
  }

  return { created, skipped };
}
