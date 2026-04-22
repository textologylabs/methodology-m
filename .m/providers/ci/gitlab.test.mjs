import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from '../../vendor/js-yaml.mjs';
import { render_pipeline } from './gitlab.mjs';

const FIXTURES = resolve(import.meta.dirname, '..', '..', 'test-fixtures');

function loadFixture(name) {
  return yaml.load(readFileSync(resolve(FIXTURES, name), 'utf8'));
}

function filesByPath(files) {
  return Object.fromEntries(files.map((f) => [f.path, f]));
}

/**
 * Extract a single top-level job block from a rendered .gitlab-ci.yml.
 * Jobs in the provider are joined with '\n\n', so block ends at the next
 * blank line. Append a sentinel blank line so the last job still matches.
 */
function extractJobBlock(yml, jobName) {
  const escaped = jobName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const padded = yml + '\n\n';
  const m = padded.match(new RegExp(`^${escaped}:\\n([\\s\\S]*?)\\n\\n`, 'm'));
  if (!m) throw new Error(`Job '${jobName}' not found in yaml`);
  return m[1];
}

describe('ci/gitlab — render_pipeline', () => {
  test('returns .gitlab-ci.yml, detect-story-trigger.sh, report-shadow-status.sh', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = render_pipeline(project, 'gitlab');
    const paths = files.map((f) => f.path).sort();
    assert.deepStrictEqual(paths, [
      '.gitlab-ci.yml',
      'scripts/detect-story-trigger.sh',
      'scripts/report-shadow-status.sh',
    ]);
  });

  test('both generated shell scripts have executable mode (0o755)', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = filesByPath(render_pipeline(project, 'gitlab'));
    assert.strictEqual(files['scripts/report-shadow-status.sh'].mode, 0o755);
    assert.strictEqual(files['scripts/detect-story-trigger.sh'].mode, 0o755);
  });

  test('.gitlab-ci.yml has non-executable mode (0o644)', () => {
    const project = loadFixture('todo-m-base.yaml');
    const files = filesByPath(render_pipeline(project, 'gitlab'));
    assert.strictEqual(files['.gitlab-ci.yml'].mode, 0o644);
  });

  test('rejects non-gitlab scm', () => {
    const project = loadFixture('todo-m-base.yaml');
    assert.throws(
      () => render_pipeline(project, 'github'),
      /ci\/gitlab requires scm='gitlab'/,
    );
  });
});

describe('.gitlab-ci.yml — header and preamble', () => {
  test('header includes project name and M-type annotation', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^# todo-m-root — M-type root repo pipeline\n/);
  });

  test('pins node:20 image', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^image: node:20$/m);
  });

  test('workflow rules include trigger + MR + main', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /- if: \$CI_PIPELINE_SOURCE == "trigger"/);
    assert.match(yml.content, /- if: \$CI_MERGE_REQUEST_IID/);
    assert.match(yml.content, /- if: \$CI_COMMIT_BRANCH == "main"/);
  });
});

describe('.gitlab-ci.yml — shell lifecycle (embedded frontend-host present)', () => {
  test('stages include install/build/test + detect + orchestration', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    const stagesBlock = yml.content.match(/^stages:\n([\s\S]*?)(?:\n\n|\ncache:)/m)[1];
    const stages = stagesBlock.split('\n').map((l) => l.replace(/^ +- /, '').trim()).filter(Boolean);
    assert.deepStrictEqual(stages, [
      'install', 'build', 'test',
      'detect', 'compose', 'integration-test', 'report-status', 'merge-transaction',
    ]);
  });

  test('install/build/test jobs present', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^install:$/m);
    assert.match(yml.content, /^build:$/m);
    assert.match(yml.content, /^test:$/m);
  });

  test('cache references shell location without leading ./', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /paths:\n +- node_modules\/\n +- packages\/shell\/node_modules\//);
  });

  test('install script uses shell location with ./ prefix', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /cd \.\/packages\/shell && npm ci/);
    assert.match(yml.content, /cd \.\/packages\/shell && npm run build/);
  });

  test('validate:compose needs [test] when shell lifecycle is present', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /validate:compose:[\s\S]*?needs: \[test\]/);
  });
});

