// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// Shared helpers for e2e-harness scenarios.
//
// The structural-verb scenarios (add, remove, rename, and the
// MERGE/SPLIT/PORT-CHANGE siblings to come) all replicate
// compile-story-pats SKILL Step 2: mutate the topology, compile a
// story PAT, render topology artefacts, scan historical CATs.
// Everything that is NOT verb-specific lives here, so a new scenario
// is just its topology mutation + PAT authoring + the choice of scan.
//
// This file sits alongside gitlab.mjs (not under scenarios/) on
// purpose — the harness loads every *.mjs in scenarios/ as a scenario,
// so shared code must live outside that directory.

import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { EXIT, die, fetchFile, listTree } from './gitlab.mjs';

// Run an M capability orchestrator (compile.mjs, render.mjs) as a
// subprocess. Dies with EXIT.PREPARE on a non-zero exit. When
// `readBack` is given, returns that file's content; otherwise null.
export function runOrchestrator({ bin, argv, readBack, label }) {
  const res = spawnSync('node', [bin, ...argv], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    die(EXIT.PREPARE, `${label} exited with code ${res.status}`);
  }
  if (readBack) return readFileSync(readBack, 'utf8');
  return null;
}

// Resolve a component's port from a parsed project.yaml. Throws if the
// component is absent or has no port.
export function portFor(project, name) {
  const comp = project.components?.find((c) => c.name === name);
  if (!comp || comp.port == null) throw new Error(`component '${name}' has no port`);
  return String(comp.port);
}

// Recursively collect { path, fullPath } for every file under `root`.
// `path` is relative to `root`.
export function collectFiles(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectFiles(full, rel));
    else if (entry.isFile()) out.push({ path: rel, fullPath: full });
  }
  return out;
}

// Compile a story PAT into a CAT spec via compile-story-pats. Returns
// { path, content } — path is the conventional pats/<storyId>.cy.js.
// `scratch` is the caller's scratch dir; the compiled spec lands there.
export function compileStoryPat({ repoRoot, patPath, projectYamlPath, scratch, storyId }) {
  const path = `pats/${storyId}.cy.js`;
  const content = runOrchestrator({
    bin: resolve(repoRoot, '.m/capabilities/compile-story-pats/compile.mjs'),
    argv: ['--pat', patPath, '--project-yaml', projectYamlPath, '--target-dir', scratch],
    readBack: join(scratch, path),
    label: 'compile-story-pats',
  });
  return { path, content };
}

// Render topology artefacts from a project.yaml. Owns its temp dir —
// created, read into memory, and removed in a finally, so a throw
// mid-render cannot leak it. Returns [{ path, content }, ...].
export function renderTopology({ repoRoot, projectYamlPath }) {
  const renderOut = mkdtempSync(join(tmpdir(), 'e2e-render-'));
  try {
    runOrchestrator({
      bin: resolve(repoRoot, '.m/capabilities/render-topology-artefacts/render.mjs'),
      argv: ['--project-yaml', projectYamlPath, '--target-dir', renderOut],
      label: 'render-topology-artefacts',
    });
    return collectFiles(renderOut).map((f) => ({
      path: f.path,
      content: readFileSync(f.fullPath, 'utf8'),
    }));
  } finally {
    rmSync(renderOut, { recursive: true, force: true });
  }
}

// Fetch workshop main's pats/*.cy.js into a temp dir, hand the temp
// root to `fn`, then clean up — whatever `fn` returns is passed
// through. The temp dir is removed in a finally even if `fn` throws.
// `fn` receives (synthRoot, fetchedCount). This is the shared base for
// both REMOVE's findReferencing scan and RENAME's rewriteReferencing
// scan — the only difference between the two is what `fn` does.
export async function withWorkshopPats(rootRepo, fn) {
  const synthRoot = mkdtempSync(join(tmpdir(), 'e2e-pats-'));
  mkdirSync(join(synthRoot, 'pats'), { recursive: true });
  try {
    const tree = await listTree(rootRepo, 'main', 'pats');
    let fetched = 0;
    for (const e of tree) {
      if (e.type !== 'blob' || !e.name.endsWith('.cy.js')) continue;
      const content = await fetchFile(rootRepo, 'main', e.path);
      if (content == null) continue;
      writeFileSync(join(synthRoot, e.path), content, 'utf8');
      fetched += 1;
    }
    return await fn(synthRoot, fetched);
  } finally {
    rmSync(synthRoot, { recursive: true, force: true });
  }
}
