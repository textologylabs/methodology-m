import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync,
  existsSync, cpSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Paths relative to this test file
const CLI_ROOT = resolve(import.meta.dirname, '..');
const DIST_M = join(CLI_ROOT, 'dist-m');
const TEMPLATES = join(CLI_ROOT, 'templates');
const REF_PROJECT_YAML = resolve(
  CLI_ROOT, '..', 'ref-projects', 'todo-m-workshop', 'pass1',
  'todo-m-root', 'project.yaml',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmp() {
  return mkdtempSync(join(tmpdir(), 'm-test-'));
}

function cleanTmp(dir) {
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 1. version-file.mjs
// ---------------------------------------------------------------------------

describe('version-file', async () => {
  const { readInstalledVersion, writeInstalledVersion, readAvailableVersion } =
    await import('../src/lib/version-file.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('readInstalledVersion returns null when no .m-version', () => {
    assert.strictEqual(readInstalledVersion(tmp), null);
  });

  test('writeInstalledVersion then readInstalledVersion round-trips', () => {
    writeInstalledVersion(tmp, '1.2.3');
    assert.strictEqual(readInstalledVersion(tmp), '1.2.3');
  });

  test('.m-version file ends with newline', () => {
    writeInstalledVersion(tmp, '0.1.0');
    const raw = readFileSync(join(tmp, '.m-version'), 'utf8');
    assert.ok(raw.endsWith('\n'));
  });

  test('readAvailableVersion returns package.json version', () => {
    const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf8'));
    assert.strictEqual(readAvailableVersion(), pkg.version);
  });
});

// ---------------------------------------------------------------------------
// 2. detect-agent.mjs
// ---------------------------------------------------------------------------

describe('detect-agent', async () => {
  const { detectAgents } = await import('../src/lib/detect-agent.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('detects Claude when .claude/ exists', () => {
    mkdirSync(join(tmp, '.claude'));
    const agents = detectAgents(tmp);
    assert.ok(agents.includes('claude'));
  });

  test('detects Claude when CLAUDE.md exists', () => {
    writeFileSync(join(tmp, 'CLAUDE.md'), '# Claude');
    const agents = detectAgents(tmp);
    assert.ok(agents.includes('claude'));
  });

  test('detects Kiro when .kiro/ exists', () => {
    mkdirSync(join(tmp, '.kiro'));
    const agents = detectAgents(tmp);
    assert.ok(agents.includes('kiro'));
  });

  test('detects both Claude and Kiro', () => {
    mkdirSync(join(tmp, '.claude'));
    mkdirSync(join(tmp, '.kiro'));
    const agents = detectAgents(tmp);
    assert.deepStrictEqual(agents.sort(), ['claude', 'kiro']);
  });

  test('returns empty array when nothing detected', () => {
    assert.deepStrictEqual(detectAgents(tmp), []);
  });
});

// ---------------------------------------------------------------------------
// 3. diff-trees.mjs
// ---------------------------------------------------------------------------

describe('diff-trees', async () => {
  const { diffTrees, formatDiff } = await import('../src/lib/diff-trees.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  function makeTree(base, files) {
    mkdirSync(base, { recursive: true });
    for (const [rel, content] of Object.entries(files)) {
      const full = join(base, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    }
  }

  test('detects added files', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'x.md': 'hello' });
    makeTree(b, { 'x.md': 'hello', 'y.md': 'new' });
    const result = diffTrees(a, b);
    assert.deepStrictEqual(result.added, ['y.md']);
    assert.deepStrictEqual(result.removed, []);
    assert.deepStrictEqual(result.changed, []);
    assert.deepStrictEqual(result.unchanged, ['x.md']);
  });

  test('detects removed files', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'x.md': 'hello', 'old.md': 'gone' });
    makeTree(b, { 'x.md': 'hello' });
    const result = diffTrees(a, b);
    assert.deepStrictEqual(result.removed, ['old.md']);
    assert.deepStrictEqual(result.added, []);
  });

  test('detects changed files', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'x.md': 'version 1' });
    makeTree(b, { 'x.md': 'version 2' });
    const result = diffTrees(a, b);
    assert.deepStrictEqual(result.changed, ['x.md']);
    assert.deepStrictEqual(result.unchanged, []);
  });

  test('handles nested directories', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'sub/deep.md': 'a' });
    makeTree(b, { 'sub/deep.md': 'a', 'sub/new.md': 'b' });
    const result = diffTrees(a, b);
    assert.deepStrictEqual(result.added, ['sub/new.md']);
    assert.deepStrictEqual(result.unchanged, ['sub/deep.md']);
  });

  test('formatDiff shows "No differences." when identical', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'x.md': 'same' });
    makeTree(b, { 'x.md': 'same' });
    const result = diffTrees(a, b);
    assert.strictEqual(formatDiff(result), 'No differences.');
  });

  test('formatDiff includes summary line', () => {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    makeTree(a, { 'x.md': 'v1' });
    makeTree(b, { 'x.md': 'v2', 'y.md': 'new' });
    const result = diffTrees(a, b);
    const output = formatDiff(result);
    assert.ok(output.includes('+ y.md'));
    assert.ok(output.includes('~ x.md'));
    assert.ok(output.includes('2 file(s) differ'));
  });
});