describe('.gitlab-ci.yml — no embedded frontend-host', () => {
  test('stages omit install/build/test but still include detect + orchestration', () => {
    const project = loadFixture('todo-m-no-shell.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    const stagesBlock = yml.content.match(/^stages:\n([\s\S]*?)(?=\n\w|\nshadow:)/m)[1];
    const stages = stagesBlock.split('\n').map((l) => l.replace(/^ +- /, '').trim()).filter(Boolean);
    assert.deepStrictEqual(stages, [
      'detect', 'compose', 'integration-test', 'report-status', 'merge-transaction',
    ]);
  });

  test('install/build/test jobs absent', () => {
    const project = loadFixture('todo-m-no-shell.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.doesNotMatch(yml.content, /^install:$/m);
    assert.doesNotMatch(yml.content, /^build:$/m);
    assert.doesNotMatch(yml.content, /^test:$/m);
  });

  test('validate:compose needs [] when no shell lifecycle', () => {
    const project = loadFixture('todo-m-no-shell.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /validate:compose:[\s\S]*?needs: \[\]/);
  });
});

describe('.gitlab-ci.yml — orchestration jobs', () => {
  test('shadow:detect-trigger, shadow:compose, shadow:integration-test, shadow:report-{status,failure} all present', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^shadow:detect-trigger:$/m);
    assert.match(yml.content, /^shadow:compose:$/m);
    assert.match(yml.content, /^shadow:integration-test:$/m);
    assert.match(yml.content, /^shadow:report-status:$/m);
    assert.match(yml.content, /^shadow:report-failure:$/m);
  });

  test('merge-transaction job uses resource_group distributed_merge', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^merge-transaction:$/m);
    assert.match(yml.content, /resource_group: distributed_merge/);
  });

  test('validate:compose and validate:integration-test both emitted', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /^validate:compose:$/m);
    assert.match(yml.content, /^validate:integration-test:$/m);
  });

  test('GROUP variable substituted in job variables block', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(yml.content, /GROUP: methodology-m\/todo-m-workshop/);
  });
});

describe('.gitlab-ci.yml — I-030 story-vs-standalone gating', () => {
  test('shadow:detect-trigger lives on the detect stage and emits a dotenv artifact', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    const detectBlock = yml.content.match(/^shadow:detect-trigger:([\s\S]*?)(?=^shadow:compose:)/m)[1];
    assert.match(detectBlock, /\n {2}stage: detect\n/);
    assert.match(detectBlock, /sh scripts\/detect-story-trigger\.sh/);
    assert.match(detectBlock, /\n {2}artifacts:\n {4}reports:\n {6}dotenv: detect\.env\n/);
    assert.match(detectBlock, /\n {4}- if: \$CI_PIPELINE_SOURCE == "trigger"/);
  });

  test('every shadow:* job early-exits when STORY_ID is empty', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    const gated = ['shadow:compose', 'shadow:integration-test', 'shadow:report-status', 'shadow:report-failure', 'merge-transaction'];
    for (const name of gated) {
      const block = extractJobBlock(yml.content, name);
      assert.match(
        block,
        /if \[ -z "\$\{STORY_ID:-\}" \]; then/,
        `${name} is missing the STORY_ID skip-gate`,
      );
      assert.match(
        block,
        /Standalone trigger \(no active story MR\) — skipping shadow/,
        `${name} skip-gate must explain what it's skipping`,
      );
    }
  });

  test('gated shadow jobs consume the detect dotenv via needs: artifacts', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    for (const name of ['shadow:compose', 'shadow:integration-test', 'shadow:report-status', 'shadow:report-failure', 'merge-transaction']) {
      const block = extractJobBlock(yml.content, name);
      assert.match(
        block,
        /needs:\n(?: {4}-[^\n]+\n(?: {6}[^\n]+\n)*)* {4}- job: shadow:detect-trigger\n {6}artifacts: true/,
        `${name} must need shadow:detect-trigger with artifacts`,
      );
    }
  });

  test('detect-story-trigger.sh queries all managed repos plus root', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/detect-story-trigger.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(sh.content, /^#!\/bin\/sh\n/);
    assert.match(sh.content, /Generated by ci\/gitlab provider — do not edit by hand\./);
    assert.match(
      sh.content,
      /^REPOS="todo-m-root todo-m-mfe todo-m-api-read todo-m-api-write"$/m,
    );
    assert.match(sh.content, /^ROOT_ENCODED_PATH="methodology-m%2Ftodo-m-workshop%2Ftodo-m-root"$/m);
  });

  test('detect script looks up readiness tracker and checks status', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/detect-story-trigger.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(sh.content, /stories%2F\$candidate\.yaml\/raw\?ref=main/);
    assert.match(sh.content, /grep -E '\^status:'/);
    assert.match(sh.content, /\|completed\)/);
  });

  test('detect script regex-extracts any story ID from branch names', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/detect-story-trigger.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    // Authority-based detection: any [A-Z]+-\d+ pattern, no prefix convention.
    assert.match(sh.content, /\[A-Z\]\+-/);
    assert.match(sh.content, /source_branch/);
  });

  test('detect script writes STORY_ID to detect.env for downstream dotenv artifact', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/detect-story-trigger.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(sh.content, /^echo "STORY_ID=\$STORY_ID" > detect\.env$/m);
  });
});

