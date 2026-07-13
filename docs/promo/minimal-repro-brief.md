# Demo brief: minimal repro bundle

## Hook

"Turn a failing local command into a sanitized repro bundle reviewers can unpack
and inspect."

## Recording outline

1. Show `examples/minimal/fail.mjs` and `examples/minimal/input.txt`.
2. Run `npm run build`.
3. Run `bash demo/run-minimal-bundle.sh`.
4. Open `tmp/minimal-repro-demo/repro/REPRO.md`.
5. Show `tmp/minimal-repro-demo/repro.tar.gz` as the shareable artifact.

## Social hooks

- Stop pasting giant logs into issues; ship a small local repro bundle.
- `bugrepro` captures the failure, selected fixtures, and redacted evidence.
- The failing command stays local. The reviewer gets `REPRO.md` and a manifest.

## Grounding notes

The demo uses the checked-in `examples/minimal` fixture. `bugrepro` does not
upload the bundle or run remote services.
