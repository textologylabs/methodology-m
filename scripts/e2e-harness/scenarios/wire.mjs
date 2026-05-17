// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// WIRE scenario — exercises wire-orchestration end-to-end as a
// lifecycle scenario (it exports run(), not prepare(), so the harness
// runner hands it the whole execution rather than driving the
// gate-MR arc).
//
// wire-orchestration connects managed repos to the root repo's
// orchestration layer: a pipeline trigger on root, an MR webhook on
// each managed repo, CI secrets on both. It is pure SCM configuration
// — no gate MR, no pipeline to assert green.
//
// Verification is an artifacts-installed read-back: after wiring, the
// scenario reads the webhook / trigger / CI-variable state straight
// back off the SCM API and asserts each artifact exists with the
// flags wire-orchestration's SKILL specifies. It deliberately does
// NOT fire the wired webhook — a webhook-delivery e2e is slow, flaky,
// and mutates managed-repo state, the wrong shape for a permanent
// regression-suite member.
//
// Because webhooks / triggers / CI variables are repo-global state
// (no branch to isolate them on), the scenario runs against THROWAWAY
// repos it creates and deletes — it never touches the live workshop
// wiring.
//
// Replicates wire-orchestration's SKILL steps 1-4. Step 5 (push the
// root .gitlab-ci.yml) is render-topology-artefacts' job, already
// covered by the gate-MR scenarios; out of scope here.

import {
  createPipelineTrigger, createRepo, createWebhook, deleteRepo,
  getCiVariables, getWebhooks, ok, resolveGroupId, step, storeCiSecret,
} from '../gitlab.mjs';

const SCM_HOST = 'gitlab.com';

// Masked CI variables must be ≥8 chars; these alphanumeric dummies
// satisfy that. Real wiring passes real tokens from scaffold-repo —
// the harness verifies the wiring shape, not token validity.
const DUMMY_GROUP_TOKEN = 'harnessgrouptoken000';
const DUMMY_REPO_TOKEN = 'harnessrepotoken0000';

export default {
  id: 'wire',
  description: 'wire-orchestration — trigger + webhook + CI secrets, artifacts-installed verification',

  defaults({ branchSuffix }) {
    return {
      branchSuffix,
      // Logical component name for the throwaway managed repo. The
      // hyphen exercises wire-orchestration's `<NAME_UPPER>` key
      // transform (api-read → M_TOKEN_API_READ).
      component: 'api-read',
      rootName: `todo-m-wire-root-${branchSuffix}`,
      managedName: `todo-m-wire-managed-${branchSuffix}`,
    };
  },

  async run({ args, defaults }) {
    const { component, rootName, managedName } = defaults;
    const tokenKey = `M_TOKEN_${component.toUpperCase().replace(/-/g, '_')}`;
    const created = [];

    try {
      step(2, `Create throwaway repos under ${args.group}`);
      const namespaceId = await resolveGroupId(args.group);
      const root = await createRepo(rootName, namespaceId);
      created.push(root);
      ok(`root repo: ${root.path} (id ${root.id})`);
      const managed = await createRepo(managedName, namespaceId);
      created.push(managed);
      ok(`managed repo: ${managed.path} (id ${managed.id})`);

      // --- Replicate wire-orchestration SKILL steps 2-4 ---

      step(3, 'Create pipeline trigger on root repo');
      const trigger = await createPipelineTrigger(root.id, 'm-shadow-integration-trigger');
      ok(`trigger created (id ${trigger.id})`);

      step(4, 'Install MR webhook on managed repo');
      const webhookUrl = `https://${SCM_HOST}/api/v4/projects/${root.id}`
        + `/ref/main/trigger/pipeline?token=${trigger.token}`
        + `&variables[SOURCE_PROJECT_ID]=${managed.id}`
        + `&variables[SOURCE_PROJECT_PATH]=${encodeURIComponent(managed.path)}`
        + '&variables[EVENT_KIND]=mr';
      await createWebhook(managed.id, webhookUrl, {
        merge_request: true, push: false, pipeline: false,
      });
      ok('MR webhook installed (push + pipeline events disabled)');

      step(5, 'Store CI secrets');
      // Workshop main is intentionally unprotected (testbed) — store
      // shadow-pipeline variables unprotected so trigger pipelines
      // can read them (wire-orchestration SKILL, "intentionally-
      // unprotected main" note).
      await storeCiSecret(root.id, 'M_GROUP_TOKEN', DUMMY_GROUP_TOKEN, { isProtected: false });
      await storeCiSecret(root.id, tokenKey, DUMMY_REPO_TOKEN, { isProtected: false });
      ok(`root: M_GROUP_TOKEN + ${tokenKey}`);
      await storeCiSecret(managed.id, 'M_TRIGGER_TOKEN', trigger.token, { isProtected: false });
      await storeCiSecret(managed.id, 'ROOT_PROJECT_ID', String(root.id), {
        isProtected: false, masked: false,
      });
      ok('managed: M_TRIGGER_TOKEN + ROOT_PROJECT_ID');

      // --- Verify (artifacts-installed read-back) ---

      step(6, 'Verify installed artifacts');
      await verifyWebhook(managed.id, trigger.token);
      await verifyCiVariables(root.id, ['M_GROUP_TOKEN', tokenKey], 'root');
      await verifyCiVariables(managed.id, ['M_TRIGGER_TOKEN', 'ROOT_PROJECT_ID'], 'managed');
      ok('all orchestration artifacts present and correctly configured');
    } finally {
      // process.exit skips finally, so verification failures THROW
      // (not die) — teardown still runs, then the error propagates
      // to the runner's top-level catch.
      step(7, 'Teardown');
      for (const repo of created.reverse()) {
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
// run() finally block still tears down the throwaway repos).
// ---------------------------------------------------------------------------

async function verifyWebhook(managedId, triggerToken) {
  const hooks = await getWebhooks(managedId);
  if (hooks.length !== 1) {
    throw new Error(`expected exactly 1 webhook on managed repo, found ${hooks.length}`);
  }
  const h = hooks[0];
  if (h.merge_requests_events !== true) {
    throw new Error('webhook does not have merge_request events enabled');
  }
  if (h.push_events !== false || h.pipeline_events !== false) {
    throw new Error('webhook must have push + pipeline events disabled');
  }
  if (!h.url.includes(triggerToken) || !h.url.includes('EVENT_KIND')) {
    throw new Error('webhook URL missing trigger token / EVENT_KIND variables');
  }
  ok('webhook: MR events only, trigger-variable URL well-formed');
}

async function verifyCiVariables(projectId, expectedKeys, label) {
  const vars = await getCiVariables(projectId);
  const present = new Set(vars.map((v) => v.key));
  for (const key of expectedKeys) {
    if (!present.has(key)) {
      throw new Error(`${label} repo missing CI variable ${key}`);
    }
  }
  ok(`${label} CI variables: ${expectedKeys.join(', ')}`);
}
