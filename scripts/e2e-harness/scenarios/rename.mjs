// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// RENAME scenario — exercises the structural RENAME flow end-to-end:
// compile-story-pats (new CAT) + render-topology-artefacts (after-rename
// topology) + historical-cat-scan (rewrite existing pats/*.cy.js).
//
// Replicates SKILL Step 2 of compile-story-pats outside the SKILL so the
// harness can drive it deterministically. The SKILL itself stays the
// authoritative description; if Step 2 grows new responsibilities, this
// scenario must absorb them or fall behind.
//
// Defaults rename `analytics` → `telemetry` against the TODOM-S01
// fixture, but the after-rename project.yaml is computed dynamically
// (no static after-fixture to drift). The workshop is assumed to be at
// or downstream of TODOM-S01 (analytics:3004 reachable on main).

import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { rewriteReferencing } from '../../../.m/capabilities/_lib/historical-cat-scan.mjs';
import yaml from '../../../.m/vendor/js-yaml.mjs';
import { EXIT, die, fetchFile, listTree, ok, step } from '../gitlab.mjs';

export default {
  id: 'rename',
  description: 'TODOM-RENAME (analytics → telemetry) — compile + render + historical-CAT rewrite',

  defaults({ branchSuffix }) {
    const oldName = 'api-write';
    const newName = 'api-write-renamed';
    const storyId = `TODOM-RENAME-${branchSuffix}`;
    return {
      oldName,
      newName,
      storyId,
      branchName: `feat/RENAME-${oldName}-to-${newName}-${branchSuffix}`,
      commitMessage: `🏗️ RENAME ${oldName} → ${newName} (e2e-harness ${branchSuffix})`,
      mrTitle: `RENAME-e2e-${branchSuffix}: ${oldName} → ${newName}`,
    };
  },

  async prepare({ repoRoot, rootRepo, args, defaults }) {
    const { oldName, newName, storyId } = defaults;
    step(2, `Prepare RENAME bundle (${oldName} → ${newName}) — base: workshop main`);

    const scratch = mkdtempSync(join(tmpdir(), 'e2e-rename-'));
    const cleanup = () => rmSync(scratch, { recursive: true, force: true });

    try {
      // 2a. Fetch live project.yaml from workshop main; rename the
      // target component; compute oldTerm/newTerm for the historical
      // CAT scan. Working off the live state (not a static fixture)
      // avoids drift between fixture and real workshop topology.
      const liveProjectRaw = await fetchFile(rootRepo, 'main', 'project.yaml');
      if (!liveProjectRaw) {
        die(EXIT.PRECONDITION, `workshop ${rootRepo} has no project.yaml on main`);
      }
      const baseProject = yaml.load(liveProjectRaw);
      const afterProject = renameComponent(baseProject, oldName, newName);
      const port = portFor(afterProject, newName);
      const oldTerm = `${oldName}:${port}`;
      const newTerm = `${newName}:${port}`;
      const afterPath = join(scratch, 'project.yaml');
      writeFileSync(afterPath, yaml.dump(afterProject), 'utf8');
      ok(`computed after-rename project.yaml (${oldTerm} → ${newTerm})`);

      // 2b. Author the synthetic RENAME story PAT.
      const patPath = join(scratch, `${storyId}.pat.yaml`);
      writeFileSync(patPath, renderRenamePat({ storyId, oldName, newName, port }), 'utf8');
      ok(`authored synthetic RENAME PAT for ${storyId}`);

      // 2c. Compile the PAT into a CAT spec via compile-story-pats.
      const newCatPath = `pats/${storyId}.cy.js`;
      const newCatContent = runOrchestrator({
        bin: resolve(repoRoot, '.m/capabilities/compile-story-pats/compile.mjs'),
        argv: ['--pat', patPath, '--project-yaml', afterPath, '--target-dir', scratch],
        readBack: join(scratch, newCatPath),
        label: 'compile-story-pats',
      });
      ok(`compiled story PAT → ${newCatPath}`);

      // 2d. Render topology artefacts from the after-rename project.yaml.
      const renderOut = mkdtempSync(join(tmpdir(), 'e2e-rename-render-'));
      runOrchestrator({
        bin: resolve(repoRoot, '.m/capabilities/render-topology-artefacts/render.mjs'),
        argv: ['--project-yaml', afterPath, '--target-dir', renderOut],
        label: 'render-topology-artefacts',
      });
      const topologyFiles = collectFiles(renderOut).map((f) => ({
        path: f.path,
        content: readFileSync(f.fullPath, 'utf8'),
      }));
      rmSync(renderOut, { recursive: true, force: true });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. Fetch existing pats/*.cy.js from workshop main; rewrite oldTerm → newTerm.
      const synthRoot = mkdtempSync(join(tmpdir(), 'e2e-rename-pats-'));
      mkdirSync(join(synthRoot, 'pats'), { recursive: true });
      const tree = await listTree(rootRepo, 'main', 'pats');
      let fetched = 0;
      for (const e of tree) {
        if (e.type !== 'blob' || !e.name.endsWith('.cy.js')) continue;
        const content = await fetchFile(rootRepo, 'main', e.path);
        if (content == null) continue;
        writeFileSync(join(synthRoot, e.path), content, 'utf8');
        fetched += 1;
      }
      ok(`fetched ${fetched} existing pats/*.cy.js from workshop main`);
      const rewritten = rewriteReferencing(synthRoot, oldTerm, newTerm);
      rmSync(synthRoot, { recursive: true, force: true });
      ok(`rewrote ${rewritten.length} historical CATs (oldTerm=${oldTerm})`);

      // 2f. Bundle: project.yaml + topology + new CAT + rewritten existing pats.
      const files = [
        { path: 'project.yaml', content: readFileSync(afterPath, 'utf8') },
        ...topologyFiles,
        { path: newCatPath, content: newCatContent },
        ...rewritten,
      ];
      ok(`bundle assembled: ${files.length} files total`);
      for (const f of files) console.log(`     - ${f.path}`);

      return { files, cleanup };
    } catch (e) {
      cleanup();
      throw e;
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runOrchestrator({ bin, argv, readBack, label }) {
  const res = spawnSync('node', [bin, ...argv], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    die(EXIT.PREPARE, `${label} exited with code ${res.status}`);
  }
  if (readBack) return readFileSync(readBack, 'utf8');
  return null;
}

function renameComponent(project, oldName, newName) {
  const cloned = JSON.parse(JSON.stringify(project));
  if (!Array.isArray(cloned.components)) {
    throw new Error('base project.yaml has no components[]');
  }
  const comp = cloned.components.find((c) => c.name === oldName);
  if (!comp) {
    throw new Error(`base project.yaml has no component named '${oldName}'`);
  }
  comp.name = newName;
  return cloned;
}

function portFor(project, name) {
  const comp = project.components.find((c) => c.name === name);
  if (!comp || comp.port == null) throw new Error(`component '${name}' has no port`);
  return String(comp.port);
}

function renderRenamePat({ storyId, oldName, newName, port }) {
  return `story: ${storyId}
version: 1
head: ${newName}

acceptance:
  - id: AC-001
    when: The renamed component is reachable under the new name
    then: A health probe to the new name returns 200
    steps:
      - http: GET http://${newName}:${port}/health
      - expect-status: 200

  - id: AC-002
    when: The old component name no longer routes
    then: A health probe to the old name fails to connect
    steps:
      - http: GET http://${oldName}:${port}/health
      - expect-unreachable: true
`;
}

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
