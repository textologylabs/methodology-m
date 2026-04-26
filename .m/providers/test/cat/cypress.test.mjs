// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { compile_story_pat, spec_extension } from './cypress.mjs';

// ---------------------------------------------------------------------------
// PAT helpers — keep tests dense, one PAT-shaped object per test
// ---------------------------------------------------------------------------

function pat(steps, { story = 'TEST-001', acId = 'AC-001' } = {}) {
  return {
    story,
    version: 1,
    acceptance: [
      { id: acId, when: 'a thing happens', then: 'an outcome is observed', steps },
    ],
  };
}

describe('cypress.compile_story_pat — output shape', () => {
  test('returns { path, content, mode } with .cy.js path', () => {
    const out = compile_story_pat(pat([{ navigate: '/' }]));
    assert.strictEqual(out.path, 'pats/TEST-001.cy.js');
    assert.strictEqual(out.mode, 0o644);
    assert.strictEqual(typeof out.content, 'string');
    assert.strictEqual(spec_extension, '.cy.js');
  });

  test('rejects empty acceptance', () => {
    assert.throws(
      () => compile_story_pat({ story: 'X-1', version: 1, acceptance: [] }),
      /non-empty array/,
    );
  });

  test('rejects missing story (sub-task PAT not allowed at story-level entry point)', () => {
    assert.throws(
      () => compile_story_pat({ version: 1, acceptance: [{ id: 'AC-001', when: 'w', then: 't', steps: [{ navigate: '/' }] }] }),
      /pat\.story is required/,
    );
  });

  test('rejects malformed AC (no steps)', () => {
    assert.throws(
      () => compile_story_pat({
        story: 'X-1', version: 1,
        acceptance: [{ id: 'AC-001', when: 'w', then: 't', steps: [] }],
      }),
      /malformed acceptance criterion/,
    );
  });

  test('rejects step with multiple verb keys', () => {
    assert.throws(
      () => compile_story_pat(pat([{ navigate: '/', click: "[data-testid='x']" }])),
      /exactly one verb key/,
    );
  });

  test('rejects unknown verb', () => {
    assert.throws(
      () => compile_story_pat(pat([{ swerve: '/somewhere' }])),
      /unknown step verb/,
    );
  });
});

describe('cypress.compile_story_pat — browser steps (regression net)', () => {
  test('navigate compiles to cy.visit', () => {
    const { content } = compile_story_pat(pat([{ navigate: '/todos' }]));
    assert.match(content, /cy\.visit\('\/todos'\);/);
  });

  test('click compiles to cy.get(selector).click', () => {
    const { content } = compile_story_pat(pat([{ click: "[data-testid='add-btn']" }]));
    assert.match(content, /cy\.get\('\[data-testid="add-btn"\]'\)\.click\(\);/);
  });

  test('type compiles to cy.get(selector).type(text)', () => {
    const { content } = compile_story_pat(pat([{ type: "[data-testid='input'] value 'hello'" }]));
    assert.match(content, /cy\.get\('\[data-testid="input"\]'\)\.type\('hello'\);/);
  });

  test('assert is visible', () => {
    const { content } = compile_story_pat(pat([{ assert: "[data-testid='msg'] is visible" }]));
    assert.match(content, /cy\.get\('\[data-testid="msg"\]'\)\.should\('be\.visible'\);/);
  });

  test('assert is disabled', () => {
    const { content } = compile_story_pat(pat([{ assert: "[data-testid='btn'] is disabled" }]));
    assert.match(content, /cy\.get\('\[data-testid="btn"\]'\)\.should\('be\.disabled'\);/);
  });

  test("assert contains 'X' compiles to .should('contain', X)", () => {
    const { content } = compile_story_pat(pat([{ assert: "[data-testid='msg'] contains 'hi'" }]));
    assert.match(content, /cy\.get\('\[data-testid="msg"\]'\)\.should\('contain', 'hi'\);/);
  });

  test("assert contains '' compiles to .should('have.value', '') — pre-extraction empty-input semantic", () => {
    const { content } = compile_story_pat(pat([{ assert: "[data-testid='input'] contains ''" }]));
    assert.match(content, /cy\.get\('\[data-testid="input"\]'\)\.should\('have\.value', ''\);/);
  });

  test('assert count > N', () => {
    const { content } = compile_story_pat(pat([{ assert: "[data-testid='item'] count > 2" }]));
    assert.match(content, /cy\.get\('\[data-testid="item"\]'\)\.should\('have\.length\.greaterThan', 2\);/);
  });

  test('wait verb reuses assert compiler', () => {
    const { content } = compile_story_pat(pat([{ wait: "[data-testid='spinner'] is visible" }]));
    assert.match(content, /cy\.get\('\[data-testid="spinner"\]'\)\.should\('be\.visible'\);/);
  });

  test('render is rejected at story level', () => {
    assert.throws(
      () => compile_story_pat(pat([{ render: 'Component with mocked API' }])),
      /'render' step is invalid in story-level PATs/,
    );
  });
});

