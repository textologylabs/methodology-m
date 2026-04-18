// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * render-topology-artefacts — orchestrator for topology artefact generation.
 *
 * Reads project.yaml, validates it, resolves the active compose and ci
 * providers, dispatches to each, collects the returned `{path, content}`
 * file sets, detects cross-provider path collisions, and writes files to
 * the target directory. Pure function of project.yaml — same input
 * produces byte-identical output.
 *
 * Contract and usage: see ./SKILL.md.
 *
 * CLI:
 *   node .m/capabilities/render-topology-artefacts/render.mjs \
 *     --project-yaml <path> --target-dir <path> \
 *     [--targets compose,ci] [--dry-run]
 *
 * Exit codes:
 *   0 — success
 *   1 — schema/validation error
 *   2 — provider not found
 *   3 — write error
 *   4 — output-path collision between providers
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
  COLLISION: 4,
});

// Hardcoded provider discovery. Unknown names exit with PROVIDER_NOT_FOUND.
// Extending this list is the only way to add a new provider in v0.5.1.
const KNOWN_PROVIDERS = {
  compose: new Set(['docker-compose', 'log-only']),
  ci: new Set(['gitlab', 'log-only']),
};

const VALID_TARGETS = new Set(['compose', 'ci']);

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

class RenderError extends Error {
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
    projectYaml: null,
    targetDir: null,
    targets: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--project-yaml':
        args.projectYaml = argv[++i];
        break;
      case '--target-dir':
        args.targetDir = argv[++i];
        break;
      case '--targets':
        args.targets = argv[++i].split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(EXIT.SUCCESS);
        break;
      default:
        throw new RenderError(`Unknown argument: ${a}`, EXIT.VALIDATION);
    }
  }

  if (!args.projectYaml) {
    throw new RenderError('--project-yaml <path> is required', EXIT.VALIDATION);
  }
  if (!args.targetDir) {
    throw new RenderError('--target-dir <path> is required', EXIT.VALIDATION);
  }

  if (args.targets) {
    for (const t of args.targets) {
      if (!VALID_TARGETS.has(t)) {
        throw new RenderError(
          `Unknown target: ${t}. Supported: compose, ci`,
          EXIT.VALIDATION,
        );
      }
    }
  }

  return args;
}

function printHelp() {
  console.log(`
  render-topology-artefacts — generate topology-derived files from project.yaml

  Usage:
    node render.mjs --project-yaml <path> --target-dir <path>
                    [--targets compose,ci] [--dry-run]

  Arguments:
    --project-yaml <path>   Path to project.yaml (required)
    --target-dir <path>     Root repo directory; rendered paths are relative (required)
    --targets <list>        Subset to render. Default: compose,ci
    --dry-run               Print files that would be written without writing

  Exit codes:
    0 — success
    1 — schema/validation error
    2 — provider not found
    3 — write error
    4 — output-path collision
`);
}

// ---------------------------------------------------------------------------
// Read + validate project.yaml
// ---------------------------------------------------------------------------

function readProject(projectYamlPath) {
  if (!existsSync(projectYamlPath)) {
    throw new RenderError(
      `project.yaml not found at ${projectYamlPath}`,
      EXIT.VALIDATION,
    );
  }

  const raw = readFileSync(projectYamlPath, 'utf8');
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    throw new RenderError(
      `project.yaml parse error: ${e.message}`,
      EXIT.VALIDATION,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new RenderError(
      'project.yaml must be a mapping at the top level',
      EXIT.VALIDATION,
    );
  }

  return parsed;
}

/**
 * Practical validation covering the error modes called out by the SKILL.
 * Not a full JSON Schema validator — AJV would be overkill for v0.5.1.
 * The schema at .m/schemas/project.schema.json is the canonical
 * specification; this function enforces its key constraints at runtime.
 */
