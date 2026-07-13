# Capture a minimal repro bundle

This tutorial uses the checked-in `examples/minimal` fixture to capture a
failing command, copy one input file, and pack the result for sharing.

## Build the CLI

```bash
npm install
npm run build
```

## Run the demo

```bash
bash demo/run-minimal-bundle.sh
```

The fixture command intentionally exits with status `2`. The demo treats that as
success because `bugrepro capture` returns the captured command's exit code.

## Review the output

The demo writes to `tmp/minimal-repro-demo/`:

- `capture.json` records the capture command result.
- `repro/REPRO.md` is the human-readable bug report.
- `repro/repro.json` is the tool-readable manifest.
- `repro/fixtures/input.txt` is the explicitly selected fixture.
- `repro.tar.gz` is the packed bundle.

## Adapt it

Replace `examples/minimal/fail.mjs` with the command that reproduces your issue
and keep `--fixture` paths narrow. Review `REPRO.md` before sharing the bundle,
especially when adding custom redaction rules or capturing logs from a real
project.
