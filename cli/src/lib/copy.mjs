import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Copy the dist-m/ snapshot into the target project's .m/ directory.
 * Overwrites existing files. Creates directories as needed.
 */
export function copyDistM(target) {
  const distDir = join(import.meta.dirname, '..', '..', 'dist-m');
  const destDir = join(target, '.m');

  if (!existsSync(distDir)) {
    throw new Error(
      'dist-m/ not found. Run "npm run snapshot" first, or install from npm.'
    );
  }

  cpSync(distDir, destDir, { recursive: true, force: true });
  return destDir;
}
