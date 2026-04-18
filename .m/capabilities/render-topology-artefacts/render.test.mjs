import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from '../../vendor/js-yaml.mjs';
import {
  parseArgs,
  readProject,
  validateProject,
  resolveComposeProvider,
  resolveCIProvider,
  loadProvider,
  detectCollisions,
  writeFiles,
  EXIT,
} from './render.mjs';

const FIXTURES = resolve(import.meta.dirname, '..', '..', 'test-fixtures');

function makeTmp() { return mkdtempSync(join(tmpdir(), 'render-test-')); }
function cleanTmp(dir) { rmSync(dir, { recursive: true, force: true }); }

// Copy a YAML fixture into a tmp dir and return its path.
function stageFixture(tmp, name) {
  const dest = join(tmp, 'project.yaml');
  writeFileSync(dest, readFileSync(join(FIXTURES, name), 'utf8'));
  return dest;
}

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  test('parses --project-yaml and --target-dir', () => {
    const args = parseArgs(['--project-yaml', '/p.yaml', '--target-dir', '/t']);
    assert.strictEqual(args.projectYaml, '/p.yaml');
    assert.strictEqual(args.targetDir, '/t');
    assert.strictEqual(args.targets, null);
    assert.strictEqual(args.dryRun, false);
  });

  test('parses --targets as comma-separated list', () => {
    const args = parseArgs([
      '--project-yaml', '/p.yaml', '--target-dir', '/t',
      '--targets', 'compose,ci',
    ]);
    assert.deepStrictEqual(args.targets, ['compose', 'ci']);
  });

  test('--dry-run sets the flag', () => {
    const args = parseArgs([
      '--project-yaml', '/p.yaml', '--target-dir', '/t', '--dry-run',
    ]);
    assert.strictEqual(args.dryRun, true);
  });

  test('missing --project-yaml throws validation error', () => {
    assert.throws(
      () => parseArgs(['--target-dir', '/t']),
      (e) => e.exitCode === EXIT.VALIDATION,
    );
  });

  test('missing --target-dir throws validation error', () => {
    assert.throws(
      () => parseArgs(['--project-yaml', '/p.yaml']),
      (e) => e.exitCode === EXIT.VALIDATION,
    );
  });

  test('unknown target value rejected', () => {
    assert.throws(
      () => parseArgs([
        '--project-yaml', '/p.yaml', '--target-dir', '/t',
        '--targets', 'compose,bogus',
      ]),
      /Unknown target: bogus/,
    );
  });
});

// ---------------------------------------------------------------------------
// readProject / validateProject
// ---------------------------------------------------------------------------

describe('readProject + validateProject', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('readProject parses a valid fixture', () => {
    const p = stageFixture(tmp, 'todo-m-base.yaml');
    const project = readProject(p);
    assert.strictEqual(project.project, 'todo-m');
    assert.ok(Array.isArray(project.components));
  });

  test('readProject throws on missing file', () => {
    assert.throws(
      () => readProject('/nonexistent.yaml'),
      /project\.yaml not found/,
    );
  });

  test('validateProject passes on valid fixture', () => {
    const project = yaml.load(readFileSync(join(FIXTURES, 'todo-m-base.yaml'), 'utf8'));
    assert.doesNotThrow(() => validateProject(project));
  });

  test('validateProject rejects missing top-level fields', () => {
    assert.throws(
      () => validateProject({}),
      (e) => e.exitCode === EXIT.VALIDATION,
    );
  });

  test('validateProject rejects components with invalid type', () => {
    const project = yaml.load(readFileSync(join(FIXTURES, 'todo-m-base.yaml'), 'utf8'));
    project.components[0].type = 'bogus';
    assert.throws(() => validateProject(project), /type must be 'embedded' or 'referenced'/);
  });

  test('validateProject rejects duplicate ports', () => {
    const project = yaml.load(readFileSync(join(FIXTURES, 'todo-m-base.yaml'), 'utf8'));
    project.components[1].port = 3000; // collide with shell
    assert.throws(() => validateProject(project), /Port collision: 3000/);
  });

  test('validateProject rejects persistence without type', () => {
    const project = yaml.load(readFileSync(join(FIXTURES, 'todo-m-base.yaml'), 'utf8'));
    project.persistence = { volume: 'x' };
    assert.throws(() => validateProject(project), /persistence block: 'type' is required/);
  });
});

// ---------------------------------------------------------------------------
// resolveComposeProvider / resolveCIProvider
// ---------------------------------------------------------------------------

describe('resolveComposeProvider', () => {
  test('returns explicit providers.compose when set', () => {
    const project = { providers: { compose: 'docker-compose' } };
    assert.strictEqual(resolveComposeProvider(project), 'docker-compose');
  });

  test('falls back to compose.integration.strategy', () => {
    const project = {
      providers: {},
      compose: { integration: { strategy: 'docker-compose' } },
    };
    assert.strictEqual(resolveComposeProvider(project), 'docker-compose');
  });

  test('errors if neither is set', () => {
    const project = { providers: {} };
    assert.throws(
      () => resolveComposeProvider(project),
      /No compose provider declared/,
    );
  });

  test('explicit providers.compose wins over compose.integration.strategy', () => {
    const project = {
      providers: { compose: 'log-only' },
      compose: { integration: { strategy: 'docker-compose' } },
    };
    assert.strictEqual(resolveComposeProvider(project), 'log-only');
  });
});