describe('cypress.compile_story_pat — http steps (I-045)', () => {
  test('GET with relative URL, no body', () => {
    const { content } = compile_story_pat(pat([{ http: 'GET /count' }]));
    assert.match(content, /cy\.request\('GET', '\/count'\)\.as\('lastResponse'\);/);
  });

  test('GET with absolute URL, no body', () => {
    const { content } = compile_story_pat(pat([{ http: 'GET http://api:3002/todos' }]));
    assert.match(content, /cy\.request\('GET', 'http:\/\/api:3002\/todos'\)\.as\('lastResponse'\);/);
  });

  test('POST with JSON body uses request-options form', () => {
    const { content } = compile_story_pat(pat([
      { http: "POST http://api:3002/todos body '{\"text\":\"buy milk\"}'" },
    ]));
    assert.match(content, /cy\.request\(\{ method: 'POST', url: 'http:\/\/api:3002\/todos', body: \{"text":"buy milk"\} \}\)\.as\('lastResponse'\);/);
  });

  test('PUT, PATCH, DELETE methods are accepted', () => {
    for (const verb of ['PUT', 'PATCH', 'DELETE']) {
      const { content } = compile_story_pat(pat([{ http: `${verb} /resource/1` }]));
      assert.match(content, new RegExp(`cy\\.request\\('${verb}', '/resource/1'\\)\\.as\\('lastResponse'\\);`));
    }
  });

  test('rejects unknown HTTP method', () => {
    assert.throws(
      () => compile_story_pat(pat([{ http: 'OPTIONS /x' }])),
      /malformed http step/,
    );
  });

  test('rejects missing URL', () => {
    assert.throws(
      () => compile_story_pat(pat([{ http: 'GET' }])),
      /malformed http step/,
    );
  });

  test('expect-status compiles to .its(status).should(equal, N)', () => {
    const { content } = compile_story_pat(pat([
      { http: 'GET /count' },
      { 'expect-status': 200 },
    ]));
    assert.match(content, /cy\.get\('@lastResponse'\)\.its\('status'\)\.should\('equal', 200\);/);
  });

  test('expect-status rejects non-integer', () => {
    assert.throws(
      () => compile_story_pat(pat([
        { http: 'GET /count' },
        { 'expect-status': '200' },
      ])),
      /expect-status must be an integer/,
    );
  });

  test('expect-body-contains coerces body to string before substring match', () => {
    const { content } = compile_story_pat(pat([
      { http: 'GET /count' },
      { 'expect-body-contains': '"count":0' },
    ]));
    assert.match(
      content,
      /cy\.get\('@lastResponse'\)\.its\('body'\)\.then\(\(b\) => expect\(typeof b === 'string' \? b : JSON\.stringify\(b\)\)\.to\.include\('"count":0'\)\);/,
    );
  });

  test('expect-body-contains escapes embedded backslashes', () => {
    const { content } = compile_story_pat(pat([
      { http: 'GET /count' },
      { 'expect-body-contains': 'a\\b' },
    ]));
    // Source must contain the doubly-escaped sequence so the runner sees a\b.
    assert.match(content, /\.to\.include\('a\\\\b'\)\);/);
  });
});

describe('cypress.compile_story_pat — mixed PAT (browser + http)', () => {
  test('AC-001 browser, AC-002 http compile in declared order to one .cy.js', () => {
    const out = compile_story_pat({
      story: 'TODOM-S01',
      version: 1,
      acceptance: [
        {
          id: 'AC-001',
          when: 'a user adds a todo',
          then: 'it appears in the list',
          steps: [
            { navigate: '/' },
            { type: "[data-testid='todo-input'] value 'buy milk'" },
            { click: "[data-testid='todo-add']" },
            { assert: "[data-testid='todo-item'] contains 'buy milk'" },
          ],
        },
        {
          id: 'AC-002',
          when: 'the analytics service is queried',
          then: 'the count reflects the new item',
          steps: [
            { http: 'GET http://analytics:3004/count' },
            { 'expect-status': 200 },
            { 'expect-body-contains': '"count":1' },
          ],
        },
      ],
    });

    assert.strictEqual(out.path, 'pats/TODOM-S01.cy.js');
    // Two it() blocks, one per AC, in declared order.
    const it1 = out.content.indexOf("it('AC-001:");
    const it2 = out.content.indexOf("it('AC-002:");
    assert.ok(it1 !== -1 && it2 !== -1 && it1 < it2, 'both AC blocks present in order');
    // Browser command from AC-001 lands before http call from AC-002.
    const visitIdx = out.content.indexOf('cy.visit(');
    const requestIdx = out.content.indexOf('cy.request(');
    assert.ok(visitIdx !== -1 && requestIdx !== -1 && visitIdx < requestIdx);
  });
});

describe('cypress.compile_story_pat — determinism', () => {
  test('same input → byte-identical output', () => {
    const input = pat([
      { navigate: '/' },
      { http: 'GET /count' },
      { 'expect-status': 200 },
    ]);
    const a = compile_story_pat(input).content;
    const b = compile_story_pat(input).content;
    assert.strictEqual(a, b);
  });

  test('AC and step order preserved (never sorted)', () => {
    const out = compile_story_pat({
      story: 'X-1',
      version: 1,
      acceptance: [
        { id: 'AC-002', when: 'w', then: 't', steps: [{ navigate: '/b' }] },
        { id: 'AC-001', when: 'w', then: 't', steps: [{ navigate: '/a' }] },
      ],
    });
    const ac002 = out.content.indexOf("AC-002:");
    const ac001 = out.content.indexOf("AC-001:");
    assert.ok(ac002 < ac001, 'declaration order preserved');
  });
});
