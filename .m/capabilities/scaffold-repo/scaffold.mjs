// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * scaffold-repo — orchestrator for a managed repo's deterministic seed
 * bundle.
 *
 * Emits the template-derived seed files a managed repo needs from day
 * zero: README, .gitignore, package.json, package-lock.json, the
 * `.gitlab-ci.yml` lifecycle pipeline (via the ci provider), and the
 * `.m/steering/m-managed-repo.md` development guide.
 *
 * Pure function of its CLI inputs — same flags → byte-identical output.
 * The only filesystem reads are of version-controlled template assets
 * (the steering template here, the managed pipeline inside the ci
 * provider): static co-located inputs, not hidden state.
 *
 * NOT emitted here — they are not deterministic functions of these
 * inputs and stay agent steps in SKILL.md:
 *   - `pats/<sub-task-id>.pat.yaml` — a provided input, placed verbatim
 *   - `pats/stubs/*.js`            — contract-dependent (agent reads the
 *                                    API sub-tasks; templates live in
 *                                    scaffold-repo/templates/)
 *   - `src/` seed files            — implementation, not scaffold
 *
 * CLI:
 *   node .m/capabilities/scaffold-repo/scaffold.mjs \
 *     --component <name> --role <backend|frontend|frontend-host> \
 *     --repo <repo-name> --parent <story-id> --root-repo <name> \
 *     --target-dir <path> [--repo-type node] [--ci-provider gitlab] \
 *     [--dry-run]
 *
 * Exit codes:
 *   0 — success
 *   1 — validation error
 *   2 — provider not found
 *   3 — write error
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');
const PROVIDERS_DIR = resolve(__dirname, '..', '..', 'providers');

const EXIT = Object.freeze({
  SUCCESS: 0,
  VALIDATION: 1,
  PROVIDER_NOT_FOUND: 2,
  WRITE_ERROR: 3,
});

const VALID_ROLES = new Set(['backend', 'frontend', 'frontend-host']);

class ScaffoldError extends Error {
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
    component: null,
    role: null,
    repo: null,
    parent: null,
    rootRepo: null,
    repoType: 'node',
    ciProvider: 'gitlab',
    targetDir: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--component': args.component = argv[++i]; break;
      case '--role': args.role = argv[++i]; break;
      case '--repo': args.repo = argv[++i]; break;
      case '--parent': args.parent = argv[++i]; break;
      case '--root-repo': args.rootRepo = argv[++i]; break;
      case '--repo-type': args.repoType = argv[++i]; break;
      case '--ci-provider': args.ciProvider = argv[++i]; break;
      case '--target-dir': args.targetDir = argv[++i]; break;
      case '--dry-run': args.dryRun = true; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(EXIT.SUCCESS);
        break;
      default:
        throw new ScaffoldError(`Unknown argument: ${a}`, EXIT.VALIDATION);
    }
  }

  for (const [flag, key] of [
    ['--component', 'component'], ['--role', 'role'], ['--repo', 'repo'],
    ['--parent', 'parent'], ['--root-repo', 'rootRepo'], ['--target-dir', 'targetDir'],
  ]) {
    if (!args[key]) throw new ScaffoldError(`${flag} <value> is required`, EXIT.VALIDATION);
  }
  if (!VALID_ROLES.has(args.role)) {
    throw new ScaffoldError(
      `--role must be one of: ${[...VALID_ROLES].join(', ')}`,
      EXIT.VALIDATION,
    );
  }
  if (args.repoType !== 'node') {
    throw new ScaffoldError(
      `--repo-type '${args.repoType}' unsupported — only 'node' is implemented`,
      EXIT.VALIDATION,
    );
  }

  return args;
}

function printHelp() {
  console.log(`
  scaffold-repo — generate a managed repo's deterministic seed bundle

  Usage:
    node scaffold.mjs --component <name> --role <role> --repo <repo-name>
                      --parent <story-id> --root-repo <name>
                      --target-dir <path> [--repo-type node]
                      [--ci-provider gitlab] [--dry-run]

  Exit codes:
    0 — success   1 — validation   2 — provider not found   3 — write error
`);
}

// ---------------------------------------------------------------------------
// Seed file builders
// ---------------------------------------------------------------------------

function renderReadme({ component, role, parent, rootRepo }) {
  return `# ${component}

Managed repo for the **${component}** component (\`${role}\`) of the
**${rootRepo}** Methodology M project.

- **Parent story:** ${parent}
- **Type:** referenced — tracked by version in the root repo.

The executable contract for this component is the PAT yaml in \`pats/\`.
Development guidance lives in \`.m/steering/m-managed-repo.md\`.

Scaffolded by Methodology M \`scaffold-repo\`.
`;
}

