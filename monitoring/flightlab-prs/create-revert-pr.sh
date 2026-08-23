#!/usr/bin/env bash
set -euo pipefail

merge_sha="${1:?usage: $0 MERGED_SHA [TITLE]}"
title="${2:-Revert FlightLab rehearsal change}"
flightlab_repo="${FLIGHTLAB_REPO_PATH:?set FLIGHTLAB_REPO_PATH to a FlightLab checkout}"
base_branch="${FLIGHTLAB_BASE_BRANCH:-main}"

cd "$flightlab_repo"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "FlightLab working tree must be clean" >&2
  exit 1
fi

git fetch origin "$base_branch"
git switch "$base_branch"
git pull --ff-only origin "$base_branch"
branch="opssemble/revert/$(git rev-parse --short "$merge_sha")-$(date -u +%Y%m%d%H%M%S)"
git switch -c "$branch"
git revert --no-edit "$merge_sha"
git push -u origin "$branch"
gh pr create \
  --base "$base_branch" \
  --head "$branch" \
  --title "$title" \
  --body "Ordinary revert PR restoring the clean FlightLab rehearsal baseline."
