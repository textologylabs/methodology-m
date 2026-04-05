#!/bin/bash
# m-checkpoint.sh — Create a checkpoint tag across all repos in an M-type project
#
# Usage:
#   ./scripts/m-checkpoint.sh <tag-name> [project-yaml-path]
#
# Example:
#   ./scripts/m-checkpoint.sh story-zero-complete
#   ./scripts/m-checkpoint.sh pre-todom-001 ref-projects/todo-m-workshop/pass1/todo-m-root/project.yaml
#
# Reads project.yaml to discover all repos, then creates an annotated tag
# on the current HEAD of main for each repo (root + all referenced components).

set -euo pipefail

TAG_NAME="${1:?Usage: m-checkpoint.sh <tag-name> [project-yaml-path]}"
PROJECT_YAML="${2:-ref-projects/todo-m-workshop/pass1/todo-m-root/project.yaml}"
PASS_DIR="$(dirname "$PROJECT_YAML")/.."

if [ ! -f "$PROJECT_YAML" ]; then
  echo "ERROR: project.yaml not found at $PROJECT_YAML"
  exit 1
fi

# Extract group and component locations from project.yaml
GROUP=$(grep '^group:' "$PROJECT_YAML" | awk '{print $2}')
ROOT_REPO="$PASS_DIR/todo-m-root"

echo "Creating checkpoint '$TAG_NAME' across all repos..."
echo "Group: $GROUP"
echo ""

# Tag root repo
if [ -d "$ROOT_REPO/.git" ]; then
  echo "→ todo-m-root"
  git -C "$ROOT_REPO" fetch origin main
  git -C "$ROOT_REPO" tag -a "$TAG_NAME" origin/main -m "Checkpoint: $TAG_NAME"
  git -C "$ROOT_REPO" push origin "$TAG_NAME"
  echo "  ✓ tagged"
else
  echo "  ✗ todo-m-root not found at $ROOT_REPO"
fi

# Tag each referenced component
for COMPONENT in mfe api-read api-write; do
  REPO_DIR="$PASS_DIR/todo-m-$COMPONENT"
  if [ -d "$REPO_DIR/.git" ]; then
    echo "→ todo-m-$COMPONENT"
    git -C "$REPO_DIR" fetch origin main
    git -C "$REPO_DIR" tag -a "$TAG_NAME" origin/main -m "Checkpoint: $TAG_NAME"
    git -C "$REPO_DIR" push origin "$TAG_NAME"
    echo "  ✓ tagged"
  else
    echo "  ✗ todo-m-$COMPONENT not found at $REPO_DIR"
  fi
done

echo ""
echo "Checkpoint '$TAG_NAME' created on all repos."
