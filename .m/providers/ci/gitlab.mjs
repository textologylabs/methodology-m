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
    {
      path: 'scripts/bump-topology.sh',
      content: renderBumpTopology(project),
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
  stages.push('detect', 'compose', 'integration-test', 'report-status', 'merge-transaction', 'bump-topology');

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

  // I-030: classify the trigger via the URL `EVENT_KIND` variable
  // (`mr` | `pipeline`). MR events are delivered by the managed repo's
  // MR webhook; pipeline-failure events are delivered by the managed
  // repo's `report-failure-to-root` CI job (I-056) — pipeline-events
  // webhooks pointed at the trigger endpoint are 403-blocked by GitLab.
  // Writes STORY_ID + TRIGGER_MODE to detect.env. TRIGGER_MODE is one of:
  //   - `story`             — active story MR in the topology; run full AOT
  //   - `pipeline-failure`  — managed-repo pipeline failed on a story branch; fan out `failed`
  //   - `standalone`        — no active story MR; skip all shadow work
  // Downstream shadow:* jobs skip unless the trigger mode matches their role.
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

  // Skip-gate emitted at the top of every shadow:* job's script. The job
  // only runs when shadow:detect-trigger emitted TRIGGER_MODE equal to
  // the expected mode for this job; otherwise exit cleanly.
  const skipUnlessMode = (mode) => [
    `    - |`,
    `      if [ "\${TRIGGER_MODE:-standalone}" != "${mode}" ]; then`,
    `        echo "TRIGGER_MODE=\${TRIGGER_MODE:-standalone} — skipping (this job runs only on TRIGGER_MODE=${mode})"`,
    `        exit 0`,
    `      fi`,
  ];

  // I-031: pre-AOT invalidation. Pushes `pending` to every open story MR
  // so stale green can't race the gate while compose + integration-test
  // run. shadow:compose needs this to guarantee ordering.
  const shadowInvalidateStatus = [
    `shadow:invalidate-status:`,
    `  stage: detect`,
    `  image: alpine:3.19`,
    `  before_script:`,
    `    - apk add --no-cache curl nodejs`,
    `  script:`,
    ...skipUnlessMode('story'),
    `    - echo "Invalidating shadow-integration status (pending) for story $STORY_ID"`,
    `    - sh scripts/report-shadow-status.sh pending`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

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
    ...skipUnlessMode('story'),
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
    `    - job: shadow:invalidate-status`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

  const shadowIntegrationTest = [
    `shadow:integration-test:`,
    `  stage: integration-test`,
    `  script:`,
    ...skipUnlessMode('story'),
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
    ...skipUnlessMode('story'),
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
    ...skipUnlessMode('story'),
    `    - sh scripts/report-shadow-status.sh failed`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `    - job: shadow:compose`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `  when: on_failure`,
  ].join('\n');

  // I-032: managed-repo pipeline failure fan-out. When shadow:detect-trigger
  // classifies the trigger as pipeline-failure (EVENT_KIND=pipeline webhook
  // fired by a managed-repo pipeline that failed on an active story branch),
  // skip compose + integration-test entirely and push `failed` to every
  // sibling story MR. Closes the latency window where sibling MRs retain
  // stale green until the next MR event.
  const shadowFanoutFailure = [
    `shadow:fanout-failure:`,
    `  stage: report-status`,
    `  image: alpine:3.19`,
    `  before_script:`,
    `    - apk add --no-cache curl nodejs`,
    `  script:`,
    ...skipUnlessMode('pipeline-failure'),
    `    - echo "Managed-repo pipeline failure on story $STORY_ID — fanning out failed status to siblings"`,
    `    - sh scripts/report-shadow-status.sh failed`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
  ].join('\n');

  const mergeTransaction = [
    `merge-transaction:`,
    `  stage: merge-transaction`,
    `  script:`,
    ...skipUnlessMode('story'),
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

  // I-004: auto-bump topology on managed-repo tag events. Triggered
  // when shadow:detect-trigger emits TRIGGER_MODE=bump-topology
  // (EVENT_KIND=tag webhook fired by a managed-repo auto-tag job).
  // Mutates project.yaml to pin the component to the new tag,
  // appends a [Topology bumps] entry to CHANGELOG.md, and opens a
  // chore/bump-<component>-<tag> MR against main. Resource group
  // serialises concurrent bumps so two managed repos tagging at
  // once produce two ordered MRs rather than racing.
  const shadowBumpTopology = [
    `shadow:bump-topology:`,
    `  stage: bump-topology`,
    `  image: alpine:3.19`,
    `  variables:`,
    `    GROUP: ${group}`,
    `  before_script:`,
    `    - apk add --no-cache git curl nodejs`,
    `    - git config --global user.email "m-bump-topology@methodology-m"`,
    `    - git config --global user.name "M bump-topology"`,
    `  script:`,
    ...skipUnlessMode('bump-topology'),
    `    - echo "Auto-bump topology for $SOURCE_PROJECT_PATH → $NEW_TAG"`,
    `    - sh scripts/bump-topology.sh "$SOURCE_PROJECT_PATH" "$NEW_TAG"`,
    `  needs:`,
    `    - job: shadow:detect-trigger`,
    `      artifacts: true`,
    `  rules:`,
    `    - if: $CI_PIPELINE_SOURCE == "trigger"`,
    `  resource_group: bump_topology`,
  ].join('\n');

  return [
    shadowDetectTrigger,
    shadowInvalidateStatus,
    shadowCompose,
    shadowIntegrationTest,
    shadowReportStatus,
    shadowReportFailure,
    shadowFanoutFailure,
    mergeTransaction,
    shadowBumpTopology,
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
# Branches on the EVENT_KIND URL variable. Two delivery paths:
#   - EVENT_KIND=mr        — set by the MR webhook installed on each
#                            managed repo by wire-orchestration
#   - EVENT_KIND=pipeline  — set by the managed repo's
#                            report-failure-to-root CI job (I-056);
#                            pipeline-events webhooks are 403-blocked
#                            at GitLab's trigger endpoint
# Emits STORY_ID=<id> and TRIGGER_MODE=<mode> to detect.env as a
# dotenv artifact. Downstream shadow:* jobs gate on TRIGGER_MODE:
#   story            — active story MR present; run full AOT (I-030)
#   pipeline-failure — managed-repo pipeline failed on an active story
#                      branch; fan out failed status to siblings (I-032)
#   standalone       — no active story MR; skip all shadow work (I-030)
#
# Classification semantics (I-055 — Option Y, v0.9.0):
#
# Active-story detection is based on LIVE open-MR enumeration across
# the topology. An open MR whose branch references a story ID is the
# proof that the story is in flight. The readiness tracker
# (stories/<id>.yaml) is orchestration metadata for merge-transaction,
# not a classification input — it lives on the story's gate MR branch
# during development and only lands on main at story completion.
#
# The tracker on main is consulted ONLY to distinguish follow-up MRs
# targeting already-completed stories (hotfix/TODOM-001-x on a merged
# story) from in-flight story MRs. If the tracker on main shows
# status=complete, the trigger is treated as standalone. In every
# other case (tracker absent from main, or present with a non-complete
# status), the story is treated as active.

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
TRIGGER_MODE="standalone"

# Resolve readiness for a candidate story ID against the root repo's
# stories/<id>.yaml tracker. Echoes the status field (empty if missing).
readiness_status() {
  candidate="$1"
  data=$(curl -sf \\
    --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
    "$API/projects/$ROOT_ENCODED_PATH/repository/files/stories%2F$candidate.yaml/raw?ref=main" \\
    || echo "")
  if [ -z "$data" ]; then
    echo ""
    return
  fi
  printf '%s' "$data" | grep -E '^status:' | awk '{print $2}' | tr -d '"'
}

EVENT_KIND="\${EVENT_KIND:-mr}"
echo "Trigger classification: EVENT_KIND=$EVENT_KIND"

# Source-repo guard (v0.12.x REMOVE — I-040 follow-up): if the trigger
# originated from a repo NOT in the current topology, classify as
# standalone immediately. Eliminates spurious shadow runs from orphan
# managed repos whose webhooks remain installed after a REMOVE story
# merged. SOURCE_PROJECT_PATH is set by the webhook URL config (mr
# events) and by the report-failure-to-root job (pipeline events); when
# absent we trust the legacy enumeration path below.
if [ -n "\${SOURCE_PROJECT_PATH:-}" ]; then
  source_repo=$(printf '%s' "$SOURCE_PROJECT_PATH" | awk -F/ '{print $NF}')
  source_in_topology=0
  for repo in $REPOS; do
    if [ "$repo" = "$source_repo" ]; then
      source_in_topology=1
      break
    fi
  done
  if [ "$source_in_topology" -eq 0 ]; then
    echo "Trigger source ($SOURCE_PROJECT_PATH) is not in current topology — classifying as standalone (orphan repo? see I-061 unwire-orchestration)"
    echo "STORY_ID=" > detect.env
    echo "TRIGGER_MODE=standalone" >> detect.env
    exit 0
  fi
fi

if [ "$EVENT_KIND" = "tag" ]; then
  # I-004: managed-repo auto-tag fan-in. Triggered by the
  # report-tag-to-root job in scaffold-repo's managed-repo template
  # when an auto-tag job pushes a new annotated tag. Routes to
  # shadow:bump-topology which mutates project.yaml and opens a
  # chore/bump-<comp>-<tag> MR. Fully orthogonal to the story flow.
  if [ -z "\${NEW_TAG:-}" ] || [ -z "\${SOURCE_PROJECT_PATH:-}" ]; then
    echo "tag event without NEW_TAG or SOURCE_PROJECT_PATH — treating as standalone"
  else
    echo "  tag event: $SOURCE_PROJECT_PATH → $NEW_TAG"
    TRIGGER_MODE="bump-topology"
  fi
elif [ "$EVENT_KIND" = "pipeline" ]; then
  # I-032: webhook fired by a managed-repo pipeline event. Query the
  # source project's recent pipelines for the most recent failure, and
  # if its ref encodes an active story ID, fan out failure to siblings.
  # Success/running pipelines and failures on non-story branches fall
  # through to standalone and no shadow work runs.
  if [ -z "\${SOURCE_PROJECT_ID:-}" ]; then
    echo "pipeline event without SOURCE_PROJECT_ID — treating as standalone"
  else
    PIPELINE_DATA=$(curl -sf \\
      --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
      "$API/projects/$SOURCE_PROJECT_ID/pipelines?per_page=10" \\
      || echo "[]")

    FAILED_REF=$(printf '%s' "$PIPELINE_DATA" | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      if (!Array.isArray(data)) process.exit(0);
      const fail = data.find((p) => p.status === 'failed');
      if (fail && fail.ref) console.log(fail.ref);
    ")

    if [ -z "$FAILED_REF" ]; then
      echo "  no failed pipelines in recent history on source project — skipping"
    else
      CANDIDATE=$(printf '%s' "$FAILED_REF" | grep -oE '[A-Z]+-[0-9]+' | head -1 || echo "")
      if [ -z "$CANDIDATE" ]; then
        echo "  failed pipeline on '$FAILED_REF' — ref does not encode a story ID, skipping"
      else
        STATUS=$(readiness_status "$CANDIDATE")
        case "$STATUS" in
          completed)
            echo "  failed pipeline on '$FAILED_REF' → $CANDIDATE: tracker on main shows status=complete — stale pipeline on a merged story, skipping"
            ;;
          *)
            # Tracker absent from main (in-flight story) or present with a
            # non-completed status. Failing pipeline on an active story
            # branch — fan out failure to sibling story MRs.
            echo "  failed pipeline on '$FAILED_REF' → $CANDIDATE: active story (tracker status='$STATUS') — fanning out failure"
            STORY_ID="$CANDIDATE"
            TRIGGER_MODE="pipeline-failure"
            ;;
        esac
      fi
    fi
  fi
else
  # EVENT_KIND=mr (default) — I-030 story-vs-standalone classification.
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
      STATUS=$(readiness_status "$candidate")
      case "$STATUS" in
        completed)
          echo "  $repo/$candidate: tracker on main shows status=complete — follow-up MR to a merged story, skipping"
          ;;
        "")
          # No tracker on main. Active story — the open MR we enumerated IS
          # the proof. Tracker lives on the gate MR branch until completion.
          echo "  $repo/$candidate: active story (open MR present; no completion record on main)"
          STORY_ID="$candidate"
          TRIGGER_MODE="story"
          break 2
          ;;
        *)
          # Non-completed status on main (e.g. in-progress or pending).
          # Story is still active.
          echo "  $repo/$candidate: active story (tracker on main with status='$STATUS')"
          STORY_ID="$candidate"
          TRIGGER_MODE="story"
          break 2
          ;;
      esac
    done
  done
