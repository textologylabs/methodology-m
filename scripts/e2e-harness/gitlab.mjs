// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// GitLab REST primitives + workflow steps shared by every e2e scenario.
//
// Workflow steps (branch → push → MR → wait → assert → teardown) are
// scenario-agnostic: they take a `files` bundle the scenario produced
// and drive it against a remote workshop project. Anything
// scenario-specific (which fixture, what to render, what assertions
// beyond pipeline-green) lives in the scenario module.

import { readFileSync } from 'node:fs';

const API = 'https://gitlab.com/api/v4';
const POLL_INTERVAL_MS = 15_000;
const PIPELINE_TIMEOUT_MS = 15 * 60_000;

export const EXIT = Object.freeze({
  PASS: 0,
  PRECONDITION: 1,
  PREPARE: 2,
  SCM: 3,
  PIPELINE_RED: 4,
  PIPELINE_TIMEOUT: 5,
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export function step(n, msg) {
  console.log(`\n[${n}] ${msg}`);
}

export function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

export function die(code, msg) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// REST client
// ---------------------------------------------------------------------------

export async function gitlab(method, path, body) {
  const token = process.env.GITLAB_TOKEN;
  if (!token) die(EXIT.PRECONDITION, 'GITLAB_TOKEN env var required');
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const headers = { 'PRIVATE-TOKEN': token };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab ${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function encodeProject(path) {
  return encodeURIComponent(path);
}

// methodology-m/todo-m-workshop → todo-m
export function groupToProjectName(groupPath) {
  const leaf = groupPath.split('/').pop();
  return leaf.replace(/-workshop$/, '');
}

// ---------------------------------------------------------------------------
// Read-side helpers (fetch existing repo state for scenarios that need to
// rewrite or reason about it — e.g. RENAME's historical-CAT scan).
// ---------------------------------------------------------------------------

// Returns the file content as a UTF-8 string, or null if the file doesn't
// exist on the given ref.
export async function fetchFile(rootRepo, ref, path) {
  const token = process.env.GITLAB_TOKEN;
  if (!token) die(EXIT.PRECONDITION, 'GITLAB_TOKEN env var required');
  const encodedPath = encodeURIComponent(path);
  const res = await fetch(
    `${API}/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
    { method: 'GET', headers: { 'PRIVATE-TOKEN': token } },
  );
  if (res.status === 404) {
    await res.arrayBuffer().catch(() => {});
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab GET file ${path}@${ref} → ${res.status}: ${text}`);
  }
  return res.text();
}

// Lists a directory's tree (one level) on the given ref. Returns
// [{ id, name, type, path, mode }, ...]. Returns [] if the path does not
// exist (treated as "no entries" — same shape the historical-cat-scan
// utility's local fallback uses for an absent pats/ dir).
export async function listTree(rootRepo, ref, dirPath) {
  const token = process.env.GITLAB_TOKEN;
  if (!token) die(EXIT.PRECONDITION, 'GITLAB_TOKEN env var required');
  const PER_PAGE = 100;
  const out = [];
  // Page-walk so a directory with more than PER_PAGE entries is not
  // silently truncated. Stop on the first short page.
  for (let page = 1; ; page++) {
    const url =
      `${API}/projects/${encodeProject(rootRepo)}/repository/tree` +
      `?path=${encodeURIComponent(dirPath)}&ref=${encodeURIComponent(ref)}` +
      `&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
    if (res.status === 404) {
      await res.arrayBuffer().catch(() => {});
      return [];
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitLab tree ${dirPath}@${ref} → ${res.status}: ${text}`);
    }
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Workflow steps
// ---------------------------------------------------------------------------

export async function checkRootRepoExists(rootRepo) {
  await gitlab('GET', `/projects/${encodeProject(rootRepo)}`);
  ok(`root repo exists: ${rootRepo}`);
}

export async function createBranch(rootRepo, branchName) {
  step(3, `Create branch ${branchName} from main`);
  await gitlab(
    'POST',
    `/projects/${encodeProject(rootRepo)}/repository/branches?branch=${encodeURIComponent(branchName)}&ref=main`,
  );
  ok('branch created');
}

export async function pushOrUpdateFiles(rootRepo, branchName, files, commitMessage) {
  step(4, 'Push files via interim push_or_update_files (per-file create_or_update_file)');
  for (const f of files) {
    const encodedPath = encodeURIComponent(f.path);
    if (f.action === 'delete') {
      await gitlab('DELETE', `/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}`, {
        branch: branchName,
        commit_message: commitMessage,
      });
      ok(`delete ${f.path}`);
      continue;
    }
    const content = f.content ?? readFileSync(f.fullPath, 'utf8');
    const exists = await fileExists(rootRepo, branchName, f.path);
    const method = exists ? 'PUT' : 'POST';
    await gitlab(method, `/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}`, {
      branch: branchName,
      content,
      commit_message: commitMessage,
    });
    ok(`${exists ? 'update' : 'create'} ${f.path}`);
  }
}

async function fileExists(rootRepo, branch, path) {
  const encodedPath = encodeURIComponent(path);
  const token = process.env.GITLAB_TOKEN;
  // GET, not HEAD — HEAD isn't universally supported on GitLab's files
  // endpoint across self-hosted versions.
  const res = await fetch(
    `${API}/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    { method: 'GET', headers: { 'PRIVATE-TOKEN': token } },
  );
  await res.arrayBuffer().catch(() => {});
  return res.ok;
}

export async function createMergeRequest(rootRepo, source, target, title) {
  step(5, 'Raise merge request');
  const mr = await gitlab('POST', `/projects/${encodeProject(rootRepo)}/merge_requests`, {
    source_branch: source,
    target_branch: target,
    title,
    remove_source_branch: true,
  });
  ok(`MR !${mr.iid} created — ${mr.web_url}`);
  return mr;
}

export async function waitForPipeline(rootRepo, sha) {
  step(6, `Wait for pipeline on ${sha.slice(0, 8)}`);
  const start = Date.now();
  let pipeline = null;
  while (Date.now() - start < PIPELINE_TIMEOUT_MS) {
    const pipelines = await gitlab(
      'GET',
      `/projects/${encodeProject(rootRepo)}/pipelines?sha=${sha}&per_page=5`,
    );
    if (pipelines.length > 0) {
      pipeline = await gitlab(
        'GET',
        `/projects/${encodeProject(rootRepo)}/pipelines/${pipelines[0].id}`,
      );
      process.stdout.write(`  pipeline ${pipeline.id}: ${pipeline.status}\n`);
      if (['success', 'failed', 'canceled', 'skipped'].includes(pipeline.status)) {
        return pipeline;
      }
    } else {
      process.stdout.write(`  pipeline not yet created…\n`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  die(
    EXIT.PIPELINE_TIMEOUT,
    `Pipeline did not reach a terminal state in ${PIPELINE_TIMEOUT_MS / 1000}s`,
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function assertPipelineGreen(rootRepo, pipeline) {
  step(7, 'Assert pipeline green');
  if (pipeline.status !== 'success') {
    const jobs = await gitlab(
      'GET',
      `/projects/${encodeProject(rootRepo)}/pipelines/${pipeline.id}/jobs`,
    );
    console.error(`  pipeline status: ${pipeline.status}`);
    for (const j of jobs) {
      const icon = j.status === 'success' ? '✓' : j.status === 'failed' ? '✗' : '·';
      console.error(`    ${icon} ${j.name} — ${j.status}`);
    }
    return false;
  }
  const jobs = await gitlab(
    'GET',
    `/projects/${encodeProject(rootRepo)}/pipelines/${pipeline.id}/jobs`,
  );
  for (const j of jobs) ok(`${j.name} — ${j.status}`);
  return true;
}

export async function teardown(rootRepo, mrIid, branchName) {
  step(8, 'Teardown');
  try {
    await gitlab(
      'PUT',
      `/projects/${encodeProject(rootRepo)}/merge_requests/${mrIid}?state_event=close`,
    );
    ok(`closed MR !${mrIid}`);
  } catch (e) {
    console.error(`  (close MR failed: ${e.message})`);
  }
  try {
    await gitlab(
      'DELETE',
      `/projects/${encodeProject(rootRepo)}/repository/branches/${encodeURIComponent(branchName)}`,
    );
    ok(`deleted branch ${branchName}`);
  } catch (e) {
    console.error(`  (delete branch failed: ${e.message})`);
  }
}

// ---------------------------------------------------------------------------
// Repo + orchestration primitives (lifecycle scenarios)
//
// Used by scenarios that exercise capabilities outside the gate-MR arc
// (wire-orchestration, and in future scaffold-repo) — they create
// throwaway repos, mutate repo configuration, verify by read-back, and
// clean up. Kept thin: each is a single REST call over `gitlab()`.
// ---------------------------------------------------------------------------

// Resolve a group path (e.g. methodology-m/todo-m-workshop) to its
// numeric GitLab group ID.
export async function resolveGroupId(groupPath) {
  const g = await gitlab('GET', `/groups/${encodeURIComponent(groupPath)}`);
  return g.id;
}

// Resolve a project path to its numeric GitLab project ID.
export async function resolveProjectId(projectPath) {
  const p = await gitlab('GET', `/projects/${encodeProject(projectPath)}`);
  return p.id;
}

// Create a project under a namespace. Returns { id, path, url }.
export async function createRepo(name, namespaceId, visibility = 'public') {
  const p = await gitlab('POST', '/projects', {
    name,
    path: name,
    namespace_id: namespaceId,
    visibility,
    initialize_with_readme: false,
  });
  return { id: p.id, path: p.path_with_namespace, url: p.web_url };
}

// Delete a project by numeric ID. A 404 (already gone) is swallowed so
// teardown is safe to call unconditionally.
export async function deleteRepo(projectId) {
  try {
    await gitlab('DELETE', `/projects/${projectId}`);
  } catch (e) {
    if (!/→ 404/.test(e.message)) throw e;
  }
}

// Create a pipeline trigger on a project. Returns { id, token }.
export async function createPipelineTrigger(projectId, description) {
  const t = await gitlab('POST', `/projects/${projectId}/triggers`, { description });
  return { id: t.id, token: t.token };
}

// Install a webhook. `events` is { merge_request, push, pipeline } —
// each flag defaults falsy. Returns the webhook ID.
export async function createWebhook(projectId, url, events) {
  const h = await gitlab('POST', `/projects/${projectId}/hooks`, {
    url,
    merge_requests_events: !!events.merge_request,
    push_events: !!events.push,
    pipeline_events: !!events.pipeline,
    enable_ssl_verification: true,
  });
  return h.id;
}

// List a project's webhooks.
export async function getWebhooks(projectId) {
  return gitlab('GET', `/projects/${projectId}/hooks`);
}

// Store a CI/CD variable on a project. Flags default to a real
// secret (protected + masked); callers override for non-secrets.
export async function storeCiSecret(
  projectId, key, value, { isProtected = true, masked = true } = {},
) {
  await gitlab('POST', `/projects/${projectId}/variables`, {
    key, value, protected: isProtected, masked,
  });
}

// List a project's CI/CD variables (keys + flags).
export async function getCiVariables(projectId) {
  return gitlab('GET', `/projects/${projectId}/variables`);
}

// GitLab branch-protection access levels.
export const ACCESS = Object.freeze({ NONE: 0, DEVELOPER: 30, MAINTAINER: 40 });

// Apply M-standard branch protection (push: no one, merge: maintainer,
// no force-push by default). GitLab auto-protects `main` on first push
// and has no update API, so any existing protection is removed first.
//
// GitLab's auto-protect can land asynchronously, racing our delete: the
// delete finds nothing, then auto-protect appears before our create
// (409). On a 409 we retry the delete+create once — by then the
// protection definitely exists, so the retried delete removes it.
export async function protectBranch(
  projectId, branch,
  { push = ACCESS.NONE, merge = ACCESS.MAINTAINER, allowForcePush = false } = {},
) {
  const apply = async () => {
    try {
      await gitlab('DELETE', `/projects/${projectId}/protected_branches/${encodeURIComponent(branch)}`);
    } catch (e) {
      if (!/→ 404/.test(e.message)) throw e;
    }
    return gitlab('POST', `/projects/${projectId}/protected_branches`, {
      name: branch,
      push_access_level: push,
      merge_access_level: merge,
      allow_force_push: allowForcePush,
    });
  };
  try {
    return await apply();
  } catch (e) {
    if (/→ 409/.test(e.message)) return apply();
    throw e;
  }
}

// Read a branch's protection config, or null if the branch is unprotected.
export async function getBranchProtection(projectId, branch) {
  try {
    return await gitlab('GET', `/projects/${projectId}/protected_branches/${encodeURIComponent(branch)}`);
  } catch (e) {
    if (/→ 404/.test(e.message)) return null;
    throw e;
  }
}

// Create a project access token. `expiresAt` is an ISO date string —
// GitLab requires it. Returns { id, token }.
export async function createAccessToken(
  projectId, name, scopes, accessLevel = ACCESS.MAINTAINER, expiresAt,
) {
  const t = await gitlab('POST', `/projects/${projectId}/access_tokens`, {
    name, scopes, access_level: accessLevel, expires_at: expiresAt,
  });
  return { id: t.id, token: t.token };
}

// Commit a file bundle as a SINGLE commit via the commits API. Unlike
// `pushOrUpdateFiles` (per-file, N commits → N pipelines), this lands
// one commit. `startBranch` creates `branch` from it in the same call;
// omit it to commit onto an existing (or fresh-repo) branch. Returns
// the commit SHA.
export async function commitFiles(projectId, branch, files, message, startBranch) {
  const body = {
    branch,
    commit_message: message,
    actions: files.map((f) => ({
      action: f.action || 'create',
      file_path: f.path,
      content: f.content,
    })),
  };
  if (startBranch) body.start_branch = startBranch;
  const commit = await gitlab('POST', `/projects/${projectId}/repository/commits`, body);
  return commit.id;
}