describe('.gitlab-ci.yml — clone lines', () => {
  test('one clone line per referenced component in declaration order', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    // Extract clone lines from the shadow:compose job.
    const shadowBlock = yml.content.match(/^shadow:compose:([\s\S]*?)(?=^shadow:integration-test:)/m)[1];
    const cloneLines = shadowBlock.split('\n').filter((l) => l.includes('git clone'));
    assert.strictEqual(cloneLines.length, 3);
    assert.ok(cloneLines[0].includes('todo-m-mfe'));
    assert.ok(cloneLines[1].includes('todo-m-api-read'));
    assert.ok(cloneLines[2].includes('todo-m-api-write'));
  });

  test('clone lines use gitlab-ci-token with CI_JOB_TOKEN', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(
      yml.content,
      /git clone --depth 1 --branch main "https:\/\/gitlab-ci-token:\$\{CI_JOB_TOKEN\}@gitlab\.com\/\$\{GROUP\}\/todo-m-mfe\.git" \.\.\/todo-m-mfe/,
    );
  });

  test('TODOM-S01 adds analytics clone line at the end', () => {
    const project = loadFixture('todo-m-s01.yaml');
    const { '.gitlab-ci.yml': yml } = filesByPath(render_pipeline(project, 'gitlab'));
    const shadowBlock = yml.content.match(/^shadow:compose:([\s\S]*?)(?=^shadow:integration-test:)/m)[1];
    const cloneLines = shadowBlock.split('\n').filter((l) => l.includes('git clone'));
    assert.strictEqual(cloneLines.length, 4);
    assert.ok(cloneLines[3].includes('todo-m-analytics'));
  });
});

describe('report-shadow-status.sh', () => {
  test('POSIX shebang and do-not-edit header', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/report-shadow-status.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.ok(sh.content.startsWith('#!/bin/sh\n'));
    assert.match(sh.content, /Generated by ci\/gitlab provider — do not edit by hand\./);
  });

  test('REPOS= line lists root + referenced components in declaration order', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/report-shadow-status.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(
      sh.content,
      /^REPOS="todo-m-root todo-m-mfe todo-m-api-read todo-m-api-write"$/m,
    );
  });

  test('GROUP= and API= lines substituted from project.yaml', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/report-shadow-status.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(sh.content, /^GROUP="methodology-m\/todo-m-workshop"$/m);
    assert.match(sh.content, /^API="https:\/\/gitlab\.com\/api\/v4"$/m);
  });

  test('REPOS grows with TODOM-S01 analytics component', () => {
    const project = loadFixture('todo-m-s01.yaml');
    const { 'scripts/report-shadow-status.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(
      sh.content,
      /^REPOS="todo-m-root todo-m-mfe todo-m-api-read todo-m-api-write todo-m-analytics"$/m,
    );
  });

  test('uses curl + REST against GitLab API', () => {
    const project = loadFixture('todo-m-base.yaml');
    const { 'scripts/report-shadow-status.sh': sh } = filesByPath(render_pipeline(project, 'gitlab'));
    assert.match(sh.content, /curl -s --request POST/);
    assert.match(sh.content, /--header "PRIVATE-TOKEN: \$M_GROUP_TOKEN"/);
    assert.match(sh.content, /\/statuses\/\$MR_SHA/);
  });
});

describe('determinism', () => {
  test('two invocations with the same input produce byte-identical output', () => {
    const project = loadFixture('todo-m-with-persistence.yaml');
    const run1 = render_pipeline(project, 'gitlab');
    const run2 = render_pipeline(project, 'gitlab');
    for (const i of [0, 1]) {
      assert.strictEqual(run1[i].path, run2[i].path);
      assert.strictEqual(run1[i].content, run2[i].content);
      assert.strictEqual(run1[i].mode, run2[i].mode);
    }
  });
});
