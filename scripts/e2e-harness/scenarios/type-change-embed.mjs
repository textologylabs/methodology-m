// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// TYPE-CHANGE-EMBED scenario — exercises embed-component end-to-end as
// a lifecycle scenario (exports run(), not prepare()).
//
// embed-component is the `referenced → embedded` direction of
// TYPE-CHANGE: it folds a managed repo's code into the root repo and
// decommissions the managed repo from the orchestration layer. The
// decommission is delegated to unwire-orchestration (I-061).
//
// The code lift-and-shift (managed repo → root repo `packages/<name>/`)
// is a local working-tree operation — not observable as SCM platform
// state — so this scenario does not assert it. What IS platform state,
// and what embed-component genuinely owns, is the **un-wiring**: the
// managed repo's webhook and the per-repo CI variables must be gone,
// while topology-wide shared state (the pipeline trigger,
// M_GROUP_TOKEN) must survive. That is what the scenario verifies.
//
// Shape: first WIRE a throwaway managed repo to a throwaway root
// (replicating wire-orchestration — the `before` state of a
// referenced component), then run unwire-orchestration's SKILL steps
// 2-4 and read the SCM state back. Because webhooks / triggers / CI
// variables are repo-global (no branch to isolate them on), the
// scenario runs against THROWAWAY repos it creates and deletes — it
// never touches the live workshop wiring. Same approach as the `wire`
// scenario.

import {
  createPipelineTrigger, createRepo, createWebhook, deleteCiVariable,
  deleteRepo, deleteWebhook, getCiVariables, getWebhooks, ok,
  resolveGroupId, step, storeCiSecret,
} from '../gitlab.mjs';

const SCM_HOST = 'gitlab.com';

// Masked CI variables must be ≥8 chars; these alphanumeric dummies
// satisfy that. The scenario verifies the un-wiring shape, not token
// validity.
const DUMMY_GROUP_TOKEN = 'harnessgrouptoken000';
const DUMMY_REPO_TOKEN = 'harnessrepotoken0000';

export default {
  id: 'type-change-embed',
  description: 'embed-component — fold a referenced component in, decommission its managed repo, verify un-wiring',

  defaults({ branchSuffix }) {
    return {
      branchSuffix,
      // The hyphen exercises unwire-orchestration's `<NAME_UPPER>` key
      // transform (api-read → M_TOKEN_API_READ).
      component: 'api-read',
      rootName: `todo-m-embed-root-${branchSuffix}`,
      managedName: `todo-m-embed-managed-${branchSuffix}`,
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

      // --- Establish the `before` state: a fully-wired referenced
      //     component (replicates wire-orchestration steps 2-4). ---

      step(3, 'Wire the managed repo (trigger + webhook + CI secrets)');
      const trigger = await createPipelineTrigger(root.id, 'm-shadow-integration-trigger');
      const webhookUrl = `https://${SCM_HOST}/api/v4/projects/${root.id}`
        + `/ref/main/trigger/pipeline?token=${trigger.token}`
        + `&variables[SOURCE_PROJECT_ID]=${managed.id}`
        + `&variables[SOURCE_PROJECT_PATH]=${encodeURIComponent(managed.path)}`
        + '&variables[EVENT_KIND]=mr';
      await createWebhook(managed.id, webhookUrl, {
        merge_request: true, push: false, pipeline: false,
      });
      // Testbed root main is unprotected — store shadow-pipeline
      // variables unprotected (wire-orchestration SKILL note).
      await storeCiSecret(root.id, 'M_GROUP_TOKEN', DUMMY_GROUP_TOKEN, { isProtected: false });
      await storeCiSecret(root.id, tokenKey, DUMMY_REPO_TOKEN, { isProtected: false });
      await storeCiSecret(managed.id, 'M_TRIGGER_TOKEN', trigger.token, { isProtected: false });
      await storeCiSecret(managed.id, 'ROOT_PROJECT_ID', String(root.id), {
        isProtected: false, masked: false,
      });
      ok(`wired: webhook + ${tokenKey} + M_GROUP_TOKEN + managed CI vars`);

      // --- Run embed-component's decommission step: unwire-orchestration
      //     SKILL steps 2-4 (the un-wiring embed-component delegates). ---

      step(4, 'Decommission: unwire-orchestration steps 2-4');

      // Step 2 — remove the MR webhook from the managed repo. Match on
      // the trigger-endpoint URL so an unrelated hook would be left
      // alone (unwire-orchestration SKILL Step 2).
      const hooks = await getWebhooks(managed.id);
      let removed = 0;
      for (const h of hooks) {
        if (h.url.includes(`/projects/${root.id}/`) && h.url.includes('/trigger/pipeline')) {
          await deleteWebhook(managed.id, h.id);
          removed += 1;
        }
      }
      ok(`webhook(s) removed: ${removed}`);

      // Step 3 — remove the root repo's per-repo M_TOKEN_<COMPONENT>.
      // The shared M_GROUP_TOKEN is deliberately left intact.
      await deleteCiVariable(root.id, tokenKey);
      ok(`root: ${tokenKey} removed (M_GROUP_TOKEN left intact)`);

      // Step 4 — remove the managed repo's own CI variables.
      await deleteCiVariable(managed.id, 'M_TRIGGER_TOKEN');
      await deleteCiVariable(managed.id, 'ROOT_PROJECT_ID');
      ok('managed: M_TRIGGER_TOKEN + ROOT_PROJECT_ID removed');

      // --- Verify (un-wired read-back) ---

      step(5, 'Verify: managed repo decommissioned, shared state intact');
      await verifyNoWebhooks(managed.id);
      await verifyVariableAbsent(root.id, tokenKey, 'root');
      await verifyVariablePresent(root.id, 'M_GROUP_TOKEN', 'root');
      await verifyVariableAbsent(managed.id, 'M_TRIGGER_TOKEN', 'managed');
      await verifyVariableAbsent(managed.id, 'ROOT_PROJECT_ID', 'managed');
      ok('un-wiring verified — per-repo plumbing gone, shared state survives');
    } finally {
      // process.exit skips finally, so verification failures THROW
      // (not die) — teardown still runs, then the error propagates.
      step(6, 'Teardown');
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

async function verifyNoWebhooks(managedId) {
  const hooks = await getWebhooks(managedId);
  if (hooks.length !== 0) {
    throw new Error(`expected 0 webhooks on decommissioned repo, found ${hooks.length}`);
  }
  ok('managed repo: no webhooks remain');
}

async function verifyVariableAbsent(projectId, key, label) {
  const vars = await getCiVariables(projectId);
  if (vars.some((v) => v.key === key)) {
    throw new Error(`${label} repo still has CI variable ${key} after un-wiring`);
  }
}

async function verifyVariablePresent(projectId, key, label) {
  const vars = await getCiVariables(projectId);
  if (!vars.some((v) => v.key === key)) {
    throw new Error(`${label} repo lost shared CI variable ${key} — un-wiring over-reached`);
  }
}