fi

echo ""
case "$TRIGGER_MODE" in
  story)
    echo "Active story detected: $STORY_ID (mode=story)"
    ;;
  pipeline-failure)
    echo "Pipeline failure on story: $STORY_ID (mode=pipeline-failure)"
    ;;
  bump-topology)
    echo "Auto-tag fan-in: $SOURCE_PROJECT_PATH → $NEW_TAG (mode=bump-topology)"
    ;;
  standalone)
    echo "Standalone trigger — no shadow work (mode=standalone)"
    ;;
esac

echo "STORY_ID=$STORY_ID" > detect.env
echo "TRIGGER_MODE=$TRIGGER_MODE" >> detect.env
echo "NEW_TAG=\${NEW_TAG:-}" >> detect.env
echo "SOURCE_PROJECT_PATH=\${SOURCE_PROJECT_PATH:-}" >> detect.env
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

// ---------------------------------------------------------------------------
// scripts/bump-topology.sh
// ---------------------------------------------------------------------------

function renderBumpTopology(project) {
  const group = project.group;
  const host = gitlabHost(project);
  const api = `https://${host}/api/v4`;
  const rootRepo = `${project.project}-root`;
  const rootPath = `${group}/${rootRepo}`;
  const encodedRootPath = rootPath.replace(/\//g, '%2F');
  const projectPrefix = `${project.project}-`;

  return `#!/bin/sh
# Topology auto-bump script (I-004).
# Generated by ci/gitlab provider — do not edit by hand.
# Source of truth: project.yaml.
#
# Invoked by shadow:bump-topology when shadow:detect-trigger
# classifies the trigger as TRIGGER_MODE=bump-topology
# (EVENT_KIND=tag fan-in from a managed-repo auto-tag job).
#
# Usage: sh scripts/bump-topology.sh <SOURCE_PROJECT_PATH> <NEW_TAG>
#   SOURCE_PROJECT_PATH: e.g. methodology-m/todo-m-workshop/todo-m-metrics
#   NEW_TAG:             e.g. v0.1.4
#
# Side effects:
#   - Mutates project.yaml on a fresh chore/bump-<comp>-<tag> branch
#   - Appends a [Topology bumps] line to CHANGELOG.md
#   - Pushes the branch
#   - Opens a MR against main
#
# Resource group on the calling job (bump_topology) ensures only one
# bump runs at a time, so concurrent tags from two managed repos
# produce two ordered MRs rather than racing.

set -eu

SOURCE_PROJECT_PATH="\${1:?SOURCE_PROJECT_PATH required}"
NEW_TAG="\${2:?NEW_TAG required}"

if [ -z "\${M_GROUP_TOKEN:-}" ]; then
  echo "M_GROUP_TOKEN not set — cannot push branch / open MR"
  exit 1
fi

API="${api}"
ROOT_PATH="${rootPath}"
ROOT_ENCODED_PATH="${encodedRootPath}"
PROJECT_PREFIX="${projectPrefix}"

# Derive component name. SOURCE_PROJECT_PATH is "<group>/<project>-<comp>";
# the component is the last path segment with the project prefix stripped.
LAST_SEG=$(printf '%s' "$SOURCE_PROJECT_PATH" | awk -F/ '{print $NF}')
COMPONENT="\${LAST_SEG#$PROJECT_PREFIX}"

if [ "$COMPONENT" = "$LAST_SEG" ]; then
  echo "Source repo '$LAST_SEG' does not start with project prefix '$PROJECT_PREFIX' — cannot derive component name"
  exit 1
fi

echo "Bumping component '$COMPONENT' to tag '$NEW_TAG'"

# Sanitise tag for branch name: replace dots with dashes (v0.1.4 → v0-1-4).
SAFE_TAG=$(printf '%s' "$NEW_TAG" | tr '.' '-')
BRANCH="chore/bump-$COMPONENT-$SAFE_TAG"

# Clone root with write auth.
CLONE_URL="https://oauth2:$M_GROUP_TOKEN@${host}/$ROOT_PATH.git"
WORK_DIR=$(mktemp -d)
git clone --depth 5 --branch main "$CLONE_URL" "$WORK_DIR/root"
cd "$WORK_DIR/root"
git checkout -b "$BRANCH"

# Update project.yaml: set components[name=<comp>].tag = <new>.
# Regex anchors on the component stanza: "- name: <comp>" through the
# next "- name:" or section boundary. Inside that range, replace the
# first "tag: <anything>" with "tag: <new>".
node -e "
const fs = require('fs');
let yaml = fs.readFileSync('project.yaml', 'utf8');
const comp = process.argv[1];
const newTag = process.argv[2];
// Match: '  - name: <comp>' up through the next stanza or top-level header.
const re = new RegExp(
  '(- name: ' + comp.replace(/[.*+?^\${}()|[\\\\]\\\\\\\\]/g, '\\\\\\\\\$&') + '\\\\b[\\\\s\\\\S]*?\\\\btag: )([^\\\\n]*)',
  '',
);
const m = yaml.match(re);
if (!m) {
  console.error('Component \\\\'' + comp + '\\\\' not found in project.yaml — refusing to bump');
  process.exit(1);
}
const updated = yaml.replace(re, '\$1' + newTag);
if (updated === yaml) {
  console.error('No-op replacement (tag already at ' + newTag + '?) — exiting');
  process.exit(0);
}
fs.writeFileSync('project.yaml', updated);
console.log('project.yaml updated: ' + comp + '.tag = ' + newTag + ' (was ' + m[2] + ')');
" "$COMPONENT" "$NEW_TAG"

# Append CHANGELOG entry under [Unreleased] [Topology bumps]. If no
# [Unreleased] section exists, create one. If no [Topology bumps]
# subsection exists under [Unreleased], create it.
node -e "
const fs = require('fs');
const path = 'CHANGELOG.md';
let cl = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '# Changelog\\n\\n';
const comp = process.argv[1];
const newTag = process.argv[2];
const line = '- Component \\\\\\\`' + comp + '\\\\\\\`: bumped to \\\\\\\`' + newTag + '\\\\\\\`.\\n';
if (!cl.match(/^## \\\\[Unreleased\\\\]/m)) {
  // Insert an [Unreleased] section after the top-level header.
  cl = cl.replace(/(^# [^\\n]*\\n+)/, '\$1## [Unreleased]\\n\\n### [Topology bumps]\\n\\n' + line + '\\n');
} else if (!cl.match(/## \\\\[Unreleased\\\\][\\\\s\\\\S]*?### \\\\[Topology bumps\\\\]/)) {
  cl = cl.replace(/(## \\\\[Unreleased\\\\]\\n+)/, '\$1### [Topology bumps]\\n\\n' + line + '\\n');
} else {
  // Append to existing [Topology bumps] block.
  cl = cl.replace(/(### \\\\[Topology bumps\\\\]\\n+(?:- [^\\n]*\\n)*)/, '\$1' + line);
}
fs.writeFileSync(path, cl);
console.log('CHANGELOG.md updated');
" "$COMPONENT" "$NEW_TAG"

git add project.yaml CHANGELOG.md
git commit -m "🔧 Topology: bump $COMPONENT to $NEW_TAG"
git push origin "$BRANCH"

# Open MR via GitLab API.
TITLE="🔧 Topology: bump $COMPONENT to $NEW_TAG"
DESCRIPTION="Auto-generated by shadow:bump-topology (I-004) in pipeline #$CI_PIPELINE_ID after $SOURCE_PROJECT_PATH tagged $NEW_TAG."

curl -fsSL --request POST \\
  --header "PRIVATE-TOKEN: $M_GROUP_TOKEN" \\
  --header "Content-Type: application/json" \\
  --data "{\\\"source_branch\\\":\\\"$BRANCH\\\",\\\"target_branch\\\":\\\"main\\\",\\\"title\\\":\\\"$TITLE\\\",\\\"description\\\":\\\"$DESCRIPTION\\\"}" \\
  "$API/projects/$ROOT_ENCODED_PATH/merge_requests" > /dev/null

echo "Bump MR opened against main: $BRANCH"
`;
}
