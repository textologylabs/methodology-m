// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// TYPE-CHANGE-EXTRACT scenario — exercises extract-component end-to-end
// as a lifecycle scenario (exports run(), not prepare()).
//
// extract-component is the `embedded → referenced` direction of
// TYPE-CHANGE: it gives a component that lived inside the root repo
// its own managed repo. It is not a root-repo gate-MR capability, so
// it runs as a lifecycle scenario against a THROWAWAY repo it creates
// and deletes.
//
// The scenario replicates extract-component SKILL steps 2-7:
//   2. create the managed repo
//   3. run scaffold.mjs → the deterministic CI/steering seed layer
//   4. lift the component's existing code on top of the seed (the
//      extracted package.json/lockfile/src OVERWRITE scaffold's
//      placeholders — the lift-and-shift of SKILL step 4)
//   5. commit the combined bundle to main (single commit)
//   6. protect main (push: no one, merge: maintainer)
//   7. mint the merge-transaction access token
//
// Verification — the headline assertion is extract-component's stated
// guarantee: "after this capability runs the new managed repo exists
// and is CI-ready". The scenario opens a trivial MR off the extracted
// repo and asserts THAT pipeline goes green. A green pipeline proves
// the *combined* seed is coherent: npm ci validates the extracted
// lockfile, and the test job runs the EXTRACTED test suite
// (`node --test` over `src/`), proving extract-component's
// composition of scaffold's deterministic CI layer with lifted code
// yields a working repo — not just a scaffold smoke test.
//
// The extracted code is a dependency-free Node backend with a
// genuine `/health` server and a node:test suite, so the pipeline is
// green from the seed. The incremental wiring leg (extract-component
// SKILL step 8) is deliberately out of scope here — webhook + CI
// secret installation is already L5-proven by the `wire` scenario.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  ACCESS, assertPipelineGreen, commitFiles, createAccessToken,
  createMergeRequest, createRepo, deleteRepo, getBranchProtection, ok,
  protectBranch, resolveGroupId, step, waitForPipeline,
} from '../gitlab.mjs';
import { collectFiles, runOrchestrator } from '../scenario-lib.mjs';

