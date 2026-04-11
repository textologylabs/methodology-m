import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { readInstalledVersion, readAvailableVersion } from '../lib/version-file.mjs';

export async function version(args) {
  const target = resolve(args[0] || '.');
  const bundled = readAvailableVersion();
  const installed = readInstalledVersion(target);
  const latest = checkRegistry();

  console.log(`Bundled:   v${bundled} (shipped with this CLI)`);

  if (installed) {
    console.log(`Installed: v${installed}`);
  } else {
    console.log('Installed: not installed (run "m init")');
  }

  if (latest) {
    console.log(`Latest:    v${latest} (npm registry)`);
    if (installed && installed !== latest) {
      console.log('');
      console.log(`Update available: v${installed} → v${latest}`);
      console.log('Run "npm i -g methodology-m@latest" then "m update"');
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