describe('resolveCIProvider', () => {
  test('returns explicit providers.ci when set', () => {
    const project = { providers: { scm: 'gitlab', ci: 'log-only' } };
    assert.strictEqual(resolveCIProvider(project), 'log-only');
  });

  test('falls back to providers.scm', () => {
    const project = { providers: { scm: 'gitlab' } };
    assert.strictEqual(resolveCIProvider(project), 'gitlab');
  });

  test('errors if neither is set', () => {
    const project = { providers: {} };
    assert.throws(
      () => resolveCIProvider(project),
      /No CI provider declared/,
    );
  });
});

// ---------------------------------------------------------------------------
// loadProvider
// ---------------------------------------------------------------------------

describe('loadProvider', () => {
  test('loads a known provider module', async () => {
    const mod = await loadProvider('compose', 'docker-compose');
    assert.strictEqual(typeof mod.render_topology, 'function');
  });

  test('rejects unknown provider name with PROVIDER_NOT_FOUND exit code', async () => {
    await assert.rejects(
      () => loadProvider('compose', 'nonexistent'),
      (e) => e.exitCode === EXIT.PROVIDER_NOT_FOUND,
    );
  });

  test('lists known providers in error message', async () => {
    await assert.rejects(
      () => loadProvider('compose', 'nonexistent'),
      /Known compose providers: docker-compose, log-only/,
    );
  });
});

// ---------------------------------------------------------------------------
// detectCollisions
// ---------------------------------------------------------------------------

describe('detectCollisions', () => {
  test('passes when no paths overlap', () => {
    assert.doesNotThrow(() => detectCollisions(
      [{ path: 'docker-compose.yml', content: '' }],
      [{ path: '.gitlab-ci.yml', content: '' }],
      'docker-compose', 'gitlab',
    ));
  });

  test('throws COLLISION when paths overlap', () => {
    assert.throws(
      () => detectCollisions(
        [{ path: 'x.yml', content: 'a' }],
        [{ path: 'x.yml', content: 'b' }],
        'compose', 'ci',
      ),
      (e) => e.exitCode === EXIT.COLLISION,
    );
  });
});

// ---------------------------------------------------------------------------
// writeFiles
// ---------------------------------------------------------------------------

describe('writeFiles', () => {
  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('writes files to target-dir, creating subdirs as needed', () => {
    const files = [
      { path: 'docker-compose.yml', content: 'services: {}\n', mode: 0o644 },
      { path: 'scripts/integration-test.sh', content: '#!/bin/sh\n', mode: 0o755 },
    ];
    writeFiles(files, tmp, false);
    assert.ok(existsSync(join(tmp, 'docker-compose.yml')));
    assert.ok(existsSync(join(tmp, 'scripts', 'integration-test.sh')));
  });

  test('sets executable bit on scripts/*.sh', () => {
    const files = [{
      path: 'scripts/foo.sh', content: '#!/bin/sh\n', mode: 0o755,
    }];
    writeFiles(files, tmp, false);
    const m = statSync(join(tmp, 'scripts', 'foo.sh')).mode & 0o777;
    assert.strictEqual(m, 0o755);
  });

  test('dry-run does not write anything', () => {
    const files = [{ path: 'foo.txt', content: 'x', mode: 0o644 }];
    writeFiles(files, tmp, true);
    assert.ok(!existsSync(join(tmp, 'foo.txt')));
  });
});

// ---------------------------------------------------------------------------
// End-to-end determinism via the docker-compose provider
// ---------------------------------------------------------------------------

describe('orchestrator end-to-end determinism', () => {
  let tmp1, tmp2;
  beforeEach(() => { tmp1 = makeTmp(); tmp2 = makeTmp(); });
  afterEach(() => { cleanTmp(tmp1); cleanTmp(tmp2); });

  test('same input produces byte-identical output across two runs', async () => {
    const projectPath = stageFixture(tmp1, 'todo-m-with-persistence.yaml');
    const fixturePath2 = stageFixture(tmp2, 'todo-m-with-persistence.yaml');
    // Invoke the orchestrator in-process by calling the helpers
    // directly — the provider ports are pure so running twice gives
    // the same bytes.
    const project = readProject(projectPath);
    validateProject(project);

    const { render_topology } = await loadProvider('compose', 'docker-compose');
    const run1 = render_topology(project);
    const run2 = render_topology(project);

    for (let i = 0; i < run1.length; i++) {
      assert.strictEqual(run1[i].path, run2[i].path);
      assert.strictEqual(run1[i].content, run2[i].content);
      assert.strictEqual(run1[i].mode, run2[i].mode);
    }
  });
});
