// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { findReferencing, rewriteReferencing } from './historical-cat-scan.mjs';

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cat-scan-'));
  mkdirSync(join(root, 'pats'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function seed(name, content) {
  writeFileSync(join(root, 'pats', name), content);
}

describe('findReferencing', () => {
  test('returns specs whose content matches any term', () => {
    seed('TODOM-S02.cy.js', "cy.request('http://metrics:3004/health')");
    seed('TODOM-S03.cy.js', "cy.request('http://shell:3000/')");

    const matches = findReferencing(root, ['metrics', '3004']);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].path, 'pats/TODOM-S02.cy.js');
  });

  test('returns specs in lexicographic path order', () => {
    seed('TODOM-S04.cy.js', 'metrics here');
    seed('TODOM-S02.cy.js', 'metrics here');
    seed('TODOM-S03.cy.js', 'metrics here');

    const matches = findReferencing(root, ['metrics']);
    assert.deepStrictEqual(
      matches.map((m) => m.path),
      ['pats/TODOM-S02.cy.js', 'pats/TODOM-S03.cy.js', 'pats/TODOM-S04.cy.js'],
    );
  });

  test('skips non-.cy.js files in pats/', () => {
    seed('TODOM-S02.cy.js', 'metrics');
    seed('TODOM-S02.pat.yaml', 'metrics');
    seed('README.md', 'metrics');

    const matches = findReferencing(root, ['metrics']);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].path, 'pats/TODOM-S02.cy.js');
  });

  test('returns empty array when terms is empty', () => {
    seed('TODOM-S02.cy.js', 'metrics');
    assert.deepStrictEqual(findReferencing(root, []), []);
  });

  test('returns empty array when pats/ does not exist', () => {
    rmSync(join(root, 'pats'), { recursive: true });
    assert.deepStrictEqual(findReferencing(root, ['metrics']), []);
  });
});

describe('rewriteReferencing', () => {
  test('rewrites only specs that contain oldTerm', () => {
    seed('TODOM-S02.cy.js', "cy.request('http://metrics:3004/health')");
    seed('TODOM-S03.cy.js', "cy.request('http://shell:3000/')");

    const rewritten = rewriteReferencing(root, 'metrics', 'telemetry');
    assert.strictEqual(rewritten.length, 1);
    assert.strictEqual(rewritten[0].path, 'pats/TODOM-S02.cy.js');
    assert.strictEqual(
      rewritten[0].content,
      "cy.request('http://telemetry:3004/health')",
    );
  });

  test('replaces every occurrence of oldTerm', () => {
    seed(
      'TODOM-S02.cy.js',
      "cy.request('http://metrics:3004/').as('a');\ncy.request('http://metrics:3004/health').as('b')",
    );

    const rewritten = rewriteReferencing(root, 'metrics:3004', 'telemetry:3004');
    assert.strictEqual(rewritten.length, 1);
    assert.ok(!rewritten[0].content.includes('metrics:3004'));
    const occurrences = rewritten[0].content.split('telemetry:3004').length - 1;
    assert.strictEqual(occurrences, 2);
  });

  test('returns empty array when oldTerm is missing', () => {
    seed('TODOM-S02.cy.js', 'shell:3000');
    assert.deepStrictEqual(rewriteReferencing(root, '', 'telemetry'), []);
  });

  test('returns empty array when no spec contains oldTerm', () => {
    seed('TODOM-S02.cy.js', 'shell:3000');
    assert.deepStrictEqual(
      rewriteReferencing(root, 'metrics', 'telemetry'),
      [],
    );
  });

  test('returns empty array when pats/ does not exist', () => {
    rmSync(join(root, 'pats'), { recursive: true });
    assert.deepStrictEqual(
      rewriteReferencing(root, 'metrics', 'telemetry'),
      [],
    );
  });
});