function renderGitignore() {
  return `node_modules/
dist/
coverage/
*.log
.env
`;
}

// Lifecycle scripts — see scaffold-repo/SKILL.md "Lifecycle scripts".
// Backends start a Node server; frontends start the webpack dev server.
// The `tag` script was retired in v0.14.0 (the CI tag job pushes the
// tag directly). `--if-present` lets phases without a script succeed.
const LIFECYCLE_SCRIPTS = {
  backend: {
    start: 'node src/server.js',
    build: "echo 'no build step configured'",
    test: "echo 'no tests configured' && exit 0",
    snapshot: "echo 'snapshot: not yet implemented'",
  },
  frontend: {
    start: 'webpack serve --mode development',
    build: 'webpack --mode production',
    test: "echo 'no tests configured' && exit 0",
    snapshot: "echo 'snapshot: not yet implemented'",
  },
};

function renderPackageJson({ repo, role }) {
  const scripts = role === 'backend' ? LIFECYCLE_SCRIPTS.backend : LIFECYCLE_SCRIPTS.frontend;
  return `${JSON.stringify({
    name: repo,
    version: '0.0.0',
    private: true,
    scripts,
  }, null, 2)}\n`;
}

// Minimal lockfile so `npm ci` works from day zero (npm ci aborts
// without one). Trivial for a dependency-free seed.
function renderPackageLock({ repo }) {
  return `${JSON.stringify({
    name: repo,
    version: '0.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: repo, version: '0.0.0' },
    },
  }, null, 2)}\n`;
}

// The steering doc is a version-controlled template with exactly three
// scaffold placeholders (see scaffold-repo/SKILL.md "Parameterisation").
// Other `<...>` tokens in the template are literal documentation and
// are deliberately left untouched.
function renderSteering({ component, role, rootRepo }) {
  const template = readFileSync(join(TEMPLATES_DIR, 'm-managed-repo.md'), 'utf8');
  return template
    .replaceAll('<component-name>', component)
    .replaceAll('<component-role>', role)
    .replaceAll('<root-repo-name>', rootRepo);
}

// ---------------------------------------------------------------------------
// CI provider
// ---------------------------------------------------------------------------

async function loadCiProvider(name) {
  const modulePath = join(PROVIDERS_DIR, 'ci', `${name}.mjs`);
  if (!existsSync(modulePath)) {
    throw new ScaffoldError(`ci provider '${name}' not found at ${modulePath}`, EXIT.PROVIDER_NOT_FOUND);
  }
  const mod = await import(pathToFileURL(modulePath).href);
  if (typeof mod.render_managed_pipeline !== 'function') {
    throw new ScaffoldError(
      `ci provider '${name}' does not export render_managed_pipeline`,
      EXIT.PROVIDER_NOT_FOUND,
    );
  }
  return mod;
}

// ---------------------------------------------------------------------------
// Bundle assembly
// ---------------------------------------------------------------------------

async function buildBundle(args) {
  const ci = await loadCiProvider(args.ciProvider);
  return [
    { path: 'README.md', content: renderReadme(args) },
    { path: '.gitignore', content: renderGitignore() },
    { path: 'package.json', content: renderPackageJson(args) },
    { path: 'package-lock.json', content: renderPackageLock(args) },
    { path: '.m/steering/m-managed-repo.md', content: renderSteering(args) },
    ...ci.render_managed_pipeline(args.repoType),
  ];
}

function writeFiles(files, targetDir, dryRun) {
  const written = [];
  for (const f of files) {
    const finalPath = join(targetDir, f.path);
    if (!dryRun) {
      try {
        mkdirSync(dirname(finalPath), { recursive: true });
        writeFileSync(finalPath, f.content, { mode: typeof f.mode === 'number' ? f.mode : 0o644 });
      } catch (e) {
        throw new ScaffoldError(`Failed to write ${finalPath}: ${e.message}`, EXIT.WRITE_ERROR);
      }
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
  const bundle = await buildBundle(args);
  const written = writeFiles(bundle, args.targetDir, args.dryRun);
  const prefix = args.dryRun ? 'would write: ' : 'wrote: ';
  for (const p of written) console.log(`${prefix}${p}`);
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(e.exitCode ?? EXIT.VALIDATION);
  });
}

export {
  parseArgs, buildBundle, writeFiles, main, EXIT,
  renderReadme, renderPackageJson, renderSteering,
};
