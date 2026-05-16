// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// SPLIT scenario — exercises the structural SPLIT flow end-to-end:
// compile-story-pats (new CAT) + render-topology-artefacts (after-split
// topology) + historical-cat-scan (delete existing pats/*.cy.js that
// probe the split-away source component).
//
// Replicates SKILL Step 2 of compile-story-pats outside the SKILL so
// the harness can drive it deterministically. The SKILL itself stays
// the authoritative description; if Step 2 grows new responsibilities,
// this scenario must absorb them or fall behind.
//
// Defaults split `analytics` into `analytics-core` + `analytics-edge`
// against the live workshop main. SPLIT is the inverse of MERGE.
// decompose-story/SKILL.md lists SPLIT as a structural verb but its
// S-1 transformation table has no SPLIT row (only add/remove/merge/
// rename/port-change) — by symmetry with MERGE ("delete a and b,
// append c"), SPLIT is "delete a, append b and c". The doc gap is
// tracked separately. One target keeps the source port; the other
// takes the next free port.
//
// SPLIT is ADD-flavoured on the new-component side (both target repos
// must exist — SKILL line 424) and REMOVE-flavoured on the historical-
// CAT side (the source vanishes, so CATs probing it are deleted). The
// source must be a leaf component with no inbound callers, or the
// topology aliveness probes cascade red.
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
  id: 'split',
  description: 'TODOM-SPLIT (analytics → analytics-core + analytics-edge) — compile + render + historical-CAT delete',

  defaults({ branchSuffix }) {
    const source = 'analytics';
    // One target keeps the source port (3004); the other takes the
    // next free port above the seeded topology (3000–3005 are used).
    const targets = [
      { name: 'analytics-core', port: 3004 },
      { name: 'analytics-edge', port: 3006 },
    ];
    const storyId = `TODOM-SPLIT-${branchSuffix}`;
    const targetNames = targets.map((t) => t.name).join(' + ');
    return {
      source,
      targets,
      storyId,
      branchName: `feat/SPLIT-${source}-${branchSuffix}`,
      commitMessage: `🏗️ SPLIT ${source} → ${targetNames} (e2e-harness ${branchSuffix})`,
      mrTitle: `SPLIT-e2e-${branchSuffix}: ${source} → ${targetNames}`,
    };
  },

  async prepare({ repoRoot, rootRepo, defaults }) {
    const { source, targets, storyId } = defaults;
    const targetNames = targets.map((t) => t.name).join(' + ');
    step(2, `Prepare SPLIT bundle (${source} → ${targetNames}) — base: workshop main`);

    const scratch = mkdtempSync(join(tmpdir(), 'e2e-split-'));
    const cleanup = () => rmSync(scratch, { recursive: true, force: true });

    try {
      // 2a. Fetch live project.yaml from workshop main; split the
      // source component into the target components.
      const liveProjectRaw = await fetchFile(rootRepo, 'main', 'project.yaml');
      if (!liveProjectRaw) {
        die(EXIT.PRECONDITION, `workshop ${rootRepo} has no project.yaml on main`);
      }
      const baseProject = yaml.load(liveProjectRaw);
      const sourcePort = portFor(baseProject, source);
      const afterProject = splitComponent(baseProject, source, targets);
      const afterPath = join(scratch, 'project.yaml');
      writeFileSync(afterPath, yaml.dump(afterProject), 'utf8');
      ok(`computed after-split project.yaml (${source}:${sourcePort} → ${targetNames})`);

      // 2b. Author the synthetic SPLIT story PAT (each target
      // reachable + the source component unreachable).
      const patPath = join(scratch, `${storyId}.pat.yaml`);
      writeFileSync(
        patPath,
        renderSplitPat({ storyId, source, sourcePort, targets }),
        'utf8',
      );
      ok(`authored synthetic SPLIT PAT for ${storyId}`);

      // 2c. Compile the PAT into a CAT spec via compile-story-pats.
      const newCat = compileStoryPat({
        repoRoot, patPath, projectYamlPath: afterPath, scratch, storyId,
      });
      ok(`compiled story PAT → ${newCat.path}`);

      // 2d. Render topology artefacts from the after-split project.yaml.
      const topologyFiles = renderTopology({ repoRoot, projectYamlPath: afterPath });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. The source component is deleted, so historical CATs
      // probing it are marked for deletion. SPLIT is REMOVE-flavoured
      // here — the bare-port term is a deliberately broad substring
      // match; see remove.mjs / the compile-story-pats SKILL for the
      // false-positive rationale.
      const deletes = await withWorkshopPats(rootRepo, (synthRoot, fetched) => {
        ok(`fetched ${fetched} existing pats/*.cy.js from workshop main`);
        const matches = findReferencing(synthRoot, [source, sourcePort]);
        ok(`found ${matches.length} historical CATs probing ${source} (or :${sourcePort})`);
        return matches.map(({ path }) => ({ path, action: 'delete' }));
      });

      // 2f. Bundle: project.yaml + topology + new CAT + delete actions
      // for historical CATs probing the split-away source component.
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

function splitComponent(project, source, targets) {
  const cloned = JSON.parse(JSON.stringify(project));
  if (!Array.isArray(cloned.components)) {
    throw new Error('base project.yaml has no components[]');
  }
  const proto = cloned.components.find((c) => c.name === source);
  if (!proto) {
    throw new Error(`base project.yaml has no component named '${source}'`);
  }
  // Each target inherits type/role/tag from the source and derives
  // its location by swapping the trailing path segment (the managed-
  // repo basename is `<project>-<name>`).
  const newComponents = targets.map((t) => {
    const segments = proto.location.split('/');
    segments[segments.length - 1] = `${cloned.project}-${t.name}`;
    return {
      name: t.name,
      type: proto.type ?? 'referenced',
      location: segments.join('/'),
      tag: proto.tag ?? 'v0.1.0',
      role: proto.role ?? 'backend',
      port: t.port,
    };
  });
  cloned.components = cloned.components.filter((c) => c.name !== source);
  cloned.components.push(...newComponents);
  return cloned;
}

function renderSplitPat({ storyId, source, sourcePort, targets }) {
  const acs = [
    ...targets.map((t, i) => `  - id: AC-00${i + 1}
    when: Split target ${t.name} is reachable
    then: A health probe to ${t.name} returns 200
    steps:
      - http: GET http://${t.name}:${t.port}/health
      - expect-status: 200`),
    `  - id: AC-00${targets.length + 1}
    when: Source component ${source} no longer routes
    then: A health probe to ${source} fails to connect
    steps:
      - http: GET http://${source}:${sourcePort}/health
      - expect-unreachable: true`,
  ];
  return `story: ${storyId}
version: 1
head: ${targets[0].name}

acceptance:
${acs.join('\n\n')}
`;
}
