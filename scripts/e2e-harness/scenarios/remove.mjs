// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// REMOVE scenario — exercises the structural REMOVE flow end-to-end:
// compile-story-pats (new CAT) + render-topology-artefacts (after-remove
// topology) + historical-cat-scan (delete existing pats/*.cy.js that
// probe the removed component).
//
// Replicates SKILL Step 2 of compile-story-pats outside the SKILL so
// the harness can drive it deterministically. The SKILL itself stays
// the authoritative description; if Step 2 grows new responsibilities,
// this scenario must absorb them or fall behind.
//
// Defaults remove `analytics` against the live workshop main (which
// must have an `analytics` leaf component seeded — the canonical
// removable target per the compile-story-pats SKILL examples). The
// after-remove project.yaml is computed dynamically (no static
// after-fixture to drift). The harness intentionally bypasses
// decompose-story's verifiability invariant (REMOVE rejected if the
// component has active callers) — the harness drives bundle assembly
// directly, so the chosen component just needs to be removable from
// the topology graph (no inbound depends_on).

import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { findReferencing } from '../../../.m/capabilities/_lib/historical-cat-scan.mjs';
import yaml from '../../../.m/vendor/js-yaml.mjs';
import { EXIT, die, fetchFile, listTree, ok, step } from '../gitlab.mjs';

export default {
  id: 'remove',
  description: 'TODOM-REMOVE (drop analytics) — compile + render + historical-CAT delete',

  defaults({ branchSuffix }) {
    const componentName = 'analytics';
    const storyId = `TODOM-REMOVE-${branchSuffix}`;
    return {
      componentName,
      storyId,
      branchName: `feat/REMOVE-${componentName}-${branchSuffix}`,
      commitMessage: `🏗️ REMOVE ${componentName} (e2e-harness ${branchSuffix})`,
      mrTitle: `REMOVE-e2e-${branchSuffix}: drop ${componentName}`,
    };
  },

  async prepare({ repoRoot, rootRepo, args, defaults }) {
    const { componentName, storyId } = defaults;
    step(2, `Prepare REMOVE bundle (drop ${componentName}) — base: workshop main`);

    const scratch = mkdtempSync(join(tmpdir(), 'e2e-remove-'));
    const cleanup = () => rmSync(scratch, { recursive: true, force: true });

    try {
      // 2a. Fetch live project.yaml from workshop main; drop the target
      // component; capture its port for the historical-CAT scan terms.
      // Working off the live state (not a static fixture) avoids drift
      // between fixture and real workshop topology.
      const liveProjectRaw = await fetchFile(rootRepo, 'main', 'project.yaml');
      if (!liveProjectRaw) {
        die(EXIT.PRECONDITION, `workshop ${rootRepo} has no project.yaml on main`);
      }
      const baseProject = yaml.load(liveProjectRaw);
      const port = portFor(baseProject, componentName);
      const afterProject = removeComponent(baseProject, componentName);
      const afterPath = join(scratch, 'project.yaml');
      writeFileSync(afterPath, yaml.dump(afterProject), 'utf8');
      ok(`computed after-remove project.yaml (dropped ${componentName}:${port})`);

      // 2b. Author the synthetic REMOVE story PAT (expect-unreachable
      // against the removed component's previous endpoint).
      const patPath = join(scratch, `${storyId}.pat.yaml`);
      writeFileSync(patPath, renderRemovePat({ storyId, componentName, port }), 'utf8');
      ok(`authored synthetic REMOVE PAT for ${storyId}`);

      // 2c. Compile the PAT into a CAT spec via compile-story-pats.
      const newCatPath = `pats/${storyId}.cy.js`;
      const newCatContent = runOrchestrator({
        bin: resolve(repoRoot, '.m/capabilities/compile-story-pats/compile.mjs'),
        argv: ['--pat', patPath, '--project-yaml', afterPath, '--target-dir', scratch],
        readBack: join(scratch, newCatPath),
        label: 'compile-story-pats',
      });
      ok(`compiled story PAT → ${newCatPath}`);

      // 2d. Render topology artefacts from the after-remove project.yaml.
      const renderOut = mkdtempSync(join(tmpdir(), 'e2e-remove-render-'));
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

      // 2e. Fetch existing pats/*.cy.js from workshop main; find specs
      // that reference the removed component (name OR port). Each match
      // becomes a {path, action: 'delete'} entry in the bundle so
      // cypress's pats/**/*.cy.js glob no longer runs them against the
      // smaller topology.
      const synthRoot = mkdtempSync(join(tmpdir(), 'e2e-remove-pats-'));
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
      const matches = findReferencing(synthRoot, [componentName, String(port)]);
      rmSync(synthRoot, { recursive: true, force: true });
      const deletes = matches.map(({ path }) => ({ path, action: 'delete' }));
      ok(`found ${deletes.length} historical CATs probing ${componentName} (or :${port})`);

      // 2f. Bundle: project.yaml + topology + new CAT + delete actions
      // for historical CATs probing the removed component.
      const files = [
        { path: 'project.yaml', content: readFileSync(afterPath, 'utf8') },
        ...topologyFiles,
        { path: newCatPath, content: newCatContent },
        ...deletes,
      ];
      ok(`bundle assembled: ${files.length} files total`);
      for (const f of files) {
        const tag = f.action === 'delete' ? '[DELETE] ' : '';
        console.log(`     - ${tag}${f.path}`);
      }

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

function removeComponent(project, name) {
  const cloned = JSON.parse(JSON.stringify(project));
  if (!Array.isArray(cloned.components)) {
    throw new Error('base project.yaml has no components[]');
  }
  const idx = cloned.components.findIndex((c) => c.name === name);
  if (idx === -1) {
    throw new Error(`base project.yaml has no component named '${name}'`);
  }
  cloned.components.splice(idx, 1);
  return cloned;
}

function portFor(project, name) {
  const comp = project.components.find((c) => c.name === name);
  if (!comp || comp.port == null) throw new Error(`component '${name}' has no port`);
  return String(comp.port);
}

function renderRemovePat({ storyId, componentName, port }) {
  return `story: ${storyId}
version: 1
head: ${componentName}

acceptance:
  - id: AC-001
    when: The removed component is no longer part of the topology
    then: A health probe to the removed endpoint fails to connect
    steps:
      - http: GET http://${componentName}:${port}/health
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
