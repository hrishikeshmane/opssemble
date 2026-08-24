#!/usr/bin/env bash
set -euo pipefail

scenario="${1:-}"
case "$scenario" in
  smart-seat-bundles)
    title="Smart Seat Bundles"
    label="opssemble:smart-seat-bundles"
    ;;
  flexible-date-search)
    title="Flexible-Date Search"
    label="opssemble:flexible-date-search"
    ;;
  booking-timeout-retry)
    title="Booking Timeout Retry"
    label="opssemble:booking-timeout-retry"
    ;;
  *)
    echo "usage: $0 {smart-seat-bundles|flexible-date-search|booking-timeout-retry}" >&2
    exit 2
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
flightlab_repo="${FLIGHTLAB_REPO_PATH:-$script_dir/../../../flylab}"
clean_base_sha="${FLIGHTLAB_CLEAN_BASE_SHA:?set FLIGHTLAB_CLEAN_BASE_SHA to the merged cleanup SHA}"
base_branch="${FLIGHTLAB_BASE_BRANCH:-main}"

cd "$flightlab_repo"
actual_sha="$(git rev-parse HEAD)"
if [[ "$actual_sha" != "$clean_base_sha" ]]; then
  echo "FlightLab must be at clean base $clean_base_sha; found $actual_sha" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "FlightLab working tree must be clean" >&2
  exit 1
fi

git apply --check "$script_dir/$scenario.patch"
branch="opssemble/demo/$scenario-$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
git switch -c "$branch"
git apply "$script_dir/$scenario.patch"
npm test
rm -rf .next
npm run typecheck
npm run build
git add -A
git commit -m "demo: add $title"
git push -u origin "$branch"

gh label create "$label" --color 5319e7 --force
gh pr create \
  --base "$base_branch" \
  --head "$branch" \
  --title "$title" \
  --body "FlightLab executable change for the merge-driven Opssemble rehearsal. Runtime observations are generated externally." \
  --label "$label"
