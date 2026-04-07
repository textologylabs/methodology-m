 #!/bin/bash
# m-rewind.sh — Rewind all repos in an M-type project to a checkpoint tag
#
# Usage:
#   ./scripts/m-rewind.sh <tag-name> [project-yaml-path]
#
# Example:
#   ./scripts/m-rewind.sh story-zero-complete
#
# For each repo (root + referenced components):
# 1. Force-resets main to the checkpoint tag
# 2. Force-pushes main to origin
# 3. Deletes all branches except main
# 4. Closes any open MRs via GitLab API
#
# WARNING: This is destructive. It rewrites history on all repos.
# Only use for workshop replay, never on a real project.

set -euo pipefail

TAG_NAME="${1:?Usage: m-rewind.sh <tag-name> [project-yaml-path]}"
PROJECT_YAML="${2:-ref-projects/todo-m-workshop/pass1/todo-m-root/project.yaml}"
PASS_DIR="$(dirname "$PROJECT_YAML")/.."

if [ ! -f "$PROJECT_YAML" ]; then
  echo "ERROR: project.yaml not found at $PROJECT_YAML"
  exit 1
fi

GROUP=$(grep '^group:' "$PROJECT_YAML" | awk '{print $2}')

echo "⚠️  REWINDING all repos to checkpoint '$TAG_NAME'"
echo "    Group: $GROUP"
echo "    This is DESTRUCTIVE — main will be force-pushed."
echo ""
read -p "Are you sure? (yes/no) " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""

rewind_repo() {
  local REPO_NAME="$1"
  local REPO_DIR="$2"
  local PROJECT_PATH="$GROUP/$REPO_NAME"

  if [ ! -d "$REPO_DIR/.git" ]; then
    echo "  ✗ $REPO_NAME not found at $REPO_DIR — skipping"
    return
  fi

  echo "→ $REPO_NAME"

  # Fetch latest tags
  git -C "$REPO_DIR" fetch origin --tags

  # Verify tag exists
  if ! git -C "$REPO_DIR" rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "  ✗ tag '$TAG_NAME' not found — skipping"
    return
  fi

  # Checkout main and reset to tag
  git -C "$REPO_DIR" checkout main 2>/dev/null || git -C "$REPO_DIR" checkout -b main "origin/main"
  git -C "$REPO_DIR" reset --hard "$TAG_NAME"
  git -C "$REPO_DIR" push origin main --force
  echo "  ✓ main reset to $TAG_NAME"

  # Delete all local branches except main
  LOCAL_BRANCHES=$(git -C "$REPO_DIR" branch | grep -v '^\* main$' | grep -v '^  main$' | sed 's/^[* ]*//' || true)
  if [ -n "$LOCAL_BRANCHES" ]; then
    echo "$LOCAL_BRANCHES" | while read -r branch; do
      git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
    done
    echo "  ✓ local branches cleaned"
  fi

  # Delete remote branches except main
  REMOTE_BRANCHES=$(git -C "$REPO_DIR" ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' | grep -v '^main$' || true)
  if [ -n "$REMOTE_BRANCHES" ]; then
    echo "$REMOTE_BRANCHES" | while read -r branch; do
      git -C "$REPO_DIR" push origin --delete "$branch" 2>/dev/null || true
    done
    echo "  ✓ remote branches cleaned"
  fi

  echo "  ✓ done"
}

rewind_repo "todo-m-root" "$PASS_DIR/todo-m-root"
rewind_repo "todo-m-mfe" "$PASS_DIR/todo-m-mfe"
rewind_repo "todo-m-api-read" "$PASS_DIR/todo-m-api-read"
rewind_repo "todo-m-api-write" "$PASS_DIR/todo-m-api-write"

echo ""
echo "All repos rewound to '$TAG_NAME'. Ready for replay."
