# bugrepro Tasks

## MVP delivery
- [x] Scaffold public TypeScript CLI package.
- [x] Implement `capture -- <cmd>` with bounded stdout/stderr and exit-code preservation.
- [x] Add default and custom redaction rules.
- [x] Write `repro.json` and `REPRO.md` outputs.
- [x] Copy fixture files into local bundles.
- [x] Implement `pack` as local `.tar.gz` creation.
- [x] Implement guarded `replay` with confirmation for unsafe commands.
- [x] Add fixture-backed tests and CLI smoke coverage.
- [x] Document usage, safety, contributing, and examples.

## Follow-ups
- [ ] Add zip output when a cross-platform dependency policy is chosen.
- [ ] Add ignore-file support for large fixture directories.
- [ ] Add machine-readable redaction audit output.
