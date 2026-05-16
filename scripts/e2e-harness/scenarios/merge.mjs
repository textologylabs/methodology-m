// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// MERGE scenario — exercises the structural MERGE flow end-to-end:
// compile-story-pats (new CAT) + render-topology-artefacts (after-merge
// topology) + historical-cat-scan (delete existing pats/*.cy.js that
// probe either merged-away component).
//
// Replicates SKILL Step 2 of compile-story-pats outside the SKILL so
// the harness can drive it deterministically. The SKILL itself stays
// the authoritative description; if Step 2 grows new responsibilities,
// this scenario must absorb them or fall behind.
//
// Defaults merge `analytics` + `metrics` into `insights` against the
// live workshop main. Per decompose-story/SKILL.md S-1 ("merge a and b
// into c — delete a and b, append c with the lowest-numbered port of
// the two"), the merged component takes the lower source port. MERGE
// is ADD-flavoured on the new-component side (the merged component's
// managed repo must exist — SKILL line 424) and REMOVE-flavoured on
// the historical-CAT side (both sources vanish, so CATs probing them
// are deleted). Both sources must be leaf components with no inbound
// callers, or the topology aliveness probes cascade red.
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
  id: 'merge',
  description: 'TODOM-MERGE (analytics + metrics → insights) — compile + render + historical-CAT delete',

  defaults({ branchSuffix }) {
    const sources = ['analytics', 'metrics'];
    const merged = 'insights';
    const storyId = `TODOM-MERGE-${branchSuffix}`;
    return {
      sources,
      merged,
      storyId,
      branchName: `feat/MERGE-${sources.join('-')}-to-${merged}-${branchSuffix}`,
      commitMessage: `🏗️ MERGE ${sources.join(' + ')} → ${merged} (e2e-harness ${branchSuffix})`,
      mrTitle: `MERGE-e2e-${branchSuffix}: ${sources.join(' + ')} → ${merged}`,
    };
  },

  async prepare({ repoRoot, rootRepo, defaults }) {
    const { sources, merged, storyId } = defaults;
    step(2, `Prepare MERGE bundle (${sources.join(' + ')} → ${merged}) — base: workshop main`);

    const scratch = mkdtempSync(join(tmpdir(), 'e2e-merge-'));
    const cleanup = () => rmSync(scratch, { recursive: true, force: true });

    try {
      // 2a. Fetch live project.yaml from workshop main; collapse the
      // two source components into the merged component. The merged
      // component takes the lowest of the source ports.
      const liveProjectRaw = await fetchFile(rootRepo, 'main', 'project.yaml');
      if (!liveProjectRaw) {
        die(EXIT.PRECONDITION, `workshop ${rootRepo} has no project.yaml on main`);
      }
      const baseProject = yaml.load(liveProjectRaw);
      const ports = sources.map((s) => portFor(baseProject, s));
      const mergedPort = Math.min(...ports.map(Number));
      const afterProject = mergeComponents(baseProject, sources, merged, mergedPort);
      const afterPath = join(scratch, 'project.yaml');
      writeFileSync(afterPath, yaml.dump(afterProject), 'utf8');
      ok(`computed after-merge project.yaml (${sources.join('+')} → ${merged}:${mergedPort})`);

      // 2b. Author the synthetic MERGE story PAT (merged component
      // reachable + each source component unreachable).
      const patPath = join(scratch, `${storyId}.pat.yaml`);
      writeFileSync(
        patPath,
        renderMergePat({ storyId, sources, merged, mergedPort, ports }),
        'utf8',
      );
      ok(`authored synthetic MERGE PAT for ${storyId}`);

      // 2c. Compile the PAT into a CAT spec via compile-story-pats.
      const newCat = compileStoryPat({
        repoRoot, patPath, projectYamlPath: afterPath, scratch, storyId,
      });
      ok(`compiled story PAT → ${newCat.path}`);

      // 2d. Render topology artefacts from the after-merge project.yaml.
      const topologyFiles = renderTopology({ repoRoot, projectYamlPath: afterPath });
      ok(`rendered ${topologyFiles.length} topology files`);

      // 2e. Both source components are deleted, so historical CATs
      // probing either are marked for deletion. MERGE is REMOVE-
      // flavoured here — the bare-port terms are deliberately broad
      // substring matches; see remove.mjs / the compile-story-pats
      // SKILL for the false-positive rationale.
      const terms = [...sources, ...ports];
      const deletes = await withWorkshopPats(rootRepo, (synthRoot, fetched) => {
        ok(`fetched ${fetched} existing pats/*.cy.js from workshop main`);
        const matches = findReferencing(synthRoot, terms);
        ok(`found ${matches.length} historical CATs probing ${sources.join(' / ')}`);
        return matches.map(({ path }) => ({ path, action: 'delete' }));
      });

      // 2f. Bundle: project.yaml + topology + new CAT + delete actions
      // for historical CATs probing either merged-away component.
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

function mergeComponents(project, sources, merged, mergedPort) {
  const cloned = JSON.parse(JSON.stringify(project));
  if (!Array.isArray(cloned.components)) {
    throw new Error('base project.yaml has no components[]');
  }
  for (const s of sources) {
    if (!cloned.components.some((c) => c.name === s)) {
      throw new Error(`base project.yaml has no component named '${s}'`);
    }
  }
  // The merged component inherits type/role/tag from the first source
  // and derives its location by swapping the trailing path segment
  // (the managed-repo basename is `<project>-<name>`).
  const proto = cloned.components.find((c) => c.name === sources[0]);
  const segments = proto.location.split('/');
  segments[segments.length - 1] = `${cloned.project}-${merged}`;
  const mergedComponent = {
    name: merged,
    type: proto.type ?? 'referenced',
    location: segments.join('/'),
    tag: proto.tag ?? 'v0.1.0',
    role: proto.role ?? 'backend',
    port: mergedPort,
  };
  cloned.components = cloned.components.filter((c) => !sources.includes(c.name));
  cloned.components.push(mergedComponent);
  return cloned;
}

function renderMergePat({ storyId, sources, merged, mergedPort, ports }) {
  const acs = [
    `  - id: AC-001
    when: The merged component is reachable
    then: A health probe to the merged component returns 200
    steps:
      - http: GET http://${merged}:${mergedPort}/health
      - expect-status: 200`,
    ...sources.map((s, i) => `  - id: AC-00${i + 2}
    when: Source component ${s} no longer routes
    then: A health probe to ${s} fails to connect
    steps:
      - http: GET http://${s}:${ports[i]}/health
      - expect-unreachable: true`),
  ];
  return `story: ${storyId}
version: 1
head: ${merged}

acceptance:
${acs.join('\n\n')}
`;
}
