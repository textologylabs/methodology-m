// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// ADD scenario — TODOM-S01 greenfield component addition.
//
// Drives `.m/capabilities/render-topology-artefacts/render.mjs` against
// the TODOM-S01 fixture (analytics backend), pushes the rendered file
// set as a fresh MR off main, and asserts pipeline green. Mirrors the
// pre-refactor v0.5.1 harness behaviour exactly.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { EXIT, die, ok, step } from '../gitlab.mjs';

export default {
  id: 'add',
  description: 'TODOM-S01 greenfield ADD via render-topology-artefacts',

  defaults({ repoRoot, branchSuffix }) {
    return {
      fixture: resolve(repoRoot, '.m/test-fixtures/todo-m-s01.yaml'),
      branchName: `feat/TODOM-S01-${branchSuffix}`,
      commitMessage: `🏗️ TODOM-S01: add analytics backend (e2e-harness ${branchSuffix})`,
      mrTitle: `TODOM-S01-e2e-${branchSuffix}: Add analytics backend`,
    };
  },

  // Returns { files: [{path, content}], cleanup() }.
  prepare({ repoRoot, args }) {
    step(2, 'Render topology artefacts');

    const renderer = resolve(repoRoot, '.m/capabilities/render-topology-artefacts/render.mjs');
    const outDir = mkdtempSync(join(tmpdir(), 'e2e-render-'));

    const res = spawnSync(
      'node',
      [renderer, '--project-yaml', args.fixture, '--target-dir', outDir],
      { encoding: 'utf8' },
    );
    if (res.status !== 0) {
      console.error(res.stderr || res.stdout);
      rmSync(outDir, { recursive: true, force: true });
      die(EXIT.PREPARE, `orchestrator exited with code ${res.status}`);
    }

    const files = collectFiles(outDir).map((f) => ({
      path: f.path,
      content: readFileSync(f.fullPath, 'utf8'),
    }));
    ok(`rendered ${files.length} files into ${outDir}`);
    for (const f of files) console.log(`     - ${f.path}`);

    return {
      files,
      cleanup: () => rmSync(outDir, { recursive: true, force: true }),
    };
  },
};

function collectFiles(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, rel));
    } else if (entry.isFile()) {
      out.push({ path: rel, fullPath: full });
    }
  }
  return out;
}
