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
// Defaults rename `analytics` → `analytics-renamed` against the live
// workshop main (which must have an `analytics` leaf component
// seeded — the canonical renamable target). The after-rename
// project.yaml is computed dynamically (no static after-fixture to
// drift).
//
// Verb-specific logic lives here; everything reusable (compile, render,
// historical-CAT fetch) is in ../scenario-lib.mjs.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rewriteReferencing } from '../../../.m/capabilities/_lib/historical-cat-scan.mjs';
import yaml from '../../../.m/vendor/js-yaml.mjs';
import { EXIT, die, fetchFile, ok, step } from '../gitlab.mjs';
import {
  compileStoryPat, portFor, renderTopology, withWorkshopPats,
} from '../scenario-lib.mjs';

export default {
  id: 'rename',
  description: 'TODOM-RENAME (analytics → analytics-renamed) — compile + render + historical-CAT rewrite',

  defaults({ branchSuffix }) {
    const oldName = 'analytics';
    const newName = 'analytics-renamed';
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

  async prepare({ repoRoot, rootRepo, defaults }) {
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
      const newCat = compileStoryPat({
        repoRoot, patPath, projectYamlPath: afterPath, scratch, storyId,
      });
      ok(`compiled story PAT → ${newCat.path}`);

      // 2d. Render topology artefacts from the after-rename project.yaml.
      const topologyFiles = renderTopology({ repoRoot, projectYamlPath: afterPath });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. Scan workshop main's pats/*.cy.js and rewrite the old
      // identifier (`<oldName>:<port>`) to the new one in place.
      const rewritten = await withWorkshopPats(rootRepo, (synthRoot, fetched) => {
        ok(`fetched ${fetched} existing pats/*.cy.js from workshop main`);
        const r = rewriteReferencing(synthRoot, oldTerm, newTerm);
        ok(`rewrote ${r.length} historical CATs (oldTerm=${oldTerm})`);
        return r;
      });

      // 2f. Bundle: project.yaml + topology + new CAT + rewritten existing pats.
      const files = [
        { path: 'project.yaml', content: readFileSync(afterPath, 'utf8') },
        ...topologyFiles,
        newCat,
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
// Verb-specific helpers
// ---------------------------------------------------------------------------

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
