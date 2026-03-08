#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${1:-main}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
  echo "Refusing to sync while on base branch '$BASE_BRANCH'. Checkout your feature branch first."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No 'origin' remote configured. Add a remote first:"
  echo "  git remote add origin <repo-url>"
  exit 1
fi

echo "Fetching latest from origin..."
git fetch origin "$BASE_BRANCH"

echo "Rebasing '$CURRENT_BRANCH' on origin/$BASE_BRANCH..."
if git rebase "origin/$BASE_BRANCH"; then
  echo "Rebase complete."
else
  echo
  echo "Rebase stopped due to conflicts."
  echo "Resolve conflicts, then run:"
  echo "  git add <resolved-files>"
  echo "  git rebase --continue"
  echo
  echo "Or abort with:"
  echo "  git rebase --abort"
  exit 1
fi

echo "Pushing updated branch (force-with-lease)..."
git push --force-with-lease origin "$CURRENT_BRANCH"

echo "Done. Your PR branch is now synced with origin/$BASE_BRANCH."
