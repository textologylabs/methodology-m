import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { copyDistM } from '../lib/copy.mjs';
import { readInstalledVersion, writeInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { diffTrees, formatDiff } from '../lib/diff-trees.mjs';

export async function update(args) {
  const target = resolve(args[0] || '.');
  const installed = readInstalledVersion(target);
  const available = readAvailableVersion();

  if (!installed) {
    console.error('M is not installed in this project. Run "m init" first.');
    process.exit(1);
  }

  if (installed === available) {
    console.log(`Already at v${installed}. Nothing to update.`);
    return;
  }

  const installedDir = join(target, '.m');
  const availableDir = join(import.meta.dirname, '..', '..', 'dist-m');

  // Show what will change
  console.log(`Updating Methodology M: v${installed} → v${available}`);
  console.log('');

  const result = diffTrees(installedDir, availableDir);
  console.log(formatDiff(result));
  console.log('');

  // Apply the update
  copyDistM(target);
  writeInstalledVersion(target, available);

  console.log(`Updated to v${available}.`);
  console.log('');
  console.log('Agent wrappers (.claude/, .kiro/) were NOT touched.');
  console.log('Review the changes above and update your agent wrappers if needed.');
}
