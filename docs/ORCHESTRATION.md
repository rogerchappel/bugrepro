# Orchestration Notes

bugrepro is intentionally local-first and single-agent friendly.

## Ownership
- The CLI owns capture, redaction, packing, and replay behavior.
- The repository keeps tests and smoke fixtures in-tree so agents can reproduce failures without external services.
- Publishing is manual; no command uploads repro bundles.

## Review gates
1. `npm test`
2. `npm run check`
3. `npm run build`
4. `npm run smoke`
5. `bash scripts/validate.sh`

## Agent handoff pattern
When an agent hits a blocker, run:

```bash
bugrepro capture --out .repro --fixture tests/fixtures -- npm test
bugrepro pack .repro --out blocker-repro.tar.gz
```

Attach the tarball and paste `REPRO.md` into the handoff. Do not attach bundles before reviewing redactions.
