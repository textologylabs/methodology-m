import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Walk a directory tree and return all file paths relative to root.
 */
function walk(dir, root = dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, root));
    } else {
      results.push(relative(root, full));
    }
  }
  return results.sort();
}

/**
 * Compare two directory trees and return a structured diff.
 * Returns { added: [], removed: [], changed: [], unchanged: [] }
 * Each entry in changed has { file, installedContent, availableContent }.
 */
export function diffTrees(installedDir, availableDir) {
  const installedFiles = new Set(walk(installedDir));
  const availableFiles = new Set(walk(availableDir));

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  // Files in available but not installed
  for (const file of availableFiles) {
    if (!installedFiles.has(file)) {
      added.push(file);
    }
  }

  // Files in installed but not available
  for (const file of installedFiles) {
    if (!availableFiles.has(file)) {
      removed.push(file);
    }
  }

  // Files in both — compare content
  for (const file of availableFiles) {
    if (!installedFiles.has(file)) continue;
    const a = readFileSync(join(installedDir, file), 'utf8');
    const b = readFileSync(join(availableDir, file), 'utf8');
    if (a === b) {
      unchanged.push(file);
    } else {
      changed.push(file);
    }
  }

  return { added, removed, changed, unchanged };
}

/**
 * Format a diff result as a human-readable string.
 */
export function formatDiff(result) {
  const lines = [];

  if (result.added.length) {
    lines.push('Added:');
    for (const f of result.added) lines.push(`  + ${f}`);
  }
  if (result.removed.length) {
    lines.push('Removed:');
    for (const f of result.removed) lines.push(`  - ${f}`);
  }
  if (result.changed.length) {
    lines.push('Changed:');
    for (const f of result.changed) lines.push(`  ~ ${f}`);
  }

  if (!lines.length) {
    lines.push('No differences.');
  } else {
    const total = result.added.length + result.removed.length + result.changed.length;
    lines.push('');
    lines.push(
      `${total} file(s) differ (${result.added.length} added, ${result.removed.length} removed, ${result.changed.length} changed, ${result.unchanged.length} unchanged)`
    );
  }

  return lines.join('\n');
}
