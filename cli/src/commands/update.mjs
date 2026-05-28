import { join } from 'node:path';
import { copyDistM } from '../lib/copy.mjs';
import { readInstalledVersion, writeInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { diffTrees, formatDiff } from '../lib/diff-trees.mjs';
import { generateClaudeWrappers } from '../lib/wrappers/claude.mjs';
import { detectAgents } from '../lib/detect-agent.mjs';
import { resolveScope } from '../lib/scope.mjs';

export async function update(args) {
  const { target, mRoot, rest, userScope } = resolveScope(args);
  const refreshWrappers = rest.includes('--refresh-wrappers');
  const installed = readInstalledVersion(target);
  const available = readAvailableVersion();

  if (!installed) {
    const hint = userScope ? '"m init --user"' : '"m init"';
    console.error(`M is not installed at this scope. Run ${hint} first.`);
    process.exit(1);
  }

  // Allow --refresh-wrappers to run even when versions match
  if (installed === available && !refreshWrappers) {
    console.log(`Already at v${installed}. Nothing to update.`);
    return;
  }

  const installedDir = join(target, '.m');
  const availableDir = join(import.meta.dirname, '..', '..', 'dist-m');

  if (installed !== available) {
    console.log(`Updating Methodology M: v${installed} → v${available}`);
    console.log('');

    const result = diffTrees(installedDir, availableDir);
    console.log(formatDiff(result));
    console.log('');

    copyDistM(target);
    writeInstalledVersion(target, available);

    console.log(`Updated to v${available}.`);
    console.log('');
    console.log('Agent wrappers (.claude/, .kiro/) were NOT touched.');
    console.log('Review the changes above and update your agent wrappers if needed.');
  }

  if (refreshWrappers) {
    const agents = detectAgents(target);
    if (agents.includes('claude')) {
      console.log('');
      console.log('Refreshing missing Claude wrappers...');
      const { created, skipped } = generateClaudeWrappers(target, { mRoot });
      for (const f of created) console.log(`  ✓ ${f} created`);
      for (const f of skipped) console.log(`  · ${f} already exists (skipped)`);
    } else {
      console.log('');
      console.log('· No agent runtime detected — nothing to refresh.');
    }
  }
}
