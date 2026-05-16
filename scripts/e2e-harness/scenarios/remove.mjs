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
//
// Verb-specific logic lives here; everything reusable (compile, render,
// historical-CAT fetch) is in ../scenario-lib.mjs.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { findReferencing } from '../../../.m/capabilities/_lib/historical-cat-scan.mjs';
import yaml from '../../../.m/vendor/js-yaml.mjs';
import { EXIT, die, fetchFile, ok, step } from '../gitlab.mjs';
import {
  compileStoryPat, portFor, renderTopology, withWorkshopPats,
} from '../scenario-lib.mjs';

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

  async prepare({ repoRoot, rootRepo, defaults }) {
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
      const newCat = compileStoryPat({
        repoRoot, patPath, projectYamlPath: afterPath, scratch, storyId,
      });
      ok(`compiled story PAT → ${newCat.path}`);

      // 2d. Render topology artefacts from the after-remove project.yaml.
      const topologyFiles = renderTopology({ repoRoot, projectYamlPath: afterPath });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. Scan workshop main's pats/*.cy.js for specs probing the
      // removed component and mark each match as a delete action, so
      // cypress's pats/**/*.cy.js glob no longer runs them against the
      // smaller topology. The bare-port term (`String(port)`) is a
      // deliberately broad substring match — compile-story-pats' SKILL
      // ("Historical CAT cleanup for REMOVE") accepts false positives
      // here: worst case is a reviewer re-adds a wrongly-deleted CAT.
      const deletes = await withWorkshopPats(rootRepo, (synthRoot, fetched) => {
        ok(`fetched ${fetched} existing pats/*.cy.js from workshop main`);
        const matches = findReferencing(synthRoot, [componentName, String(port)]);
        ok(`found ${matches.length} historical CATs probing ${componentName} (or :${port})`);
        return matches.map(({ path }) => ({ path, action: 'delete' }));
      });

      // 2f. Bundle: project.yaml + topology + new CAT + delete actions
      // for historical CATs probing the removed component.
      const files = [
        { path: 'project.yaml', content: readFileSync(afterPath, 'utf8') },
        ...topologyFiles,
        newCat,
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
// Verb-specific helpers
// ---------------------------------------------------------------------------

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
