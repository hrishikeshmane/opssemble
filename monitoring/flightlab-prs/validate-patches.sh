#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
flightlab_repo="${FLIGHTLAB_REPO_PATH:-$script_dir/../../../flylab}"
clean_base_sha="${FLIGHTLAB_CLEAN_BASE_SHA:-}"

cd "$flightlab_repo"
if [[ -n "$clean_base_sha" && "$(git rev-parse HEAD)" != "$clean_base_sha" ]]; then
  echo "FlightLab HEAD does not match FLIGHTLAB_CLEAN_BASE_SHA" >&2
  exit 1
fi
for patch in "$script_dir"/*.patch; do
  git apply --check "$patch"
done
echo "all FlightLab PR patches apply cleanly"
