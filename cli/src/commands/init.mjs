import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { copyDistM } from '../lib/copy.mjs';
import { readInstalledVersion, writeInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { detectAgents } from '../lib/detect-agent.mjs';
import { generateClaudeWrappers } from '../lib/wrappers/claude.mjs';

export async function init(args) {
  const target = resolve(args[0] || '.');
  const version = readAvailableVersion();
  const installed = readInstalledVersion(target);

  if (installed) {
    console.log(`M v${installed} is already installed. Use "m update" to upgrade.`);
    return;
  }

  console.log(`Installing Methodology M v${version} into ${target}`);
  console.log('');

  // 1. Copy .m/ directory
  const destDir = copyDistM(target);
  console.log(`  ✓ .m/ directory created`);

  // 2. Write version file
  writeInstalledVersion(target, version);
  console.log(`  ✓ .m-version written (v${version})`);

  // 3. Detect agent runtimes and generate wrappers
  const agents = detectAgents(target);

  if (agents.includes('claude')) {
    const { created, skipped } = generateClaudeWrappers(target);
    for (const f of created) console.log(`  ✓ ${f} created`);
    for (const f of skipped) console.log(`  · ${f} already exists (skipped)`);
  }

  if (!agents.length) {
    console.log('  · No agent runtime detected (.claude/ or .kiro/)');
    console.log('    Create .claude/ or .kiro/ first, then re-run "m init" to generate wrappers.');
  }

  // 4. Summary
  console.log('');
  console.log(`Methodology M v${version} installed.`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Tell your AI agent: "Read .m/m.md and bootstrap this project"');
  console.log('  2. The agent will discover capabilities and guide you through setup');
  console.log('  3. Run "m version" to check your installed version');
}
