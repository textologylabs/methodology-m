import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const VERSION_FILE = '.m-version';

/** Read the installed M version from .m-version in the target dir. */
export function readInstalledVersion(target) {
  const file = join(target, VERSION_FILE);
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8').trim();
}

/** Write the M version to .m-version in the target dir. */
export function writeInstalledVersion(target, version) {
  const file = join(target, VERSION_FILE);
  writeFileSync(file, version + '\n', 'utf8');
}

/** Read the available (bundled) M version from the CLI's package.json. */
export function readAvailableVersion() {
  const require = createRequire(import.meta.url);
  const pkg = require('../../package.json');
  return pkg.version;
}
