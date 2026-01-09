#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

DEFAULT_BRANCH=${DEFAULT_BRANCH:-main}
PUBLISH_BRANCH=${PUBLISH_BRANCH:-gh-pages}
WORKTREE_DIR="$ROOT_DIR/.gh-pages-worktree"
BUILD_DIR="$ROOT_DIR/out"
REPO_NAME=${REPO_NAME:-$(basename -s .git "$(git config --get remote.origin.url)")}
PAGES_REPO_SUFFIX=".github.io"

if [ -z "${NEXT_PUBLIC_BASE_PATH:-}" ]; then
  if [ -n "${CUSTOM_DOMAIN:-}" ] || [ -f "$ROOT_DIR/CNAME" ] || [ -f "$ROOT_DIR/public/CNAME" ]; then
    export NEXT_PUBLIC_BASE_PATH="/"
  elif [[ "$REPO_NAME" == *"$PAGES_REPO_SUFFIX" ]]; then
    export NEXT_PUBLIC_BASE_PATH="/"
  else
    echo "Error: NEXT_PUBLIC_BASE_PATH is not set. Set it to '/$REPO_NAME' for project pages or '/' for custom domains." >&2
    exit 1
  fi
fi

if [ "${ALLOW_DIRTY:-0}" != "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Error: working tree has uncommitted changes. Commit or stash before deploying, or rerun with ALLOW_DIRTY=1." >&2
    exit 1
  fi
fi

echo "→ Building static export via npm run export"
npm run export

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: build output directory '$BUILD_DIR' not found." >&2
  exit 1
fi

cleanup() {
  if git worktree list | awk '{print $1}' | grep -qx "$WORKTREE_DIR"; then
    git worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORKTREE_DIR"
}
trap cleanup EXIT

echo "→ Preparing worktree for branch '$PUBLISH_BRANCH'"
git fetch origin "$PUBLISH_BRANCH" >/dev/null 2>&1 || true

if git show-ref --verify --quiet "refs/heads/$PUBLISH_BRANCH"; then
  git worktree add --force "$WORKTREE_DIR" "$PUBLISH_BRANCH" >/dev/null
else
  git worktree add --force -B "$PUBLISH_BRANCH" "$WORKTREE_DIR" "$DEFAULT_BRANCH" >/dev/null
fi

rsync -a --delete "$BUILD_DIR"/ "$WORKTREE_DIR"/
touch "$WORKTREE_DIR/.nojekyll"

pushd "$WORKTREE_DIR" >/dev/null

git add --all
if git diff --cached --quiet; then
  echo "→ No changes to deploy."
else
  COMMIT_MSG=${COMMIT_MSG:-"Deploy static site"}
  echo "→ Committing and pushing changes to '$PUBLISH_BRANCH'"
  git commit -m "$COMMIT_MSG" >/dev/null
  git push origin "$PUBLISH_BRANCH"
  echo "→ Deployment complete."
fi

popd >/dev/null
