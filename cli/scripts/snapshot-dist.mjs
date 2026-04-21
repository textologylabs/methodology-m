#!/usr/bin/env node

/**
 * Snapshot the distributable .m/ files from the repo root into cli/dist-m/.
 * Run via `npm run snapshot` or automatically via `prepublishOnly`.
 */

import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, '..');
const repoRoot = join(cliDir, '..');
const distDir = join(cliDir, 'dist-m');

// Clean previous snapshot
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}

// Define what gets distributed
const entries = [
  { src: '.m/m.md', dest: 'm.md' },
  { src: '.m/capabilities', dest: 'capabilities', dir: true },
  { src: '.m/schemas', dest: 'schemas', dir: true },
  { src: '.m/providers/provider-interface.md', dest: 'providers/provider-interface.md' },
  { src: '.m/providers/scm', dest: 'providers/scm', dir: true },
  { src: '.m/providers/compose', dest: 'providers/compose', dir: true },
  { src: '.m/providers/ci', dest: 'providers/ci', dir: true },
  { src: '.m/providers/test', dest: 'providers/test', dir: true },
  { src: '.m/vendor', dest: 'vendor', dir: true },
  { src: 'CHANGELOG.md', dest: 'CHANGELOG.md' },
];

// Exclude test files and fixtures from the distributed package.
// These exist under .m/ for development, but user projects do not
// need them.
function excludeFromDist(src) {
  if (src.endsWith('.test.mjs')) return false;
  if (src.includes('/test-fixtures/') || src.endsWith('/test-fixtures')) return false;
  return true;
}

for (const entry of entries) {
  const src = join(repoRoot, entry.src);
  const dest = join(distDir, entry.dest);

  if (!existsSync(src)) {
    console.warn(`  ⚠ Skipping ${entry.src} (not found)`);
    continue;
  }

  mkdirSync(dirname(dest), { recursive: true });

  if (entry.dir) {
    cpSync(src, dest, { recursive: true, filter: excludeFromDist });
  } else {
    cpSync(src, dest);
  }

  console.log(`  ✓ ${entry.src} → dist-m/${entry.dest}`);
}

console.log('');
console.log('Snapshot complete.');