function validateProject(project) {
  const requireString = (field) => {
    if (typeof project[field] !== 'string' || project[field].length === 0) {
      throw new RenderError(
        `project.yaml schema validation failed: '${field}' is required and must be a non-empty string`,
        EXIT.VALIDATION,
      );
    }
  };

  requireString('project');
  requireString('group');

  if (!Array.isArray(project.components) || project.components.length === 0) {
    throw new RenderError(
      `project.yaml schema validation failed: 'components' must be a non-empty array`,
      EXIT.VALIDATION,
    );
  }

  if (!project.providers || typeof project.providers !== 'object') {
    throw new RenderError(
      `project.yaml schema validation failed: 'providers' must be an object`,
      EXIT.VALIDATION,
    );
  }
  if (typeof project.providers.scm !== 'string' || project.providers.scm.length === 0) {
    throw new RenderError(
      `project.yaml schema validation failed: 'providers.scm' is required`,
      EXIT.VALIDATION,
    );
  }

  const portsSeen = new Map();
  const validTypes = new Set(['embedded', 'referenced']);
  const validRoles = new Set(['frontend-host', 'frontend', 'backend']);

  for (const [i, c] of project.components.entries()) {
    const ctx = `components[${i}]`;

    if (typeof c.name !== 'string' || !c.name) {
      throw new RenderError(
        `project.yaml schema validation failed: ${ctx}.name is required`,
        EXIT.VALIDATION,
      );
    }
    if (!validTypes.has(c.type)) {
      throw new RenderError(
        `project.yaml schema validation failed: ${ctx}.type must be 'embedded' or 'referenced'`,
        EXIT.VALIDATION,
      );
    }
    if (typeof c.location !== 'string' || !c.location) {
      throw new RenderError(
        `project.yaml schema validation failed: ${ctx}.location is required`,
        EXIT.VALIDATION,
      );
    }
    if (c.role !== undefined && !validRoles.has(c.role)) {
      throw new RenderError(
        `project.yaml schema validation failed: ${ctx}.role must be 'frontend-host', 'frontend', or 'backend'`,
        EXIT.VALIDATION,
      );
    }
    if (c.port !== undefined) {
      if (!Number.isInteger(c.port) || c.port < 1 || c.port > 65535) {
        throw new RenderError(
          `project.yaml schema validation failed: ${ctx}.port must be an integer in 1..65535`,
          EXIT.VALIDATION,
        );
      }
      if (portsSeen.has(c.port)) {
        throw new RenderError(
          `Port collision: ${c.port} claimed by ${portsSeen.get(c.port)} and ${c.name}`,
          EXIT.VALIDATION,
        );
      }
      portsSeen.set(c.port, c.name);
    }
  }

  if (project.persistence !== undefined) {
    if (!project.persistence || typeof project.persistence !== 'object') {
      throw new RenderError(
        `Invalid persistence block: must be an object`,
        EXIT.VALIDATION,
      );
    }
    if (typeof project.persistence.type !== 'string' || !project.persistence.type) {
      throw new RenderError(
        `Invalid persistence block: 'type' is required`,
        EXIT.VALIDATION,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

function resolveComposeProvider(project) {
  const explicit = project.providers?.compose;
  if (explicit) return explicit;

  const strategy = project.compose?.integration?.strategy;
  if (strategy) {
    // Current mapping: strategy name maps 1:1 to provider name.
    return strategy;
  }

  throw new RenderError(
    `No compose provider declared and no compose.integration.strategy to infer from. Set providers.compose.`,
    EXIT.VALIDATION,
  );
}

function resolveCIProvider(project) {
  const explicit = project.providers?.ci;
  if (explicit) return explicit;

  const scm = project.providers?.scm;
  if (scm) return scm;

  throw new RenderError(
    `No CI provider declared and no SCM provider to infer from. Set providers.ci.`,
    EXIT.VALIDATION,
  );
}

async function loadProvider(category, name) {
  if (!KNOWN_PROVIDERS[category]?.has(name)) {
    const knownList = [...(KNOWN_PROVIDERS[category] ?? [])].join(', ');
    throw new RenderError(
      `Provider ${category}/${name} not found. Known ${category} providers: ${knownList}`,
      EXIT.PROVIDER_NOT_FOUND,
    );
  }

  const modulePath = join(PROVIDERS_DIR, category, `${name}.mjs`);
  if (!existsSync(modulePath)) {
    throw new RenderError(
      `Provider ${category}/${name} not found at ${modulePath}`,
      EXIT.PROVIDER_NOT_FOUND,
    );
  }

  return import(pathToFileURL(modulePath).href);
}

// ---------------------------------------------------------------------------
// Dispatch + collision detection
// ---------------------------------------------------------------------------

function assertFileSetShape(files, providerId) {
  if (!Array.isArray(files)) {
    throw new RenderError(
      `Provider ${providerId} did not return an array of files`,
      EXIT.VALIDATION,
    );
  }
  for (const [i, f] of files.entries()) {
    if (!f || typeof f !== 'object') {
      throw new RenderError(
        `Provider ${providerId} returned invalid file entry at index ${i}`,
        EXIT.VALIDATION,
      );
    }
    if (typeof f.path !== 'string' || !f.path) {
      throw new RenderError(
        `Provider ${providerId} returned file entry at index ${i} without a path`,
        EXIT.VALIDATION,
      );
    }
    if (typeof f.content !== 'string') {
      throw new RenderError(
        `Provider ${providerId} returned file ${f.path} with non-string content`,
        EXIT.VALIDATION,
      );
    }
  }
}

function detectCollisions(composeFiles, ciFiles, composeProviderName, ciProviderName) {
  const composeByPath = new Map(composeFiles.map((f) => [f.path, f]));
  for (const ciFile of ciFiles) {
    if (composeByPath.has(ciFile.path)) {
      throw new RenderError(
        `Provider output collision at ${ciFile.path}: ${composeProviderName} and ${ciProviderName} both claim this file`,
        EXIT.COLLISION,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

function modeFor(file) {
  if (typeof file.mode === 'number') return file.mode;
  if (file.path.startsWith('scripts/') && file.path.endsWith('.sh')) return 0o755;
  return 0o644;
}

function writeFiles(files, targetDir, dryRun) {
  const written = [];
  for (const f of files) {
    const finalPath = join(targetDir, f.path);
    if (dryRun) {
      written.push(finalPath);
      continue;
    }
    try {
      mkdirSync(dirname(finalPath), { recursive: true });
      writeFileSync(finalPath, f.content, { mode: modeFor(f) });
    } catch (e) {
      throw new RenderError(
        `Failed to write ${finalPath}: ${e.message}`,
        EXIT.WRITE_ERROR,
      );
    }
    written.push(finalPath);
  }
  return written;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = readProject(args.projectYaml);
  validateProject(project);

  const selectedTargets = args.targets
    ? new Set(args.targets)
    : new Set(['compose', 'ci']);

  const scmProvider = project.providers.scm;
  let composeFiles = [];
  let ciFiles = [];
  let composeProviderName = null;
  let ciProviderName = null;

  if (selectedTargets.has('compose')) {
    composeProviderName = resolveComposeProvider(project);
    const mod = await loadProvider('compose', composeProviderName);
    if (typeof mod.render_topology !== 'function') {
      throw new RenderError(
        `Provider compose/${composeProviderName} does not export render_topology`,
        EXIT.PROVIDER_NOT_FOUND,
      );
    }
    composeFiles = mod.render_topology(project);
    assertFileSetShape(composeFiles, `compose/${composeProviderName}`);
  }

  if (selectedTargets.has('ci')) {
    ciProviderName = resolveCIProvider(project);
    const mod = await loadProvider('ci', ciProviderName);
    if (typeof mod.render_pipeline !== 'function') {
      throw new RenderError(
        `Provider ci/${ciProviderName} does not export render_pipeline`,
        EXIT.PROVIDER_NOT_FOUND,
      );
    }
    ciFiles = mod.render_pipeline(project, scmProvider);
    assertFileSetShape(ciFiles, `ci/${ciProviderName}`);
  }

  if (selectedTargets.has('compose') && selectedTargets.has('ci')) {
    detectCollisions(composeFiles, ciFiles, composeProviderName, ciProviderName);
  }

  const allFiles = [...composeFiles, ...ciFiles];
  const written = writeFiles(allFiles, args.targetDir, args.dryRun);

  const prefix = args.dryRun ? 'would write: ' : 'wrote: ';
  for (const p of written) console.log(`${prefix}${p}`);
}

// Direct invocation guard — running via `node render.mjs` triggers main,
// importing the module does not.
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(e.exitCode ?? EXIT.VALIDATION);
  });
}

// Exports for testability — tests can call the orchestrator in-process
// without spawning a subprocess.
export {
  parseArgs,
  readProject,
  validateProject,
  resolveComposeProvider,
  resolveCIProvider,
  loadProvider,
  detectCollisions,
  writeFiles,
  main,
  EXIT,
  KNOWN_PROVIDERS,
};
