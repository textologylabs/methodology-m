#!/usr/bin/env node
// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * e2e-harness.mjs — end-to-end validation runner (I-050).
 *
 * Drives a named scenario against a real GitLab workshop:
 * preconditions → scenario.prepare() → branch → push → MR → poll
 * pipeline → assert → teardown. Workflow plumbing is in
 * `e2e-harness/gitlab.mjs`; per-verb behaviour lives in
 * `e2e-harness/scenarios/<id>.mjs`.
 *
 * Usage:
 *   GITLAB_TOKEN=glpat-xxx node scripts/e2e-harness.mjs \
 *     --group methodology-m/todo-m-workshop \
 *     [--scenario add] \
 *     [--fixture <path>] \
 *     [--keep-on-fail]
 *
 * Exit codes:
 *   0 — pass
 *   1 — precondition failure
 *   2 — scenario prepare failed (render/compile error)
 *   3 — SCM operation failed
 *   4 — pipeline failed (red)
 *   5 — timeout waiting for pipeline
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';

import {
  EXIT, die, ok, step,
  checkRootRepoExists, createBranch, pushOrUpdateFiles,
  createMergeRequest, waitForPipeline, assertPipelineGreen, teardown,
  groupToProjectName,
} from './e2e-harness/gitlab.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCENARIOS_DIR = resolve(__dirname, 'e2e-harness/scenarios');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    group: null,
    scenario: 'add',
    fixture: null,
    keepOnFail: false,
    branchSuffix: `e2e-${Date.now().toString(36)}`,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--group': args.group = argv[++i]; break;
      case '--scenario': args.scenario = argv[++i]; break;
      case '--fixture': args.fixture = argv[++i]; break;
      case '--keep-on-fail': args.keepOnFail = true; break;
      case '--branch-suffix': args.branchSuffix = argv[++i]; break;
      case '--list-scenarios': listScenariosAndExit();
      case '--help': case '-h': printHelp(); process.exit(EXIT.PASS);
      default: die(EXIT.PRECONDITION, `Unknown argument: ${a}`);
    }
  }
  if (!args.group) die(EXIT.PRECONDITION, '--group <gitlab-group-path> is required');
  return args;
}

function printHelp() {
  console.log(`
  e2e-harness.mjs — end-to-end validation runner

  Usage:
    GITLAB_TOKEN=<token> node scripts/e2e-harness.mjs --group <path> [flags]

  Flags:
    --group <path>          GitLab group (e.g. methodology-m/todo-m-workshop)
    --scenario <id>         Scenario to run (default: add). See --list-scenarios.
    --fixture <path>        Override scenario default fixture
    --keep-on-fail          Leave branch + MR on failure for inspection
    --branch-suffix <s>     Scratch branch suffix (default: e2e-<timestamp>)
    --list-scenarios        List available scenarios and exit
`);
}

function listScenariosAndExit() {
  const ids = readdirSync(SCENARIOS_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => f.replace(/\.mjs$/, ''));
  console.log('Available scenarios:');
  for (const id of ids) console.log(`  - ${id}`);
  process.exit(EXIT.PASS);
}

async function loadScenario(id) {
  const path = resolve(SCENARIOS_DIR, `${id}.mjs`);
  if (!existsSync(path)) {
    die(EXIT.PRECONDITION, `Unknown scenario: '${id}'. Try --list-scenarios.`);
  }
  const mod = await import(pathToFileURL(path).href);
  if (!mod.default || typeof mod.default.prepare !== 'function') {
    die(EXIT.PRECONDITION, `Scenario '${id}' has no default export with prepare()`);
  }
  return mod.default;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));
  const scenario = await loadScenario(cliArgs.scenario);
  const defaults = scenario.defaults({
    repoRoot: REPO_ROOT,
    branchSuffix: cliArgs.branchSuffix,
  });
  const args = {
    ...cliArgs,
    fixture: cliArgs.fixture ?? defaults.fixture,
  };

  const project = groupToProjectName(args.group);
  const rootRepo = `${args.group}/${project}-root`;
  const started = Date.now();

  step(1, `Preconditions (scenario=${scenario.id})`);
  await checkRootRepoExists(rootRepo);
  ok(`scenario: ${scenario.description}`);

  const prepared = await scenario.prepare({ repoRoot: REPO_ROOT, rootRepo, args, defaults });

  let mr = null;
  try {
    await createBranch(rootRepo, defaults.branchName);
    await pushOrUpdateFiles(rootRepo, defaults.branchName, prepared.files, defaults.commitMessage);
    mr = await createMergeRequest(rootRepo, defaults.branchName, 'main', defaults.mrTitle);
    const pipeline = await waitForPipeline(rootRepo, mr.sha);
    const green = await assertPipelineGreen(rootRepo, pipeline);
    if (!green) {
      if (!args.keepOnFail) await teardown(rootRepo, mr.iid, defaults.branchName);
      die(EXIT.PIPELINE_RED, `pipeline ${pipeline.id} did not pass`);
    }
    await teardown(rootRepo, mr.iid, defaults.branchName);
  } catch (e) {
    if (mr && !args.keepOnFail) {
      await teardown(rootRepo, mr.iid, defaults.branchName).catch(() => {});
    }
    die(EXIT.SCM, e.message);
  } finally {
    prepared.cleanup?.();
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\n✓ e2e harness PASS — scenario=${scenario.id}, ${elapsed}s, project=${project}, branch=${defaults.branchName}`,
  );
}

main().catch((e) => die(EXIT.SCM, e.message));
