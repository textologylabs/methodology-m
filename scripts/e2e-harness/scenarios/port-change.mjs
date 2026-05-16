// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// PORT-CHANGE scenario — exercises the structural PORT CHANGE flow
// end-to-end: compile-story-pats (new CAT) + render-topology-artefacts
// (after-change topology) + historical-cat-scan (rewrite existing
// pats/*.cy.js that probe the component's old port).
//
// Replicates SKILL Step 2 of compile-story-pats outside the SKILL so
// the harness can drive it deterministically. The SKILL itself stays
// the authoritative description; if Step 2 grows new responsibilities,
// this scenario must absorb them or fall behind.
//
// Defaults move `analytics` from its live port to 3009 against the
// live workshop main. PORT CHANGE is the cheapest structural verb —
// decompose-story/SKILL.md records "no special precondition beyond
// the component already existing": no new repo, no new leaf. The
// compose provider renders both the `ports:` mapping and the `PORT=`
// env var from `component.port`, so a port change re-renders
// coherently and the component (reading process.env.PORT) follows.
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
  id: 'port-change',
  description: 'TODOM-PORTCHANGE (analytics → 3009) — compile + render + historical-CAT rewrite',

  defaults({ branchSuffix }) {
    const componentName = 'analytics';
    const newPort = 3009;
    const storyId = `TODOM-PORTCHANGE-${branchSuffix}`;
    return {
      componentName,
      newPort,
      storyId,
      branchName: `feat/PORTCHANGE-${componentName}-${branchSuffix}`,
      commitMessage: `🏗️ PORT CHANGE ${componentName} → ${newPort} (e2e-harness ${branchSuffix})`,
      mrTitle: `PORTCHANGE-e2e-${branchSuffix}: ${componentName} → ${newPort}`,
    };
  },

  async prepare({ repoRoot, rootRepo, defaults }) {
    const { componentName, newPort, storyId } = defaults;
    step(2, `Prepare PORT-CHANGE bundle (${componentName} → ${newPort}) — base: workshop main`);

    const scratch = mkdtempSync(join(tmpdir(), 'e2e-portchange-'));
    const cleanup = () => rmSync(scratch, { recursive: true, force: true });

    try {
      // 2a. Fetch live project.yaml from workshop main; change the
      // target component's port. Compute oldTerm/newTerm for the
      // historical CAT scan. Working off the live state (not a static
      // fixture) avoids drift between fixture and real topology.
      const liveProjectRaw = await fetchFile(rootRepo, 'main', 'project.yaml');
      if (!liveProjectRaw) {
        die(EXIT.PRECONDITION, `workshop ${rootRepo} has no project.yaml on main`);
      }
      const baseProject = yaml.load(liveProjectRaw);
      const oldPort = portFor(baseProject, componentName);
      if (String(newPort) === oldPort) {
        die(EXIT.PRECONDITION, `${componentName} is already on port ${newPort} — nothing to change`);
      }
      const afterProject = changePort(baseProject, componentName, newPort);
      const oldTerm = `${componentName}:${oldPort}`;
      const newTerm = `${componentName}:${newPort}`;
      const afterPath = join(scratch, 'project.yaml');
      writeFileSync(afterPath, yaml.dump(afterProject), 'utf8');
      ok(`computed after-port-change project.yaml (${oldTerm} → ${newTerm})`);

      // 2b. Author the synthetic PORT-CHANGE story PAT.
      const patPath = join(scratch, `${storyId}.pat.yaml`);
      writeFileSync(
        patPath,
        renderPortChangePat({ storyId, componentName, oldPort, newPort }),
        'utf8',
      );
      ok(`authored synthetic PORT-CHANGE PAT for ${storyId}`);

      // 2c. Compile the PAT into a CAT spec via compile-story-pats.
      const newCat = compileStoryPat({
        repoRoot, patPath, projectYamlPath: afterPath, scratch, storyId,
      });
      ok(`compiled story PAT → ${newCat.path}`);

      // 2d. Render topology artefacts from the after-change project.yaml.
      const topologyFiles = renderTopology({ repoRoot, projectYamlPath: afterPath });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. Scan workshop main's pats/*.cy.js and rewrite the old
      // identifier (`<name>:<oldPort>`) to the new one in place — the
      // component name is unchanged, only its port moves.
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

function changePort(project, name, newPort) {
  const cloned = JSON.parse(JSON.stringify(project));
  if (!Array.isArray(cloned.components)) {
    throw new Error('base project.yaml has no components[]');
  }
  const comp = cloned.components.find((c) => c.name === name);
  if (!comp) {
    throw new Error(`base project.yaml has no component named '${name}'`);
  }
  comp.port = newPort;
  return cloned;
}

function renderPortChangePat({ storyId, componentName, oldPort, newPort }) {
  return `story: ${storyId}
version: 1
head: ${componentName}

acceptance:
  - id: AC-001
    when: The component is reachable on its new port
    then: A health probe to the new port returns 200
    steps:
      - http: GET http://${componentName}:${newPort}/health
      - expect-status: 200

  - id: AC-002
    when: The old port no longer routes
    then: A health probe to the old port fails to connect
    steps:
      - http: GET http://${componentName}:${oldPort}/health
      - expect-unreachable: true
`;
}
