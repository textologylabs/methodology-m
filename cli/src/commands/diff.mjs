import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { diffTrees, formatDiff } from '../lib/diff-trees.mjs';
import { resolveScope } from '../lib/scope.mjs';

export async function diff(args) {
  const { target, userScope } = resolveScope(args);
  const installed = readInstalledVersion(target);
  const available = readAvailableVersion();

  if (!installed) {
    const hint = userScope ? '"m init --user"' : '"m init"';
    console.error(`M is not installed at this scope. Run ${hint} first.`);
    process.exit(1);
  }

  const installedDir = join(target, '.m');
  const availableDir = join(import.meta.dirname, '..', '..', 'dist-m');

  if (!existsSync(availableDir)) {
    console.error('dist-m/ not found. Reinstall the CLI package.');
    process.exit(1);
  }

  console.log(`Comparing installed v${installed} against available v${available}`);
  console.log('');

  const result = diffTrees(installedDir, availableDir);
  console.log(formatDiff(result));
}
