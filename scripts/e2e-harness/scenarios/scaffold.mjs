// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// SCAFFOLD scenario — exercises scaffold-repo end-to-end as a lifecycle
// scenario (exports run(), not prepare()).
//
// scaffold-repo creates a managed repo, seeds it with the deterministic
// bundle, protects `main`, and mints a merge-transaction token. It is
// not a root-repo gate-MR capability, so it runs as a lifecycle
// scenario against a THROWAWAY repo it creates and deletes.
//
// The scenario replicates scaffold-repo SKILL steps 2-5:
//   2. create the managed repo
//   3. run the scaffold.mjs orchestrator → seed bundle, commit to main
//   4. protect main (push: no one, merge: maintainer)
//   5. mint the merge-transaction access token
//
// Verification — the headline assertion is scaffold-repo's own stated
// guarantee: "a dev can create a branch, raise an MR, and the pipeline
// will build, test, publish a snapshot." So the scenario opens a
// trivial MR off the freshly-seeded repo and asserts THAT pipeline
// goes green (install → build → test → snapshot). A green MR pipeline
// proves the seed is coherent end-to-end: npm ci validates the
// lockfile, build/test/snapshot prove package.json, and the pipeline
// running at all proves the `.gitlab-ci.yml` is valid.
//
// Uses role=backend: the backend lifecycle scripts are echo-placeholder
// "working defaults", so the pipeline is green from the seed. A
// frontend's `webpack --mode production` build needs webpack installed
// (an implementation step), so a frontend seed is not green out of the
// box — out of scope for a scaffold smoke test.

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
  id: 'scaffold',
  description: 'scaffold-repo — seed a managed repo, protect + token, assert its MR pipeline goes green',

  defaults({ branchSuffix }) {
    return {
      branchSuffix,
      component: 'harness-widget',
      role: 'backend',
      repoName: `todo-m-scaffold-${branchSuffix}`,
      parent: 'TODOM-HARNESS',
      repoType: 'node',
    };
  },

  async run({ repoRoot, args, defaults }) {
    const {
      component, role, repoName, parent, repoType, branchSuffix,
    } = defaults;
    const created = [];
    const scratch = mkdtempSync(join(tmpdir(), 'e2e-scaffold-'));

    try {
      step(2, `Create throwaway managed repo under ${args.group}`);
      const namespaceId = await resolveGroupId(args.group);
      const repo = await createRepo(repoName, namespaceId);
      created.push(repo);
      ok(`repo: ${repo.path} (id ${repo.id})`);

      step(3, 'Run scaffold.mjs orchestrator → seed bundle');
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
      ok(`scaffold.mjs produced ${seedFiles.length} seed files`);
      for (const f of seedFiles) console.log(`     - ${f.path}`);

      step(4, 'Seed managed repo (single commit on main)');
      await commitFiles(repo.id, 'main', seedFiles, `seed: scaffold ${component}`);
      ok('seed bundle committed to main');

      step(5, 'Reconfigure branch protection');
      await protectBranch(repo.id, 'main');
      verifyProtection(await getBranchProtection(repo.id, 'main'));
      ok('main protected — push: no one, merge: maintainer, no force-push');

      step(6, 'Mint merge-transaction access token');
      // Project access tokens are unavailable on free-tier GitLab.
      // scaffold-repo's SKILL documents this exact case and falls back
      // to a group-level PAT — so the harness mirrors that: a tier
      // permission error is the documented fallback path, not a
      // scenario failure.
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
            + 'scaffold-repo falls back to a group PAT (SKILL Notes)');
        } else {
          throw e;
        }
      }

      step(7, 'Verify: freshly-scaffolded repo MR pipeline goes green');
      const smokeBranch = `scaffold-smoke-${branchSuffix}`;
      const sha = await commitFiles(
        repo.id, smokeBranch,
        [{ path: '.m-scaffold-smoke', content: 'e2e-harness scaffold smoke\n' }],
        'chore: scaffold smoke', 'main',
      );
      const mr = await createMergeRequest(
        repo.path, smokeBranch, 'main', `scaffold smoke ${branchSuffix}`,
      );
      const pipeline = await waitForPipeline(repo.path, sha);
      const green = await assertPipelineGreen(repo.path, pipeline);
      if (!green) {
        throw new Error(`scaffolded repo MR !${mr.iid} pipeline ${pipeline.id} did not pass`);
      }
      ok('MR pipeline green — scaffolded repo is CI-ready from day zero');
    } finally {
      rmSync(scratch, { recursive: true, force: true });
      step(8, 'Teardown');
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
