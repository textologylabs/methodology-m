// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * test/cat/cypress — reference implementation of the `test.cat.*`
 * namespace. Compiles a story-level PAT yaml into a Cypress spec.
 *
 * Pure function of the parsed PAT. Same input → byte-identical
 * output. No filesystem reads, no timestamps, no randomness.
 *
 * Contract: see ./cypress.md. Function signature matches
 * test.cat.compile_story_pat from .m/providers/provider-interface.md.
 *
 * This module is the source of truth for PAT → Cypress compilation
 * behaviour. The SKILL.md of compile-story-pats describes the agent
 * flow around it; the code here enforces byte-level determinism on
 * the compile step itself.
 */

export const spec_extension = '.cy.js';

/**
 * Compile a story-level PAT into a Cypress spec.
 *
 * @param {object} pat Parsed PAT yaml. Must have `story` and `acceptance[]`.
 * @returns {{ path: string, content: string, mode: number }}
 */
export function compile_story_pat(pat) {
  if (!pat || typeof pat !== 'object') {
    throw new Error('cypress.compile_story_pat: pat must be an object');
  }
  if (!pat.story) {
    throw new Error('cypress.compile_story_pat: pat.story is required (story-level PAT expected)');
  }
  if (!Array.isArray(pat.acceptance) || pat.acceptance.length === 0) {
    throw new Error('cypress.compile_story_pat: pat.acceptance must be a non-empty array');
  }

  return {
    path: `pats/${pat.story}${spec_extension}`,
    content: renderSpec(pat),
    mode: 0o644,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderSpec(pat) {
  const lines = [];
  lines.push(`describe('${escapeSingle(pat.story)}', () => {`);
  for (let i = 0; i < pat.acceptance.length; i++) {
    if (i > 0) lines.push('');
    renderAc(lines, pat.acceptance[i]);
  }
  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

function renderAc(lines, ac) {
  if (!ac.id || !ac.when || !ac.then || !Array.isArray(ac.steps) || ac.steps.length === 0) {
    throw new Error(`cypress.compile_story_pat: malformed acceptance criterion (id=${ac.id ?? '?'})`);
  }
  const title = `${ac.id}: ${ac.when} → ${ac.then}`;
  lines.push(`  it('${escapeSingle(title)}', () => {`);
  for (const step of ac.steps) {
    lines.push(`    ${compileStep(step)}`);
  }
  lines.push('  });');
}

function compileStep(step) {
  if (!step || typeof step !== 'object') {
    throw new Error('cypress.compile_story_pat: step must be an object');
  }
  const keys = Object.keys(step);
  if (keys.length !== 1) {
    throw new Error(`cypress.compile_story_pat: step must have exactly one verb key, got ${keys.length}`);
  }
  const [verb] = keys;
  const value = step[verb];

  switch (verb) {
    case 'navigate':
      return `cy.visit('${escapeSingle(value)}');`;
    case 'click':
      return `cy.get(${selectorArg(value)}).click();`;
    case 'type':
      return compileType(value);
    case 'assert':
    case 'wait':
      return compileAssertOrWait(value);
    case 'http':
      return compileHttp(value);
    case 'expect-status':
      return compileExpectStatus(value);
    case 'expect-body-contains':
      return compileExpectBodyContains(value);
    case 'render':
      throw new Error(
        `cypress.compile_story_pat: 'render' step is invalid in story-level PATs ` +
        `(sub-task PATs only; use generate-acceptance-tests for repo-level compilation)`,
      );
    default:
      throw new Error(`cypress.compile_story_pat: unknown step verb '${verb}'`);
  }
}

function compileType(value) {
  // Format: [data-testid='X'] value 'Y'
  const m = value.match(/^\[data-testid='([^']+)'] value '([^']*)'$/);
  if (!m) {
    throw new Error(`cypress.compile_story_pat: malformed type step: ${value}`);
  }
  const [, testid, text] = m;
  return `cy.get('[data-testid="${testid}"]').type('${escapeSingle(text)}');`;
}

function compileAssertOrWait(value) {
  // Supported forms (see pat.schema.json step-assert / step-wait):
  //   [data-testid='X'] is visible
  //   [data-testid='X'] is disabled
  //   [data-testid='X'] contains 'Y'
  //   [data-testid='X'] count > N
  const m = value.match(/^\[data-testid='([^']+)']\s+(.+)$/);
  if (!m) {
    throw new Error(`cypress.compile_story_pat: malformed assert/wait step: ${value}`);
  }
  const [, testid, rest] = m;
  const sel = `cy.get('[data-testid="${testid}"]')`;

  if (rest === 'is visible') return `${sel}.should('be.visible');`;
  if (rest === 'is disabled') return `${sel}.should('be.disabled');`;

  const containsMatch = rest.match(/^contains '([^']*)'$/);
  if (containsMatch) {
    const text = containsMatch[1];
    // Empty string is almost always used for "this input is empty", which
    // is a value check rather than a text-containment check. Preserve the
    // pre-extraction decompose-story Step 4a behaviour.
    if (text === '') return `${sel}.should('have.value', '');`;
    return `${sel}.should('contain', '${escapeSingle(text)}');`;
  }

  const countMatch = rest.match(/^count > (\d+)$/);
  if (countMatch) return `${sel}.should('have.length.greaterThan', ${countMatch[1]});`;

  throw new Error(`cypress.compile_story_pat: unsupported assert/wait predicate: ${rest}`);
}

function compileHttp(value) {
  // Format: <METHOD> <url>[ body '<json>']
  const m = value.match(/^(GET|POST|PUT|PATCH|DELETE) (\S+)(?: body '([^']*)')?$/);
  if (!m) {
    throw new Error(`cypress.compile_story_pat: malformed http step: ${value}`);
  }
  const [, method, url, body] = m;
  if (body === undefined) {
    return `cy.request('${method}', '${escapeSingle(url)}').as('lastResponse');`;
  }
  // Body is JSON; embedded directly as a JS object literal (JSON ⊂ JS).
  return `cy.request({ method: '${method}', url: '${escapeSingle(url)}', body: ${body} }).as('lastResponse');`;
}

function compileExpectStatus(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`cypress.compile_story_pat: expect-status must be an integer, got ${JSON.stringify(value)}`);
  }
  return `cy.get('@lastResponse').its('status').should('equal', ${value});`;
}

function compileExpectBodyContains(value) {
  if (typeof value !== 'string') {
    throw new Error(`cypress.compile_story_pat: expect-body-contains must be a string`);
  }
  // Body may be a string or an object — coerce to JSON text for substring match.
  return `cy.get('@lastResponse').its('body').then((b) => expect(typeof b === 'string' ? b : JSON.stringify(b)).to.include('${escapeSingle(value)}'));`;
}

function selectorArg(value) {
  // Input form is [data-testid='X'] — no outer quotes (yaml-valid).
  const m = value.match(/^\[data-testid='([^']+)']$/);
  if (!m) {
    throw new Error(`cypress.compile_story_pat: malformed selector: ${value}`);
  }
  return `'[data-testid="${m[1]}"]'`;
}

function escapeSingle(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