// ---------------------------------------------------------------------------
// 4. topology.mjs
// ---------------------------------------------------------------------------

describe('topology', async () => {
  const { readTopology, getReferencedRepos } = await import('../src/lib/topology.mjs');

  test('readTopology parses real project.yaml', () => {
    const topo = readTopology(resolve(REF_PROJECT_YAML, '..'));
    assert.strictEqual(topo.project, 'todo-m');
    assert.strictEqual(topo.group, 'methodology-m/todo-m-workshop');
    assert.ok(Array.isArray(topo.components));
    assert.ok(topo.components.length >= 4);
  });

  test('readTopology finds embedded and referenced components', () => {
    const topo = readTopology(resolve(REF_PROJECT_YAML, '..'));
    const types = new Set(topo.components.map((c) => c.type));
    assert.ok(types.has('embedded'));
    assert.ok(types.has('referenced'));
  });

  test('getReferencedRepos filters only referenced components', () => {
    const topo = readTopology(resolve(REF_PROJECT_YAML, '..'));
    const repos = getReferencedRepos(topo);
    // The real project.yaml has 3 referenced repos: mfe, api-read, api-write
    assert.strictEqual(repos.length, 3);
    for (const r of repos) {
      assert.ok(r.name, 'each repo has a name');
      assert.ok(r.location, 'each repo has a location');
      assert.ok(r.repoName, 'each repo has a repoName');
    }
  });

  test('getReferencedRepos repoName is last segment of location', () => {
    const topo = readTopology(resolve(REF_PROJECT_YAML, '..'));
    const repos = getReferencedRepos(topo);
    for (const r of repos) {
      assert.strictEqual(r.repoName, r.location.split('/').pop());
    }
  });

  // Regression for I-059: a top-level `persistence:` block whose first key
  // is `type:` previously leaked into the last component, overwriting its
  // type and dropping it from getReferencedRepos.
  test('persistence: block after components: does not corrupt the last component', () => {
    const tmp = makeTmp();
    try {
      writeFileSync(join(tmp, 'project.yaml'), [
        'project: test',
        'group: example/group',
        'components:',
        '  - name: api-read',
        '    type: referenced',
        '    location: example/group/api-read',
        '  - name: api-write',
        '    type: referenced',
        '    location: example/group/api-write',
        'persistence:',
        '  type: sqlite',
        '  volume: data',
        '',
      ].join('\n'));
      const topo = readTopology(tmp);
      assert.strictEqual(topo.components.length, 2);
      assert.strictEqual(topo.components[1].name, 'api-write');
      assert.strictEqual(topo.components[1].type, 'referenced');
      assert.strictEqual(getReferencedRepos(topo).length, 2);
    } finally {
      cleanTmp(tmp);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. workspace.mjs
// ---------------------------------------------------------------------------

describe('workspace', async () => {
  const { generateWorkspace } = await import('../src/lib/workspace.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('generates valid JSON .code-workspace file', () => {
    const wsPath = generateWorkspace(tmp, 'my-project', ['root', 'api', 'web']);
    assert.ok(wsPath.endsWith('.code-workspace'));
    const content = JSON.parse(readFileSync(wsPath, 'utf8'));
    assert.ok(Array.isArray(content.folders));
    assert.strictEqual(content.folders.length, 3);
    assert.deepStrictEqual(content.folders[0], { name: 'root', path: 'root' });
  });

  test('workspace file is named after project', () => {
    const wsPath = generateWorkspace(tmp, 'todo-m', ['root']);
    assert.ok(wsPath.endsWith('todo-m.code-workspace'));
  });

  test('throws on unsupported IDE', () => {
    assert.throws(
      () => generateWorkspace(tmp, 'p', ['r'], { ide: 'jetbrains' }),
      /Unsupported IDE/,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. copy.mjs
// ---------------------------------------------------------------------------

describe('copy', async () => {
  const { copyDistM } = await import('../src/lib/copy.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('copies dist-m into .m/ directory', () => {
    const destDir = copyDistM(tmp);
    assert.strictEqual(destDir, join(tmp, '.m'));
    assert.ok(existsSync(join(tmp, '.m', 'm.md')));
    assert.ok(existsSync(join(tmp, '.m', 'CHANGELOG.md')));
  });

  test('copies capabilities subdirectory', () => {
    copyDistM(tmp);
    assert.ok(existsSync(join(tmp, '.m', 'capabilities')));
  });

  test('overwrites existing .m/ on second call', () => {
    copyDistM(tmp);
    // Modify a file
    writeFileSync(join(tmp, '.m', 'm.md'), 'modified');
    copyDistM(tmp);
    const content = readFileSync(join(tmp, '.m', 'm.md'), 'utf8');
    assert.notStrictEqual(content, 'modified');
  });
});

// ---------------------------------------------------------------------------
// 7. wrappers/claude.mjs
// ---------------------------------------------------------------------------

describe('wrappers/claude', async () => {
  const { generateClaudeWrappers } = await import('../src/lib/wrappers/claude.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('creates steering and individual skill wrappers when missing', () => {
    const { created, skipped } = generateClaudeWrappers(tmp);
    // 1 steering + 9 skills = 10 (compile-story-pats added in v0.6.0)
    assert.strictEqual(created.length, 10);
    assert.strictEqual(skipped.length, 0);
    assert.ok(existsSync(join(tmp, '.claude', 'steering', 'm-steering.md')));
    assert.ok(existsSync(join(tmp, '.claude', 'skills', 'scaffold-repo', 'SKILL.md')));
    assert.ok(existsSync(join(tmp, '.claude', 'skills', 'decompose-story', 'SKILL.md')));
    assert.ok(existsSync(join(tmp, '.claude', 'skills', 'compile-story-pats', 'SKILL.md')));
    assert.ok(existsSync(join(tmp, '.claude', 'skills', 'wire-orchestration', 'SKILL.md')));
  });

  test('skips files that already exist', () => {
    generateClaudeWrappers(tmp);
    const { created, skipped } = generateClaudeWrappers(tmp);
    assert.strictEqual(created.length, 0);
    assert.strictEqual(skipped.length, 10);
  });

  test('created files have content from templates with default mRoot', () => {
    generateClaudeWrappers(tmp);
    // Default mRoot is `.m`; templates carry `{{M_ROOT}}` placeholders
    // that must be substituted on write. The output is the substituted
    // template, not the raw template.
    const steering = readFileSync(
      join(tmp, '.claude', 'steering', 'm-steering.md'), 'utf8',
    );
    const template = readFileSync(
      join(TEMPLATES, 'claude', 'steering', 'm-steering.md'), 'utf8',
    );
    const expected = template.replaceAll('{{M_ROOT}}', '.m');
    assert.strictEqual(steering, expected);
    assert.ok(!steering.includes('{{M_ROOT}}'), 'token must be fully substituted');
    // Skill wrappers resolve to the project-scope canonical path.
    const skill = readFileSync(
      join(tmp, '.claude', 'skills', 'scaffold-repo', 'SKILL.md'), 'utf8',
    );
    assert.ok(skill.includes('.m/capabilities/scaffold-repo/SKILL.md'));
  });

  test('substitutes mRoot when provided (user-scope shape)', () => {
    // User-scope install passes an absolute path so the wrappers
    // resolve against the agent's user-level M, not the project's.
    generateClaudeWrappers(tmp, { mRoot: '~/.m' });
    const skill = readFileSync(
      join(tmp, '.claude', 'skills', 'scaffold-repo', 'SKILL.md'), 'utf8',
    );
    assert.ok(skill.includes('~/.m/capabilities/scaffold-repo/SKILL.md'));
    assert.ok(!skill.includes('{{M_ROOT}}'), 'token must be fully substituted');
    assert.ok(!skill.includes('`.m/'), 'no project-scope path should leak through');
  });
});

// ---------------------------------------------------------------------------
// 8. init command (end-to-end)
// ---------------------------------------------------------------------------

describe('init command', async () => {
  const { init } = await import('../src/commands/init.mjs');
  const { readInstalledVersion, readAvailableVersion } =
    await import('../src/lib/version-file.mjs');

  let tmp;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => { cleanTmp(tmp); });

  test('creates .m/ directory and .m-version', async () => {
    await init([tmp]);
    assert.ok(existsSync(join(tmp, '.m')));
    assert.ok(existsSync(join(tmp, '.m', 'm.md')));
    const installed = readInstalledVersion(tmp);
    assert.strictEqual(installed, readAvailableVersion());
  });

  test('generates Claude wrappers when .claude/ exists', async () => {
    mkdirSync(join(tmp, '.claude'));
    await init([tmp]);
    assert.ok(existsSync(join(tmp, '.claude', 'steering', 'm-steering.md')));
    assert.ok(existsSync(join(tmp, '.claude', 'skills', 'scaffold-repo', 'SKILL.md')));
  });

  test('does not generate wrappers when no agent runtime detected', async () => {
    await init([tmp]);
    assert.ok(!existsSync(join(tmp, '.claude', 'steering')));
    assert.ok(!existsSync(join(tmp, '.kiro')));
  });

  test('second init is idempotent (already installed)', async () => {
    await init([tmp]);
    // Capture console output
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await init([tmp]);
    } finally {
      console.log = origLog;
    }
    assert.ok(logs.some((l) => l.includes('already installed')));
  });
});

// ---------------------------------------------------------------------------
// 9. changelog command — extractVersion
// ---------------------------------------------------------------------------

describe('changelog', async () => {
  // extractVersion is not exported, so we test via the changelog command
  // by creating a mock CHANGELOG.md. But since changelog reads from dist-m/,
  // we test the logic by importing the module and calling changelog with
  // captured output.

  // We can test the extractVersion logic indirectly via the changelog command.
  // The changelog function reads dist-m/CHANGELOG.md which has version 0.3.0 and 0.2.0.

  test('extractVersion finds 0.3.0 section', async () => {
    // Read the real changelog and replicate extractVersion logic
    const changelogPath = join(DIST_M, 'CHANGELOG.md');
    const content = readFileSync(changelogPath, 'utf8');
    const section = extractVersionHelper(content, '0.3.0');
    assert.ok(section);
    assert.ok(section.startsWith('## [0.3.0]'));
    assert.ok(section.includes('Agent-neutral'));
    // Should NOT contain 0.2.0 section
    assert.ok(!section.includes('## [0.2.0]'));
  });

  test('extractVersion finds 0.2.0 section', async () => {
    const content = readFileSync(join(DIST_M, 'CHANGELOG.md'), 'utf8');
    const section = extractVersionHelper(content, '0.2.0');
    assert.ok(section);
    assert.ok(section.startsWith('## [0.2.0]'));
    assert.ok(section.includes('Initial M Power'));
  });

  test('extractVersion returns null for missing version', async () => {
    const content = readFileSync(join(DIST_M, 'CHANGELOG.md'), 'utf8');
    const section = extractVersionHelper(content, '9.9.9');
    assert.strictEqual(section, null);
  });

  test('extractVersion strips v prefix', async () => {
    const content = readFileSync(join(DIST_M, 'CHANGELOG.md'), 'utf8');
    const section = extractVersionHelper(content, 'v0.3.0');
    assert.ok(section);
    assert.ok(section.startsWith('## [0.3.0]'));
  });
});

// ---------------------------------------------------------------------------
// 10. update-check — compareVersions
// ---------------------------------------------------------------------------

describe('update-check / compareVersions', async () => {
  const { compareVersions } = await import('../src/lib/update-check.mjs');

  test('returns 0 for equal versions', () => {
    assert.strictEqual(compareVersions('1.2.3', '1.2.3'), 0);
  });

  test('returns positive when first is newer (patch)', () => {
    assert.ok(compareVersions('1.2.4', '1.2.3') > 0);
  });

  test('returns positive when first is newer (minor)', () => {
    assert.ok(compareVersions('1.3.0', '1.2.9') > 0);
  });

  test('returns positive when first is newer (major)', () => {
    assert.ok(compareVersions('2.0.0', '1.99.99') > 0);
  });

  test('returns negative when first is older', () => {
    assert.ok(compareVersions('0.12.1', '0.13.0') < 0);
  });

  test('treats missing components as zero', () => {
    assert.strictEqual(compareVersions('1.0', '1.0.0'), 0);
    assert.ok(compareVersions('1.0.1', '1.0') > 0);
  });

  test('maybeUpdate is a silent no-op when M_NO_UPDATE_CHECK=1', async () => {
    const { maybeUpdate } = await import('../src/lib/update-check.mjs');
    const prev = process.env.M_NO_UPDATE_CHECK;
    process.env.M_NO_UPDATE_CHECK = '1';
    try {
      // Must resolve without touching the network or stdin.
      await maybeUpdate();
    } finally {
      if (prev === undefined) delete process.env.M_NO_UPDATE_CHECK;
      else process.env.M_NO_UPDATE_CHECK = prev;
    }
  });
});

/**
 * Re-implementation of the extractVersion function from changelog.mjs
 * (it's not exported, so we duplicate the logic for testing).
 */
function extractVersionHelper(content, version) {
  const lines = content.split('\n');
  const normalized = version.replace(/^v/, '');
  let capturing = false;
  const result = [];

  for (const line of lines) {
    if (line.match(/^## /)) {
      if (capturing) break;
      if (line.includes(normalized)) {
        capturing = true;
      }
    }
    if (capturing) {
      result.push(line);
    }
  }

  return result.length ? result.join('\n').trim() : null;
}
