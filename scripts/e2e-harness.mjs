#!/usr/bin/env node
// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * e2e-harness.mjs — v0.5.1 end-to-end validation (I-050 thin).
 *
 * Option C scope: scripts the v0.5.0 live-validation flow against a
 * real GitLab workshop to prove the refactored orchestrator +
 * push_or_update_files path produces a green pipeline.
 *
 * Flow:
 *   1. Preconditions — required env, target group, referenced repos.
 *   2. Render — invoke .m/capabilities/render-topology-artefacts/render.mjs
 *      with the TODOM-S01 fixture project.yaml.
 *   3. Branch — create scratch branch on root repo from main.
 *   4. Push — push the 5 rendered/modified files via the interim
 *      push_or_update_files (N per-file create_or_update_file calls).
 *   5. MR — raise merge request.
 *   6. Wait — poll the MR pipeline until terminal.
 *   7. Assert — every job green.
 *   8. Teardown — close MR, delete branch (unless --keep-on-fail).
 *   9. Report — pass/fail summary, exit 0 or non-zero.
 *
 * Usage:
 *   GITLAB_TOKEN=glpat-xxx node scripts/e2e-harness.mjs \
 *     --group methodology-m/todo-m-workshop \
 *     [--fixture todo-m-s01.yaml] \
 *     [--keep-on-fail]
 *
 * Exit codes:
 *   0 — pass
 *   1 — precondition failure
 *   2 — render error
 *   3 — SCM operation failed
 *   4 — pipeline failed (red)
 *   5 — timeout waiting for pipeline
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RENDERER = resolve(REPO_ROOT, '.m/capabilities/render-topology-artefacts/render.mjs');
const DEFAULT_FIXTURE = resolve(REPO_ROOT, '.m/test-fixtures/todo-m-s01.yaml');

const API = 'https://gitlab.com/api/v4';
const POLL_INTERVAL_MS = 15_000;
const PIPELINE_TIMEOUT_MS = 15 * 60_000; // 15 minutes

const EXIT = Object.freeze({
  PASS: 0,
  PRECONDITION: 1,
  RENDER: 2,
  SCM: 3,
  PIPELINE_RED: 4,
  PIPELINE_TIMEOUT: 5,
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    group: null,
    fixture: DEFAULT_FIXTURE,
    keepOnFail: false,
    branchSuffix: `e2e-${Date.now().toString(36)}`,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--group': args.group = argv[++i]; break;
      case '--fixture': args.fixture = argv[++i]; break;
      case '--keep-on-fail': args.keepOnFail = true; break;
      case '--branch-suffix': args.branchSuffix = argv[++i]; break;
      case '--help': case '-h': printHelp(); process.exit(EXIT.PASS);
      default: die(EXIT.PRECONDITION, `Unknown argument: ${a}`);
    }
  }
  if (!args.group) die(EXIT.PRECONDITION, '--group <gitlab-group-path> is required');
  return args;
}

function printHelp() {
  console.log(`
  e2e-harness.mjs — v0.5.1 end-to-end validation

  Usage:
    GITLAB_TOKEN=<token> node scripts/e2e-harness.mjs --group <path> [flags]

  Flags:
    --group <path>          GitLab group (e.g. methodology-m/todo-m-workshop)
    --fixture <path>        project.yaml fixture (default: TODOM-S01)
    --keep-on-fail          Leave branch + MR on failure for inspection
    --branch-suffix <s>     Scratch branch suffix (default: e2e-<timestamp>)
`);
}

function die(code, msg) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

