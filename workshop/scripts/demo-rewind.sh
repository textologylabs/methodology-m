#!/bin/sh
# demo-rewind.sh — Reset all repos to pre-demo state for TODOM-001
#
# Rewinds to story-zero-complete, applies patches to recreate the
# API and root feature branches, pushes them, and raises MRs.
#
# Run from: methodology-m repo root
# Requires: git, curl, jq
# Env: GITLAB_TOKEN (group PAT with api scope)
#
# Usage: sh workshop/scripts/demo-rewind.sh

set -eu

GITLAB_URL="https://gitlab.com"
API="${GITLAB_URL}/api/v4"
GROUP="methodology-m/todo-m-workshop"
CLONE_BASE="ref-projects/todo-m-workshop/pass1"
PATCHES="workshop/patches"

# Require GITLAB_TOKEN
if [ -z "${GITLAB_TOKEN:-}" ]; then
  echo "ERROR: Set GITLAB_TOKEN env var (group PAT with api scope)"
  exit 1
fi

# Helper: URL-encode a project path
encode() {
  echo "$1" | sed 's|/|%2F|g'
}

# Helper: close all open MRs on a project
close_open_mrs() {
  local PROJECT_PATH="$1"
  local ENCODED=$(encode "$PROJECT_PATH")
  echo "  Closing open MRs on ${PROJECT_PATH}..."

  MR_IIDS=$(curl -sf --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "${API}/projects/${ENCODED}/merge_requests?state=opened&per_page=100" \
    | jq -r '.[].iid' 2>/dev/null || echo "")

  for IID in $MR_IIDS; do
    curl -sf --request PUT \
      --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
      "${API}/projects/${ENCODED}/merge_requests/${IID}" \
      --data "state_event=close" > /dev/null 2>&1
    echo "    Closed MR !${IID}"
  done
}

# Helper: delete remote feature branches matching a pattern
delete_remote_branches() {
  local REPO_DIR="$1"
  local PATTERN="$2"
  echo "  Deleting remote branches matching ${PATTERN}..."

  BRANCHES=$(git -C "${REPO_DIR}" --no-pager branch -r \
    | grep "${PATTERN}" \
    | sed 's|origin/||' \
    | tr -d ' ' || true)

  for BRANCH in $BRANCHES; do
    git -C "${REPO_DIR}" push origin --delete "${BRANCH}" 2>/dev/null || true
    echo "    Deleted origin/${BRANCH}"
  done
}

# Helper: raise an MR
raise_mr() {
  local PROJECT_PATH="$1"
  local SOURCE_BRANCH="$2"
  local TITLE="$3"
  local ENCODED=$(encode "$PROJECT_PATH")

  echo "  Raising MR: ${TITLE}..."
  MR_URL=$(curl -sf --request POST \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "${API}/projects/${ENCODED}/merge_requests" \
    --data-urlencode "source_branch=${SOURCE_BRANCH}" \
    --data-urlencode "target_branch=main" \
    --data-urlencode "title=${TITLE}" \
    | jq -r '.web_url' 2>/dev/null || echo "FAILED")
  echo "    ${MR_URL}"
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Demo Rewind — TODOM-001"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Phase 1: Close existing MRs ───────────────────────
echo "Phase 1: Closing open MRs..."
close_open_mrs "${GROUP}/todo-m-root"
close_open_mrs "${GROUP}/todo-m-mfe"
close_open_mrs "${GROUP}/todo-m-api-read"
close_open_mrs "${GROUP}/todo-m-api-write"
echo ""

# ─── Phase 2: Force-reset all repos to story-zero-complete ───
echo "Phase 2: Rewinding repos to story-zero-complete..."
for REPO in todo-m-root todo-m-mfe todo-m-api-read todo-m-api-write; do
  REPO_DIR="${CLONE_BASE}/${REPO}"
  echo "  ${REPO}..."

  git -C "${REPO_DIR}" checkout main 2>/dev/null
  git -C "${REPO_DIR}" fetch --tags origin
  git -C "${REPO_DIR}" reset --hard story-zero-complete

  # Delete remote feature branches
  delete_remote_branches "${REPO_DIR}" "TODOM-001"

  # Force-push main
  git -C "${REPO_DIR}" push --force origin main
  echo "    ✓ reset to story-zero-complete"
done
echo ""

# ─── Phase 3: Apply patches and create feature branches ───
echo "Phase 3: Applying patches..."

# API Read
echo "  todo-m-api-read..."
REPO_DIR="${CLONE_BASE}/todo-m-api-read"
git -C "${REPO_DIR}" branch -D feat/TODOM-001-todo-list 2>/dev/null || true
git -C "${REPO_DIR}" checkout -b feat/TODOM-001-todo-list
git -C "${REPO_DIR}" am --keep-non-patch < "${PATCHES}/api-read-TODOM-001.patch"
git -C "${REPO_DIR}" push --force -u origin feat/TODOM-001-todo-list
echo "    ✓ branch created and pushed"

# API Write
echo "  todo-m-api-write..."
REPO_DIR="${CLONE_BASE}/todo-m-api-write"
git -C "${REPO_DIR}" branch -D feat/TODOM-001-add-todo 2>/dev/null || true
git -C "${REPO_DIR}" checkout -b feat/TODOM-001-add-todo
git -C "${REPO_DIR}" am --keep-non-patch < "${PATCHES}/api-write-TODOM-001.patch"
git -C "${REPO_DIR}" push --force -u origin feat/TODOM-001-add-todo
echo "    ✓ branch created and pushed"

# Root
echo "  todo-m-root..."
REPO_DIR="${CLONE_BASE}/todo-m-root"
git -C "${REPO_DIR}" branch -D feat/TODOM-001-integration-tests 2>/dev/null || true
git -C "${REPO_DIR}" checkout -b feat/TODOM-001-integration-tests
git -C "${REPO_DIR}" am --keep-non-patch < "${PATCHES}/root-TODOM-001.patch"
git -C "${REPO_DIR}" push --force -u origin feat/TODOM-001-integration-tests
echo "    ✓ branch created and pushed"

echo ""

# ─── Phase 4: Raise MRs ───────────────────────────────
echo "Phase 4: Raising MRs..."
raise_mr "${GROUP}/todo-m-api-read" \
  "feat/TODOM-001-todo-list" \
  "✨ TODOM-001a: GET /todos with SQLite persistence"

raise_mr "${GROUP}/todo-m-api-write" \
  "feat/TODOM-001-add-todo" \
  "✨ TODOM-001b: POST /todos with SQLite persistence"

raise_mr "${GROUP}/todo-m-root" \
  "feat/TODOM-001-integration-tests" \
  "feat: TODOM-001 story-level integration tests"

echo ""

# ─── Phase 5: Reset MFE to main (no feature branch) ───
echo "Phase 5: Ensuring MFE is clean on main..."
REPO_DIR="${CLONE_BASE}/todo-m-mfe"
git -C "${REPO_DIR}" checkout main 2>/dev/null
echo "  ✓ todo-m-mfe on main, no TODOM-001 branch"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Rewind complete!"
echo ""
echo "  State:"
echo "    - All repos at story-zero-complete"
echo "    - API MRs open (will fail — HEAD missing)"
echo "    - Root MR open (green — own pipeline only)"
echo "    - MFE clean on main (no TODOM-001 branch)"
echo ""
echo "  Wait 2-3 min for pipelines to settle, then"
echo "  verify API MRs show HEAD structural failure."
echo "═══════════════════════════════════════════════════"