export default {
  id: 'type-change-extract',
  description: 'extract-component — extract an embedded component into its own managed repo, assert its MR pipeline goes green',

  defaults({ branchSuffix }) {
    return {
      branchSuffix,
      component: 'extracted-widget',
      role: 'backend',
      port: 3007,
      repoName: `todo-m-extract-${branchSuffix}`,
      parent: 'TODOM-HARNESS',
      repoType: 'node',
    };
  },

  async run({ repoRoot, args, defaults }) {
    const {
      component, role, port, repoName, parent, repoType, branchSuffix,
    } = defaults;
    const created = [];
    const scratch = mkdtempSync(join(tmpdir(), 'e2e-typechange-extract-'));

    try {
      step(2, `Create throwaway managed repo under ${args.group}`);
      const namespaceId = await resolveGroupId(args.group);
      const repo = await createRepo(repoName, namespaceId);
      created.push(repo);
      ok(`repo: ${repo.path} (id ${repo.id})`);

      step(3, 'Run scaffold.mjs orchestrator → deterministic CI/steering seed');
      runOrchestrator({
        bin: resolve(repoRoot, '.m/capabilities/scaffold-repo/scaffold.mjs'),
        argv: [
          '--component', component, '--role', role, '--repo', repoName,
          '--parent', parent, '--root-repo', 'todo-m-root',
          '--repo-type', repoType, '--target-dir', scratch,
        ],
        label: 'scaffold-repo',
      });
      const seedFiles = collectFiles(scratch).map((f) => ({
        path: f.path,
        content: readFileSync(f.fullPath, 'utf8'),
      }));
      ok(`scaffold.mjs produced ${seedFiles.length} deterministic seed files`);

      step(4, 'Lift extracted component code over the seed (SKILL step 4)');
      // The extracted code's package.json + package-lock.json overwrite
      // scaffold's placeholders; src/, test/, Dockerfile, pats/ are new.
      const bundle = mergeBundle(seedFiles, extractedCode({ repoName, component, port }));
      const pkg = bundle.find((f) => f.path === 'package.json');
      if (!pkg || !pkg.content.includes('node --test')) {
        throw new Error('extracted package.json did not overwrite the scaffold placeholder');
      }
      if (!bundle.some((f) => f.path === 'src/app.js')) {
        throw new Error('extracted src/ was not lifted into the bundle');
      }
      ok(`bundle: ${bundle.length} files (extracted code overlaid on seed)`);
      for (const f of bundle) console.log(`     - ${f.path}`);

      step(5, 'Seed managed repo (single commit on main)');
      await commitFiles(repo.id, 'main', bundle, `seed: extract ${component} from todo-m-root`);
      ok('combined seed bundle committed to main');

      step(6, 'Reconfigure branch protection');
      await protectBranch(repo.id, 'main');
      verifyProtection(await getBranchProtection(repo.id, 'main'));
      ok('main protected — push: no one, merge: maintainer, no force-push');

      step(7, 'Mint merge-transaction access token');
      // Project access tokens are unavailable on free-tier GitLab.
      // extract-component's SKILL documents this exact case and falls
      // back to a group-level PAT — so the harness mirrors that: a tier
      // permission error is the documented fallback path, not a failure.
      const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
      try {
        const token = await createAccessToken(
          repo.id, 'm-merge-transaction',
          ['api', 'read_repository', 'write_repository'], ACCESS.MAINTAINER, expiresAt,
        );
        if (!token.token) throw new Error('access token creation returned no token value');
        ok(`access token minted (id ${token.id})`);
      } catch (e) {
        if (/permission to create project access token/.test(e.message)) {
          ok('project access tokens unavailable on this tier — '
            + 'extract-component falls back to a group PAT (SKILL Notes)');
        } else {
          throw e;
        }
      }

      step(8, 'Verify: extracted repo MR pipeline goes green');
      const smokeBranch = `extract-smoke-${branchSuffix}`;
      const sha = await commitFiles(
        repo.id, smokeBranch,
        [{ path: '.m-extract-smoke', content: 'e2e-harness type-change-extract smoke\n' }],
        'chore: extract smoke', 'main',
      );
      const mr = await createMergeRequest(
        repo.path, smokeBranch, 'main', `type-change-extract smoke ${branchSuffix}`,
      );
      const pipeline = await waitForPipeline(repo.path, sha);
      const green = await assertPipelineGreen(repo.path, pipeline);
      if (!green) {
        throw new Error(`extracted repo MR !${mr.iid} pipeline ${pipeline.id} did not pass`);
      }
      ok('MR pipeline green — extract-component yields a CI-ready managed repo');
    } finally {
      rmSync(scratch, { recursive: true, force: true });
      step(9, 'Teardown');
      for (const repo of created) {
        try {
          await deleteRepo(repo.id);
          ok(`deleted ${repo.path}`);
        } catch (e) {
          console.error(`  (delete ${repo.path} failed: ${e.message})`);
        }
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Bundle assembly — extracted code overlays the scaffold seed.
// ---------------------------------------------------------------------------

// Merge two file lists by path; entries in `overlay` win over `base`.
function mergeBundle(base, overlay) {
  const byPath = new Map(base.map((f) => [f.path, f]));
  for (const f of overlay) byPath.set(f.path, f);
  return [...byPath.values()];
}

// The component's existing code, as extract-component SKILL step 4
// lifts it out of the root repo's packages/<name>/. A dependency-free
// Node backend: a real /health server plus a node:test suite, so the
// managed pipeline (install → build → test → snapshot) is green from
// the seed without any registry dependency.
function extractedCode({ repoName, component, port }) {
  const appJs = `// ${component} — extracted component (e2e-harness fixture).
const http = require('node:http');

function createApp() {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

module.exports = { createApp };
`;

  const serverJs = `const { createApp } = require('./app');

const PORT = process.env.PORT || ${port};
createApp().listen(PORT, () => {
  console.log('${component} listening on ' + PORT);
});
`;

  const healthTest = `const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

test('GET /health returns 200 { status: ok }', async () => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    const res = await fetch('http://127.0.0.1:' + port + '/health');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), { status: 'ok' });
  } finally {
    server.close();
  }
});
`;

  const packageJson = `${JSON.stringify({
    name: repoName,
    version: '0.1.0',
    private: true,
    scripts: {
      start: 'node src/server.js',
      build: "echo 'no build step configured'",
      test: 'node --test test/',
      snapshot: "echo 'snapshot: not yet implemented'",
    },
  }, null, 2)}\n`;

  const packageLock = `${JSON.stringify({
    name: repoName,
    version: '0.1.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: repoName, version: '0.1.0' },
    },
  }, null, 2)}\n`;

  const dockerfile = `FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npm", "start"]
`;

  const patYaml = `story: TODOM-HARNESS
version: 1
head: ${component}

acceptance:
  - id: AC-001
    when: The extracted component is reachable
    then: A health probe returns 200
    steps:
      - http: GET http://${component}:${port}/health
      - expect-status: 200
`;

  return [
    { path: 'src/app.js', content: appJs },
    { path: 'src/server.js', content: serverJs },
    { path: 'test/health.test.js', content: healthTest },
    { path: 'package.json', content: packageJson },
    { path: 'package-lock.json', content: packageLock },
    { path: 'Dockerfile', content: dockerfile },
    { path: 'pats/TODOM-HARNESS.pat.yaml', content: patYaml },
  ];
}

// ---------------------------------------------------------------------------
// Verification helpers — throw on failure (never die/exit, so the
// run() finally block still tears down the throwaway repo).
// ---------------------------------------------------------------------------

function verifyProtection(prot) {
  if (!prot) throw new Error('main is not protected');
  const push = prot.push_access_levels?.[0]?.access_level;
  const merge = prot.merge_access_levels?.[0]?.access_level;
  if (push !== ACCESS.NONE) {
    throw new Error(`branch protection: expected push 'no one' (0), got access_level ${push}`);
  }
  if (merge !== ACCESS.MAINTAINER) {
    throw new Error(`branch protection: expected merge 'maintainer' (40), got access_level ${merge}`);
  }
  if (prot.allow_force_push !== false) {
    throw new Error('branch protection: force-push must be disabled');
  }
}
