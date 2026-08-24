# FlightLab PR portfolio

These patches add executable FlightLab behavior to the cleanup baseline. They contain no scenario manifests, provider-shaped fixtures, or mock telemetry. The server sends only the neutral signed runtime envelope already present on the baseline.

Set `FLIGHTLAB_CLEAN_BASE_SHA` to the merged cleanup PR SHA and optionally `FLIGHTLAB_REPO_PATH`, then run:

```bash
./monitoring/flightlab-prs/create-pr.sh booking-timeout-retry
```

The command refuses a dirty or mismatched checkout, applies one deterministic patch, runs FlightLab tests/typechecking/build, pushes a unique branch, and opens a PR with exactly one Opssemble routing label. It does not merge the PR. After a rehearsal, use `create-revert-pr.sh MERGED_SHA`; the reset is an ordinary unlabeled revert PR and never rewrites history.

The booking patch intentionally omits the commit-then-timeout regression test. Its success and pre-commit failure tests stay green while the response-timeout path retries with a new attempt key. The downstream repair agent must add that missing regression in its real repair PR.
