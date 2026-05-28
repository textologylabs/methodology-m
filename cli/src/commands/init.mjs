import { copyDistM } from '../lib/copy.mjs';
import { readInstalledVersion, writeInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { detectAgents } from '../lib/detect-agent.mjs';
import { generateClaudeWrappers } from '../lib/wrappers/claude.mjs';
import { resolveScope } from '../lib/scope.mjs';

export async function init(args) {
  const { target, mRoot, userScope } = resolveScope(args);
  const version = readAvailableVersion();
  const installed = readInstalledVersion(target);

  if (installed) {
    console.log(`M v${installed} is already installed. Use "m update" to upgrade.`);
    return;
  }

  const scopeLabel = userScope ? 'user scope' : target;
  console.log(`Installing Methodology M v${version} into ${scopeLabel}`);
  console.log('');

  // 1. Copy .m/ directory
  copyDistM(target);
  console.log(`  ✓ .m/ directory created`);

  // 2. Write version file
  writeInstalledVersion(target, version);
  console.log(`  ✓ .m-version written (v${version})`);

  // 3. Detect agent runtimes and generate wrappers
  const agents = detectAgents(target);

  if (agents.includes('claude')) {
    const { created, skipped } = generateClaudeWrappers(target, { mRoot });
    for (const f of created) console.log(`  ✓ ${f} created`);
    for (const f of skipped) console.log(`  · ${f} already exists (skipped)`);
  }

  if (!agents.length) {
    const hint = userScope
      ? 'Create ~/.claude/ first, then re-run "m init --user" to generate wrappers.'
      : 'Create .claude/ or .kiro/ first, then re-run "m init" to generate wrappers.';
    console.log('  · No agent runtime detected (.claude/ or .kiro/)');
    console.log(`    ${hint}`);
  }

  // 4. Summary
  console.log('');
  console.log(`Methodology M v${version} installed.`);
  console.log('');
  if (userScope) {
    console.log('Next steps:');
    console.log('  1. M is now available to any project as a user-scope fallback');
    console.log('  2. Run "m init" inside a project to pin M into that repo');
    console.log('  3. Run "m version --user" to check the user-scope install');
  } else {
    console.log('Next steps:');
    console.log('  1. Tell your AI agent: "Read .m/m.md and bootstrap this project"');
    console.log('  2. The agent will discover capabilities and guide you through setup');
    console.log('  3. Run "m version" to check your installed version');
  }
}
