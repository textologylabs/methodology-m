import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generate Claude Code wrapper files:
 *   .claude/steering/m-steering.md
 *   .claude/skills/<name>/SKILL.md  (one per M capability)
 *
 * Only creates files that don't already exist — respects project ownership.
 */
export function generateClaudeWrappers(target) {
  const created = [];
  const skipped = [];
  const templatesDir = join(import.meta.dirname, '..', '..', '..', 'templates', 'claude');

  // Steering wrapper (single file)
  const steeringPair = {
    src: join(templatesDir, 'steering', 'm-steering.md'),
    dest: join(target, '.claude', 'steering', 'm-steering.md'),
    label: '.claude/steering/m-steering.md',
  };

  if (existsSync(steeringPair.dest)) {
    skipped.push(steeringPair.label);
  } else {
    mkdirSync(join(steeringPair.dest, '..'), { recursive: true });
    cpSync(steeringPair.src, steeringPair.dest);
    created.push(steeringPair.label);
  }

  // Skill wrappers (one directory per capability)
  const skillsTemplateDir = join(templatesDir, 'skills');
  if (existsSync(skillsTemplateDir)) {
    for (const name of readdirSync(skillsTemplateDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;

      const src = join(skillsTemplateDir, name.name, 'SKILL.md');
      const dest = join(target, '.claude', 'skills', name.name, 'SKILL.md');
      const label = `.claude/skills/${name.name}/SKILL.md`;

      if (!existsSync(src)) continue;

      if (existsSync(dest)) {
        skipped.push(label);
      } else {
        mkdirSync(join(dest, '..'), { recursive: true });
        cpSync(src, dest);
        created.push(label);
      }
    }
  }

  return { created, skipped };
}
