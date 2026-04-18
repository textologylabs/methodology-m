import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from '../../vendor/js-yaml.mjs';
import { render_topology } from './docker-compose.mjs';

const FIXTURES = resolve(import.meta.dirname, '..', '..', 'test-fixtures');

function loadFixture(name) {
  return yaml.load(readFileSync(resolve(FIXTURES, name), 'utf8'));
}

function filesByPath(files) {
  return Object.fromEntries(files.map((f) => [f.path, f]));
}

describe('compose/docker-compose — render_topology', () => {
  test('returns two files: docker-compose.yml and integration-test.sh', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = render_topology(project);
    const paths = files.map((f) => f.path).sort();
    assert.deepStrictEqual(paths, [
      'docker-compose.yml',
      'scripts/integration-test.sh',
    ]);
  });

  test('integration-test.sh has executable mode (0o755)', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = filesByPath(render_topology(project));
    assert.strictEqual(files['scripts/integration-test.sh'].mode, 0o755);
  });

  test('docker-compose.yml has non-executable mode (0o644)', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = filesByPath(render_topology(project));
    assert.strictEqual(files['docker-compose.yml'].mode, 0o644);
  });
});

describe('docker-compose.yml — service block rendering', () => {
  test('embedded frontend-host has build.context as location, with depends_on', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    const content = dc.content;

    assert.match(content, /shell:\n +build:\n +context: \.\/packages\/shell\n/);
    assert.match(content, /shell:[\s\S]*?depends_on:\n +- mfe\n +- api-read\n +- api-write/);
  });

  test('referenced frontend uses sibling-on-disk build.context', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.match(dc.content, /mfe:\n +build:\n +context: \.\.\/todo-m-mfe\n/);
  });

  test('referenced backend has environment with PORT', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.match(
      dc.content,
      /api-read:[\s\S]*?environment:\n +- PORT=3002/,
    );
  });

  test('ports are double-quoted strings in host:container form', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.match(dc.content, /- "3000:3000"/);
    assert.match(dc.content, /- "3001:3001"/);
    assert.match(dc.content, /- "3002:3002"/);
    assert.match(dc.content, /- "3003:3003"/);
  });

  test('file ends with a trailing newline', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.ok(dc.content.endsWith('\n'));
  });

  test('no persistence → no volumes block, no DB_PATH, no volume mounts', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.doesNotMatch(dc.content, /^volumes:/m);
    assert.doesNotMatch(dc.content, /DB_PATH=/);
    assert.doesNotMatch(dc.content, /todo-data:\/data/);
  });
});

describe('docker-compose.yml — persistence', () => {
  test('with persistence → top-level volumes block appears exactly once', () => {
    const project = loadFixture('todo-m-with-persistence.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    const matches = dc.content.match(/^volumes:$/gm);
    assert.strictEqual(matches?.length, 1);
    assert.match(dc.content, /^volumes:\n +todo-data:\n/m);
  });

  test('every backend gets DB_PATH env and volume mount', () => {
    const project = loadFixture('todo-m-with-persistence.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    // api-read
    assert.match(dc.content, /api-read:[\s\S]*?- DB_PATH=\/data\/todo-m\.db/);
    assert.match(dc.content, /api-read:[\s\S]*?- todo-data:\/data/);
    // api-write
    assert.match(dc.content, /api-write:[\s\S]*?- DB_PATH=\/data\/todo-m\.db/);
    assert.match(dc.content, /api-write:[\s\S]*?- todo-data:\/data/);
  });

  test('frontend-host does NOT get DB_PATH or volume mount', () => {
    const project = loadFixture('todo-m-with-persistence.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    // Isolate the shell block (between `shell:` and the next top-level service `mfe:`)
    const shellBlock = dc.content.match(/ {2}shell:\n([\s\S]*?)\n {2}mfe:/)[1];
    assert.doesNotMatch(shellBlock, /DB_PATH=/);
    assert.doesNotMatch(shellBlock, /todo-data:\/data/);
  });
});

describe('docker-compose.yml — TODOM-S01 (5-component ADD)', () => {
  test('analytics service present with correct shape', () => {
    const project = loadFixture('todo-m-s01.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.match(dc.content, /analytics:\n +build:\n +context: \.\.\/todo-m-analytics\n/);
    assert.match(dc.content, /analytics:[\s\S]*?- "3004:3004"/);
    assert.match(dc.content, /analytics:[\s\S]*?- PORT=3004/);
    assert.match(dc.content, /analytics:[\s\S]*?- DB_PATH=\/data\/todo-m\.db/);
  });

  test('shell depends_on now includes analytics in declaration order', () => {
    const project = loadFixture('todo-m-s01.yaml');
    const { 'docker-compose.yml': dc } = filesByPath(render_topology(project));
    assert.match(
      dc.content,
      /shell:[\s\S]*?depends_on:\n +- mfe\n +- api-read\n +- api-write\n +- analytics/,
    );
  });
});

describe('integration-test.sh — framework', () => {
  test('POSIX shebang and do-not-edit header', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.ok(sh.content.startsWith('#!/bin/sh\n'));
    assert.match(sh.content, /Generated by compose\.render_topology — do not edit by hand\./);
  });

  test('DOCKER_GATEWAY defaults to docker', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.match(sh.content, /DOCKER_GATEWAY="\$\{DOCKER_GATEWAY:-docker\}"/);
  });

  test('check() function is defined', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.match(sh.content, /^check\(\) \{$/m);
  });
});

describe('integration-test.sh — per-role probes', () => {
  test('frontend-host probe uses app-shell expected substring', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.match(
      sh.content,
      /check "shell renders" "http:\/\/\$\{DOCKER_GATEWAY\}:3000" "app-shell"/,
    );
  });

  test('frontend probe hits remoteEntry.js with webpackChunk substring', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.match(
      sh.content,
      /check "mfe remoteEntry\.js served" "http:\/\/\$\{DOCKER_GATEWAY\}:3001\/remoteEntry\.js" "webpackChunk"/,
    );
  });

  test('backend probes hit /health with ok substring', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.match(
      sh.content,
      /check "api-read health" "http:\/\/\$\{DOCKER_GATEWAY\}:3002\/health" "ok"/,
    );
    assert.match(
      sh.content,
      /check "api-write health" "http:\/\/\$\{DOCKER_GATEWAY\}:3003\/health" "ok"/,
    );
  });

  test('one probe per component in declaration order', () => {
    const project = loadFixture('todo-m-s01.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    const checkLines = sh.content.split('\n').filter((l) => l.startsWith('check '));
    assert.strictEqual(checkLines.length, 5);
    assert.ok(checkLines[0].includes('"shell renders"'));
    assert.ok(checkLines[1].includes('"mfe remoteEntry.js served"'));
    assert.ok(checkLines[2].includes('"api-read health"'));
    assert.ok(checkLines[3].includes('"api-write health"'));
    assert.ok(checkLines[4].includes('"analytics health"'));
  });

  test('epilogue prints completion summary', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/integration-test.sh': sh } = filesByPath(render_topology(project));
    assert.ok(sh.content.trimEnd().endsWith('All topology aliveness probes passed."'));
  });
});

describe('determinism', () => {
  test('two invocations with the same input produce byte-identical output', () => {
    const project = loadFixture('todo-m-with-persistence.yaml');
    const run1 = render_topology(project);
    const run2 = render_topology(project);
    for (const i of [0, 1]) {
      assert.strictEqual(run1[i].path, run2[i].path);
      assert.strictEqual(run1[i].content, run2[i].content);
      assert.strictEqual(run1[i].mode, run2[i].mode);
    }
  });
});
