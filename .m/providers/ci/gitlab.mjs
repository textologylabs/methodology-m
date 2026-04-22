// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

/**
 * ci/gitlab — reference implementation of the `ci.*` namespace for
 * GitLab CI. Emits `.gitlab-ci.yml` and `scripts/report-shadow-status.sh`.
 *
 * Pure function of (project, scm). Same input → byte-identical output.
 * No filesystem reads, no timestamps, no randomness.
 *
 * Contract: see ./gitlab.md. Function signature matches
 * ci.render_pipeline from .m/providers/provider-interface.md.
 *
 * This module is the source of truth for gitlab CI rendering
 * behaviour. The SKILL.md describes the intent; the code here enforces
 * byte-level determinism.
 */

export function render_pipeline(project, scm) {
  if (scm !== 'gitlab') {
    throw new Error(
      `ci/gitlab requires scm='gitlab', got scm='${scm}'. `
      + `A non-gitlab SCM needs its own ci/* provider — .gitlab-ci.yml is `
      + `not portable across platforms.`,
    );
  }

  return [
    {
      path: '.gitlab-ci.yml',
      content: renderGitlabCI(project),
      mode: 0o644,
    },
    {
      path: 'scripts/detect-story-trigger.sh',
      content: renderDetectStoryTrigger(project),
      mode: 0o755,
    },
    {
      path: 'scripts/report-shadow-status.sh',
      content: renderReportShadowStatus(project),
      mode: 0o755,
    },
  ];
}

// ---------------------------------------------------------------------------
// Shared topology derivatives
// ---------------------------------------------------------------------------

function embeddedShell(project) {
  return project.components.find(
    (c) => c.type === 'embedded' && c.role === 'frontend-host',
  ) ?? null;
}

function referencedComponents(project) {
  return project.components.filter((c) => c.type === 'referenced');
}

function gitlabHost(project) {
  return project.scm?.host ?? 'gitlab.com';
}

function referencedRepoNames(project) {
  return referencedComponents(project).map((c) => `${project.project}-${c.name}`);
}

function stripLeadingDotSlash(path) {
  return path.startsWith('./') ? path.slice(2) : path;
}

// ---------------------------------------------------------------------------
// .gitlab-ci.yml
// ---------------------------------------------------------------------------

function renderGitlabCI(project) {
  const shell = embeddedShell(project);
  const sections = [
    renderHeader(project),
    renderWorkflow(),
    renderStages(shell !== null),
  ];

  if (shell) {
    sections.push(renderShellLifecycle(shell));
  }

  sections.push(renderOrchestration(project, shell !== null));

  return sections.join('\n\n') + '\n';
}

function renderHeader(project) {
  return [
    `# ${project.project}-root — M-type root repo pipeline`,
    `# Two concerns:`,
    `# 1. Shell lifecycle (install/build/test) — same pattern as managed repos`,
    `# 2. Orchestration (shadow integration, merge transaction, post-merge validation)`,
    ``,
    `image: node:20`,
  ].join('\n');
}

function renderWorkflow() {
  return [
    `workflow:`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `    - if: $CI_MERGE_REQUEST_IID`,
    `    - if: $CI_COMMIT_BRANCH == "main"`,
  ].join('\n');
}

function renderStages(hasShell) {
  const stages = [];
  if (hasShell) stages.push('install', 'build', 'test');
  stages.push('detect', 'compose', 'integration-test', 'report-status', 'merge-transaction');

  return ['stages:', ...stages.map((s) => `  - ${s}`)].join('\n');
}