function step(n, msg) {
  console.log(`\n[${n}] ${msg}`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

// ---------------------------------------------------------------------------
// GitLab REST client
// ---------------------------------------------------------------------------

async function gitlab(method, path, body) {
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

function encodeProject(path) {
  return encodeURIComponent(path);
}

// ---------------------------------------------------------------------------
// Step 1 — Preconditions
// ---------------------------------------------------------------------------

async function checkPreconditions(args) {
  step(1, 'Preconditions');

  if (!statSync(RENDERER, { throwIfNoEntry: false })) {
    die(EXIT.PRECONDITION, `Orchestrator not found at ${RENDERER}`);
  }
  if (!statSync(args.fixture, { throwIfNoEntry: false })) {
    die(EXIT.PRECONDITION, `Fixture not found at ${args.fixture}`);
  }
  ok(`orchestrator at ${relative(REPO_ROOT, RENDERER)}`);
  ok(`fixture at ${relative(REPO_ROOT, args.fixture)}`);

  const rootRepo = `${args.group}/${groupToProjectName(args.group)}-root`;
  await gitlab('GET', `/projects/${encodeProject(rootRepo)}`);
  ok(`root repo exists: ${rootRepo}`);
  return rootRepo;
}

function groupToProjectName(groupPath) {
  // methodology-m/todo-m-workshop → todo-m
  const leaf = groupPath.split('/').pop();
  // Strip trailing "-workshop" if present.
  return leaf.replace(/-workshop$/, '');
}

// ---------------------------------------------------------------------------
// Step 2 — Render
// ---------------------------------------------------------------------------

function renderTopology(fixturePath) {
  step(2, 'Render topology artefacts');
  const outDir = mkdtempSync(join(tmpdir(), 'e2e-render-'));
  const res = spawnSync('node', [
    RENDERER, '--project-yaml', fixturePath, '--target-dir', outDir,
  ], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    die(EXIT.RENDER, `orchestrator exited with code ${res.status}`);
  }
  const files = collectFiles(outDir);
  ok(`rendered ${files.length} files into ${outDir}`);
  for (const f of files) console.log(`     - ${f.path}`);
  return { outDir, files };
}

function collectFiles(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, rel));
    } else if (entry.isFile()) {
      out.push({ path: rel, fullPath: full });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 3 — Branch
// ---------------------------------------------------------------------------

async function createBranch(rootRepo, branchName) {
  step(3, `Create branch ${branchName} from main`);
  await gitlab('POST', `/projects/${encodeProject(rootRepo)}/repository/branches?branch=${encodeURIComponent(branchName)}&ref=main`);
  ok('branch created');
}

// ---------------------------------------------------------------------------
// Step 4 — Push (interim push_or_update_files — per-file)
// ---------------------------------------------------------------------------

async function pushOrUpdateFiles(rootRepo, branchName, files, commitMessage) {
  step(4, 'Push files via interim push_or_update_files (per-file create_or_update_file)');
  for (const f of files) {
    const content = readFileSync(f.fullPath, 'utf8');
    const exists = await fileExists(rootRepo, branchName, f.path);
    const action = exists ? 'PUT' : 'POST';
    const encodedPath = encodeURIComponent(f.path);
    await gitlab(action, `/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}`, {
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
  // Use GET and discard the body — HEAD isn't universally supported on
  // GitLab's files endpoint across self-hosted versions.
  const res = await fetch(
    `${API}/projects/${encodeProject(rootRepo)}/repository/files/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    { method: 'GET', headers: { 'PRIVATE-TOKEN': token } },
  );
  // Drain the body so the connection is freed cleanly.
  await res.arrayBuffer().catch(() => {});
  return res.ok;
}

// ---------------------------------------------------------------------------
// Step 5 — MR
// ---------------------------------------------------------------------------

async function createMergeRequest(rootRepo, source, target, title) {
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

// ---------------------------------------------------------------------------
// Step 6 — Wait for pipeline
// ---------------------------------------------------------------------------

async function waitForPipeline(rootRepo, sha) {
  step(6, `Wait for pipeline on ${sha.slice(0, 8)}`);
  const start = Date.now();
  let pipeline = null;
  while (Date.now() - start < PIPELINE_TIMEOUT_MS) {
    const pipelines = await gitlab('GET', `/projects/${encodeProject(rootRepo)}/pipelines?sha=${sha}&per_page=5`);
    if (pipelines.length > 0) {
      pipeline = await gitlab('GET', `/projects/${encodeProject(rootRepo)}/pipelines/${pipelines[0].id}`);
      process.stdout.write(`  pipeline ${pipeline.id}: ${pipeline.status}\n`);
      if (['success', 'failed', 'canceled', 'skipped'].includes(pipeline.status)) {
        return pipeline;
      }
    } else {
      process.stdout.write(`  pipeline not yet created…\n`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  die(EXIT.PIPELINE_TIMEOUT, `Pipeline did not reach a terminal state in ${PIPELINE_TIMEOUT_MS / 1000}s`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Step 7 — Assert green
// ---------------------------------------------------------------------------

async function assertPipelineGreen(rootRepo, pipeline) {
  step(7, 'Assert pipeline green');
  if (pipeline.status !== 'success') {
    const jobs = await gitlab('GET', `/projects/${encodeProject(rootRepo)}/pipelines/${pipeline.id}/jobs`);
    console.error(`  pipeline status: ${pipeline.status}`);
    for (const j of jobs) {
      const icon = j.status === 'success' ? '✓' : j.status === 'failed' ? '✗' : '·';
      console.error(`    ${icon} ${j.name} — ${j.status}`);
    }
    return false;
  }
  const jobs = await gitlab('GET', `/projects/${encodeProject(rootRepo)}/pipelines/${pipeline.id}/jobs`);
  for (const j of jobs) ok(`${j.name} — ${j.status}`);
  return true;
}

// ---------------------------------------------------------------------------
// Step 8 — Teardown
// ---------------------------------------------------------------------------

async function teardown(rootRepo, mrIid, branchName) {
  step(8, 'Teardown');
  try {
    await gitlab('PUT', `/projects/${encodeProject(rootRepo)}/merge_requests/${mrIid}?state_event=close`);
    ok(`closed MR !${mrIid}`);
  } catch (e) {
    console.error(`  (close MR failed: ${e.message})`);
  }
  try {
    await gitlab('DELETE', `/projects/${encodeProject(rootRepo)}/repository/branches/${encodeURIComponent(branchName)}`);
    ok(`deleted branch ${branchName}`);
  } catch (e) {
    console.error(`  (delete branch failed: ${e.message})`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = groupToProjectName(args.group);
  const branchName = `feat/TODOM-S01-${args.branchSuffix}`;
  const started = Date.now();

  const rootRepo = await checkPreconditions(args);
  const { outDir, files } = renderTopology(args.fixture);

  let mr = null;
  try {
    await createBranch(rootRepo, branchName);
    await pushOrUpdateFiles(
      rootRepo, branchName, files,
      `🏗️ TODOM-S01: add analytics backend (e2e-harness ${args.branchSuffix})`,
    );
    mr = await createMergeRequest(
      rootRepo, branchName, 'main',
      `TODOM-S01-e2e-${args.branchSuffix}: Add analytics backend`,
    );
    const pipeline = await waitForPipeline(rootRepo, mr.sha);
    const green = await assertPipelineGreen(rootRepo, pipeline);
    if (!green) {
      if (!args.keepOnFail) await teardown(rootRepo, mr.iid, branchName);
      die(EXIT.PIPELINE_RED, `pipeline ${pipeline.id} did not pass`);
    }
    await teardown(rootRepo, mr.iid, branchName);
  } catch (e) {
    if (mr && !args.keepOnFail) {
      await teardown(rootRepo, mr.iid, branchName).catch(() => {});
    }
    die(EXIT.SCM, e.message);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n✓ e2e harness PASS — ${elapsed}s, project=${project}, branch=${branchName}`);
}

main().catch((e) => die(EXIT.SCM, e.message));
