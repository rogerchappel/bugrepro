#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/tmp/minimal-repro-demo}"

rm -rf "$out_dir"
mkdir -p "$out_dir"

set +e
node "$repo_root/dist/cli.js" capture \
  --out "$out_dir/repro" \
  --fixture "$repo_root/examples/minimal/input.txt" \
  -- node "$repo_root/examples/minimal/fail.mjs" > "$out_dir/capture.json"
status=$?
set -e

if [ "$status" -ne 2 ]; then
  echo "expected fixture command to exit 2, got $status" >&2
  exit 1
fi

node "$repo_root/dist/cli.js" pack "$out_dir/repro" --out "$out_dir/repro.tar.gz" > "$out_dir/pack.json"

grep -q '"exitCode":2' "$out_dir/capture.json"
grep -q "Repro bundle" "$out_dir/repro/REPRO.md"
test -s "$out_dir/repro.tar.gz"

echo "wrote minimal repro bundle to $out_dir"
