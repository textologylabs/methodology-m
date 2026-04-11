import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * m changelog [version]
 * Print the bundled changelog, optionally filtered to a specific version.
 */
export async function changelog(args) {
  const targetVersion = args[0];
  const changelogPath = join(import.meta.dirname, '..', '..', 'dist-m', 'CHANGELOG.md');

  if (!existsSync(changelogPath)) {
    console.error('Changelog not found. Reinstall the CLI package.');
    process.exit(1);
  }

  const content = readFileSync(changelogPath, 'utf8');

  if (!targetVersion) {
    console.log(content);
    return;
  }

  // Extract the section for a specific version
  const section = extractVersion(content, targetVersion);
  if (section) {
    console.log(section);
  } else {
    console.error(`Version ${targetVersion} not found in changelog.`);
    process.exit(1);
  }
}

/**
 * Extract a single version's section from a markdown changelog.
 * Looks for ## [version] or ## version headings.
 */
function extractVersion(content, version) {
  const lines = content.split('\n');
  const normalized = version.replace(/^v/, '');
  let capturing = false;
  const result = [];

  for (const line of lines) {
    // Match ## [0.3.0], ## [v0.3.0], ## 0.3.0, etc.
    if (line.match(/^## /)) {
      if (capturing) break; // Hit the next version heading — stop
      if (line.includes(normalized)) {
        capturing = true;
      }
    }
    if (capturing) {
      result.push(line);
    }
  }

  return result.length ? result.join('\n').trim() : null;
}
