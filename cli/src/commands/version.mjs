import { execSync } from 'node:child_process';
import { readInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';
import { resolveScope } from '../lib/scope.mjs';

export async function version(args) {
  const { target, userScope } = resolveScope(args);
  const bundled = readAvailableVersion();
  const installed = readInstalledVersion(target);
  const latest = checkRegistry();

  console.log(`Bundled:   v${bundled} (shipped with this CLI)`);

  const scopeLabel = userScope ? ' (user scope)' : '';
  if (installed) {
    console.log(`Installed: v${installed}${scopeLabel}`);
  } else {
    const hint = userScope ? '"m init --user"' : '"m init"';
    console.log(`Installed: not installed (run ${hint})`);
  }

  if (latest) {
    console.log(`Latest:    v${latest} (npm registry)`);
    if (installed && installed !== latest) {
      console.log('');
      console.log(`Update available: v${installed} → v${latest}`);
      const cmd = userScope ? '"m update --user"' : '"m update"';
      console.log(`Run "npm i -g methodology-m@latest" then ${cmd}`);
    }
  } else {
    console.log('Latest:    (not published yet / offline)');
  }
}

/** Check npm registry for the latest published version. Fails silently. */
function checkRegistry() {
  try {
    return execSync('npm view methodology-m version 2>/dev/null', {
      stdio: 'pipe',
      timeout: 5000,
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}
