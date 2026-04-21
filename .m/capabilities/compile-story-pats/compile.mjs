// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * compile-story-pats — orchestrator for story-level PAT compilation.
 *
 * Reads a story-level PAT yaml + the active project.yaml, resolves the
 * configured `test.cat.*` provider, dispatches to it, and writes the
 * returned `{path, content}` to the target directory. Pure function
 * of (pat, project) — same input produces byte-identical output.
 *
 * Contract and usage: see ./SKILL.md.
 *
 * CLI:
 *   node .m/capabilities/compile-story-pats/compile.mjs \
 *     --pat <path> \
 *     --project-yaml <path> \
 *     --target-dir <path> \
 *     [--dry-run]
 *
 * Exit codes:
 *   0 — success
 *   1 — schema/validation error (missing fields, malformed pat)
 *   2 — provider not found
 *   3 — write error
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from '../../vendor/js-yaml.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROVIDERS_DIR = resolve(__dirname, '..', '..', 'providers');

const EXIT = Object.freeze({
  SUCCESS: 0,
  VALIDATION: 1,
  PROVIDER_NOT_FOUND: 2,
  WRITE_ERROR: 3,
});

const KNOWN_PROVIDERS = new Set(['cypress', 'log-only']);

class CompileError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    pat: null,
    projectYaml: null,
    targetDir: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--pat':
        args.pat = argv[++i];
        break;
      case '--project-yaml':
        args.projectYaml = argv[++i];
        break;
      case '--target-dir':
        args.targetDir = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        throw new CompileError(`Unknown argument: ${a}`, EXIT.VALIDATION);
    }
  }

  if (!args.pat) throw new CompileError('--pat is required', EXIT.VALIDATION);
  if (!args.projectYaml) throw new CompileError('--project-yaml is required', EXIT.VALIDATION);
  if (!args.targetDir) throw new CompileError('--target-dir is required', EXIT.VALIDATION);

  return args;
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

function resolveProviderName(project) {
  const name = project?.providers?.test?.cat;
  if (!name) {
    throw new CompileError(
      'project.providers.test.cat is not set. Declare a test.cat provider (e.g. "cypress" or "log-only").',
      EXIT.VALIDATION,
    );
  }
  if (!KNOWN_PROVIDERS.has(name)) {
    throw new CompileError(
      `Unknown test.cat provider: '${name}'. Known: ${[...KNOWN_PROVIDERS].join(', ')}.`,
      EXIT.PROVIDER_NOT_FOUND,
    );
  }
  return name;
}

async function loadProvider(name) {
  const modulePath = join(PROVIDERS_DIR, 'test', 'cat', `${name}.mjs`);
  if (!existsSync(modulePath)) {
    throw new CompileError(`Provider module not found: ${modulePath}`, EXIT.PROVIDER_NOT_FOUND);
  }
  const url = pathToFileURL(modulePath).href;
  const mod = await import(url);
  if (typeof mod.compile_story_pat !== 'function') {
    throw new CompileError(
      `Provider 'test/cat/${name}' does not export compile_story_pat(pat)`,
      EXIT.PROVIDER_NOT_FOUND,
    );
  }
  return mod;
}

// ---------------------------------------------------------------------------
// PAT + project.yaml loading
// ---------------------------------------------------------------------------

function loadYaml(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new CompileError(`Cannot read ${label}: ${path} (${e.message})`, EXIT.VALIDATION);
  }
  try {
    return yaml.load(raw);
  } catch (e) {
    throw new CompileError(`Invalid YAML in ${label}: ${path} (${e.message})`, EXIT.VALIDATION);
  }
}

function assertStoryPat(pat) {
  if (!pat || typeof pat !== 'object') {
    throw new CompileError('PAT file did not parse to an object', EXIT.VALIDATION);
  }
  if (!pat.story) {
    throw new CompileError(
      "PAT file has no 'story' field — compile-story-pats accepts story-level PATs only. " +
      "Sub-task PATs compile via generate-acceptance-tests.",
      EXIT.VALIDATION,
    );
  }
  if (!Array.isArray(pat.acceptance) || pat.acceptance.length === 0) {
    throw new CompileError("PAT 'acceptance' must be a non-empty array", EXIT.VALIDATION);
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

function writeFile(targetDir, entry) {
  const fullPath = resolve(targetDir, entry.path);
  try {
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, entry.content, { mode: entry.mode ?? 0o644 });
  } catch (e) {
    throw new CompileError(`Failed to write ${fullPath}: ${e.message}`, EXIT.WRITE_ERROR);
  }
  return fullPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(argv) {
  const args = parseArgs(argv);

  const pat = loadYaml(args.pat, 'PAT');
  assertStoryPat(pat);

  const project = loadYaml(args.projectYaml, 'project.yaml');
  const providerName = resolveProviderName(project);
  const provider = await loadProvider(providerName);

  const entry = provider.compile_story_pat(pat);
  if (!entry || typeof entry !== 'object' || !entry.path || entry.content == null) {
    throw new CompileError(
      `Provider 'test/cat/${providerName}' returned a malformed entry`,
      EXIT.VALIDATION,
    );
  }

  if (args.dryRun) {
    process.stdout.write(`${entry.path}\n`);
    return EXIT.SUCCESS;
  }

  const fullPath = writeFile(args.targetDir, entry);
  process.stdout.write(`${entry.path}\n`);
  process.stderr.write(`wrote ${fullPath} via test/cat/${providerName}\n`);
  return EXIT.SUCCESS;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof CompileError) {
      process.stderr.write(`compile-story-pats: ${err.message}\n`);
      process.exit(err.exitCode);
    }
    process.stderr.write(`compile-story-pats: unexpected error: ${err.stack || err.message}\n`);
    process.exit(1);
  });
