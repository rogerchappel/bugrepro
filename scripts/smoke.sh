#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cp -R "$repo_root/tests/fixtures/project/." "$tmp_dir/"
(
  cd "$tmp_dir"
  set +e
  node "$repo_root/dist/cli.js" capture --out repro --fixture input.txt -- node fail.mjs > capture.json
  status=$?
  set -e
  [ "$status" -eq 7 ] || { echo "expected capture to return failing command status 7, got $status" >&2; exit 1; }
  grep -q '"exitCode":7' capture.json
  grep -q '\[REDACTED:SECRET\]' repro/repro.json
  test -f repro/REPRO.md
  test -f repro/fixtures/input.txt
  node "$repo_root/dist/cli.js" pack repro --out repro.tar.gz > pack.json
  test -s repro.tar.gz
  printf 'password=hunter2\n' | node "$repo_root/dist/cli.js" redact > redacted.txt
  grep -q '\[REDACTED:SECRET\]' redacted.txt
)

echo "bugrepro smoke ok"