function renderShellLifecycle(shell) {
  const loc = shell.location;
  const locNoDot = stripLeadingDotSlash(loc);
  return [
    `cache: &default_cache`,
    `  key: \${CI_COMMIT_REF_SLUG}`,
    `  paths:`,
    `    - node_modules/`,
    `    - ${locNoDot}/node_modules/`,
    `  policy: pull`,
    ``,
    `install:`,
    `  stage: install`,
    `  script:`,
    `    - npm ci`,
    `    - cd ${loc} && npm ci`,
    `  cache:`,
    `    <<: *default_cache`,
    `    policy: pull-push`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE != "trigger"`,
    ``,
    `build:`,
    `  stage: build`,
    `  script:`,
    `    - cd ${loc} && npm run build`,
    `  needs: [install]`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE != "trigger"`,
    ``,
    `test:`,
    `  stage: test`,
    `  script:`,
    `    - echo "Shell unit tests — placeholder (story-level Cypress runs in integration-test)"`,
    `  needs: [build]`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE != "trigger"`,
  ].join('\n');
}

function renderOrchestration(project, hasShell) {
  const group = project.group;
  const host = gitlabHost(project);
  const refRepos = referencedComponents(project);
  const cloneLines = refRepos.map((c) => {
    const repoName = `${project.project}-${c.name}`;
    return `    - git clone --depth 1 --branch main "https://gitlab-ci-token:\${CI_JOB_TOKEN}@${host}/\${GROUP}/${repoName}.git" ../${repoName}`;
  });

  // I-030: classify the trigger as story-MR-present vs standalone before
  // running any expensive shadow work. Writes STORY_ID to detect.env; when
  // empty, downstream shadow jobs early-exit so standalone MRs don't burn
  // through compose + integration-test for nothing.
  const shadowDetectTrigger = [
    `shadow:detect-trigger:`,
    `  stage: detect`,
    `  image: alpine:3.19`,
    `  before_script:`,
    `    - apk add --no-cache curl nodejs`,
    `  script:`,
    `    - sh scripts/detect-story-trigger.sh`,
    `  artifacts:`,
    `    reports:`,
    `      dotenv: detect.env`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

  // Skip-gate emitted at the top of every shadow:* job's script. Empty
  // STORY_ID means the detect step found no active story MRs in the
  // topology — treat as standalone, exit cleanly.
  const skipIfStandalone = [
    `    - |`,
    `      if [ -z "\${STORY_ID:-}" ]; then`,
    `        echo "Standalone trigger (no active story MR) — skipping shadow"`,
    `        exit 0`,
    `      fi`,
  ];

  const shadowCompose = [
    `shadow:compose:`,
    `  stage: compose`,
    `  image: docker:latest`,
    `  services:`,
    `    - docker:dind`,
    `  variables:`,
    `    DOCKER_TLS_CERTDIR: "/certs"`,
    `    GROUP: ${group}`,
    `  before_script:`,
    `    - apk add --no-cache git curl`,
    `  script:`,
    ...skipIfStandalone,
    `    - echo "Shadow compose for story $STORY_ID (triggered by $SOURCE_PROJECT_PATH)"`,
    `    - echo "Cloning sibling repos..."`,
    ...cloneLines,
    `    - echo "Building Docker images..."`,
    `    - docker compose build`,
    `    - echo "Starting containers..."`,
    `    - docker compose up -d`,
    `    - echo "Waiting for health endpoints..."`,
    `    - sh scripts/integration-test.sh`,
    `  after_script:`,
    `    - docker compose down 2>/dev/null || true`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

  const shadowIntegrationTest = [
    `shadow:integration-test:`,
    `  stage: integration-test`,
    `  script:`,
    ...skipIfStandalone,
    `    - npm run integration-test --if-present`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `    - job: shadow:compose`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

  const shadowReportStatus = [
    `shadow:report-status:`,
    `  stage: report-status`,
    `  script:`,
    ...skipIfStandalone,
    `    - sh scripts/report-shadow-status.sh success`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `    - job: shadow:integration-test`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `  when: on_success`,
  ].join('\n');

  const shadowReportFailure = [
    `shadow:report-failure:`,
    `  stage: report-status`,
    `  script:`,
    ...skipIfStandalone,
    `    - sh scripts/report-shadow-status.sh failed`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `    - job: shadow:compose`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `  when: on_failure`,
  ].join('\n');

  const mergeTransaction = [
    `merge-transaction:`,
    `  stage: merge-transaction`,
    `  script:`,
    ...skipIfStandalone,
    `    - npm run merge-transaction --if-present`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `      when: manual`,
    `  resource_group: distributed_merge`,
  ].join('\n');

  const validateCompose = [
    `validate:compose:`,
    `  stage: compose`,
    `  image: docker:latest`,
    `  services:`,
    `    - docker:dind`,
    `  variables:`,
    `    DOCKER_TLS_CERTDIR: "/certs"`,
    `    GROUP: ${group}`,
    `  before_script:`,
    `    - apk add --no-cache git curl`,
    `  script:`,
    `    - echo "Cloning sibling repos for Docker compose..."`,
    ...cloneLines,
    `    - echo "Building Docker images..."`,
    `    - docker compose build`,
    `    - echo "Starting containers..."`,
    `    - docker compose up -d`,
    `    - echo "Waiting for health endpoints..."`,
    `    - sh scripts/integration-test.sh`,
    `  after_script:`,
    `    - docker compose down 2>/dev/null || true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "merge_request_event"`,
    `    - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"`,
    `  needs: ${hasShell ? '[test]' : '[]'}`,
  ].join('\n');

  const validateIntegrationTest = [
    `validate:integration-test:`,
    `  stage: integration-test`,
    `  script:`,
    `    - npm run integration-test --if-present`,
    `  needs: [validate:compose]`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "merge_request_event"`,
    `    - if: $CI_COMMIT_BRANCH == "main" && $CI_PIPELINE_SOURCE != "trigger"`,
  ].join('\n');

  return [
    shadowDetectTrigger,
    shadowCompose,
    shadowIntegrationTest,
    shadowReportStatus,
    shadowReportFailure,
    mergeTransaction,
    validateCompose,
    validateIntegrationTest,
  ].join('\n\n');
}

// ---------------------------------------------------------------------------
// scripts/detect-story-trigger.sh
// ---------------------------------------------------------------------------

function renderDetectStoryTrigger(project) {
  const group = project.group;
  const host = gitlabHost(project);
  const repos = [`${project.project}-root`, ...referencedRepoNames(project)];
  const reposLine = repos.join(' ');
  const api = `https://${host}/api/v4`;
  const rootPath = `${group}/${project.project}-root`;
  const encodedRootPath = rootPath.replace(/\//g, '%2F');

  return `#!/bin/sh
# M shadow integration trigger classifier.
# Generated by ci/gitlab provider — do not edit by hand.
# Source of truth: project.yaml.
#
# Determines if this trigger corresponds to an active story MR (any open
# MR across the project's repos whose source branch references a story
# whose readiness tracker shows status != completed) or a standalone MR
# (no such match). Closes I-030.
#
# Emits STORY_ID=<id> to detect.env as a dotenv artifact. Downstream
# shadow:* jobs early-exit when STORY_ID is empty.

set -eu

if [ -z "\${M_GROUP_TOKEN:-}" ]; then
  echo "M_GROUP_TOKEN not set — cannot query MRs, aborting classification"
  exit 1
fi

API="${api}"
GROUP="${group}"
REPOS="${reposLine}"
ROOT_ENCODED_PATH="${encodedRootPath}"

STORY_ID=""

for repo in $REPOS; do
  PROJECT_PATH="$GROUP/$repo"
  ENCODED_PATH=$(printf '%s' "$PROJECT_PATH" | sed 's|/|%2F|g')

  MR_DATA=$(curl -sf \\
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
    "$API/projects/$ENCODED_PATH/merge_requests?state=opened&per_page=50" \\
    || echo "[]")

  CANDIDATES=$(printf '%s' "$MR_DATA" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (!Array.isArray(data)) process.exit(0);
    const seen = new Set();
    for (const mr of data) {
      const m = (mr.source_branch || '').match(/[A-Z]+-\\\\d+/);
      if (m && !seen.has(m[0])) { seen.add(m[0]); console.log(m[0]); }
    }
  ")

  for candidate in $CANDIDATES; do
    READINESS=$(curl -sf \\
      --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
      "$API/projects/$ROOT_ENCODED_PATH/repository/files/stories%2F$candidate.yaml/raw?ref=main" \\
      || echo "")

    if [ -z "$READINESS" ]; then
      echo "  $repo/$candidate: no readiness tracker in root repo — skipping"
      continue
    fi

    STATUS=$(printf '%s' "$READINESS" | grep -E '^status:' | awk '{print $2}' | tr -d '"')

    case "$STATUS" in
      ""|completed)
        echo "  $repo/$candidate: readiness status='$STATUS' — skipping"
        ;;
      *)
        echo "  $repo/$candidate: readiness status='$STATUS' — active story"
        STORY_ID="$candidate"
        break 2
        ;;
    esac
  done
done

if [ -n "$STORY_ID" ]; then
  echo ""
  echo "Active story detected: $STORY_ID"
else
  echo ""
  echo "Standalone trigger — no active story MRs found across the topology"
fi

echo "STORY_ID=$STORY_ID" > detect.env
`;
}

// ---------------------------------------------------------------------------
// scripts/report-shadow-status.sh
// ---------------------------------------------------------------------------

function renderReportShadowStatus(project) {
  const group = project.group;
  const host = gitlabHost(project);
  const repos = [`${project.project}-root`, ...referencedRepoNames(project)];
  const reposLine = repos.join(' ');
  const api = `https://${host}/api/v4`;

  return `#!/bin/sh
# Shadow integration status reporter.
# Generated by ci/gitlab provider — do not edit by hand.
# Source of truth: project.yaml.
#
# Usage: sh scripts/report-shadow-status.sh <state>
#   <state> is one of: success, failed, pending

set -eu

STATE="\${1:?state required: success|failed|pending}"

case "$STATE" in
  success) DESC="Shadow integration passed on root repo" ;;
  failed)  DESC="Shadow integration failed — check root repo pipeline" ;;
  pending) DESC="Shadow integration running" ;;
  *)
    echo "Unknown state: $STATE"
    exit 1
    ;;
esac

if [ -z "\${SOURCE_PROJECT_ID:-}" ]; then
  echo "No SOURCE_PROJECT_ID — skipping status report"
  exit 0
fi

if [ -z "\${M_GROUP_TOKEN:-}" ]; then
  echo "M_GROUP_TOKEN not set — cannot push commit statuses"
  exit 1
fi

echo "Reporting shadow integration status ($STATE) to $SOURCE_PROJECT_PATH"

REPOS="${reposLine}"
GROUP="${group}"
API="${api}"

for repo in $REPOS; do
  PROJECT_PATH="$GROUP/$repo"
  ENCODED_PATH=$(printf '%s' "$PROJECT_PATH" | sed 's|/|%2F|g')

  # Find the most recent open MR on this repo
  MR_DATA=$(curl -s \\
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
    "$API/projects/$ENCODED_PATH/merge_requests?state=opened&per_page=1")

  MR_SHA=$(printf '%s' "$MR_DATA" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (Array.isArray(data) && data.length > 0) console.log(data[0].sha);
  ")

  if [ -z "$MR_SHA" ]; then
    echo "  $repo: no open MR, skipping"
    continue
  fi

  echo "  $repo: pushing $STATE to commit $MR_SHA"
  curl -s --request POST \\
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
    "$API/projects/$ENCODED_PATH/statuses/$MR_SHA" \\
    --form "state=$STATE" \\
    --form "name=shadow-integration" \\
    --form "description=$DESC" \\
    --form "target_url=$CI_PIPELINE_URL" > /dev/null
done

echo "Shadow status fan-out complete."
`;
}
