# bugrepro 🪲

Tiny, polite repro bundles for bugs that need more than "it broke on my machine".

`bugrepro` captures a failing local command, redacts common secrets, copies the fixtures you choose, and writes a shareable bundle with `REPRO.md` plus `repro.json`. It is local-first: no uploads, no accounts, no hidden network calls.

## Install

```bash
npm install -g bugrepro
```

From a checkout:

```bash
npm install
npm run build
node dist/cli.js --help
```

## Examples

Capture a failing command and one fixture directory:

```bash
bugrepro capture --out .repro --fixture tests/fixtures -- npm test
```

Use `--max-bytes <bytes>` to set the capture ceiling for each of stdout and
stderr (the default is 64,000 bytes per stream). When a stream exceeds the
ceiling, `bugrepro` keeps its tail and drops any leading partial UTF-8
character, so `REPRO.md` and `repro.json` always contain valid UTF-8 text. A
complete character larger than the ceiling is omitted.

Redact a log with a custom rule:

```bash
bugrepro redact --redact 'hostname::internal\\.example\\.test::[host]' failing.log
```

Pack the bundle:

```bash
bugrepro pack .repro --out repro.tar.gz
```

Replay after unpacking and reviewing the command:

```bash
bugrepro replay .repro
```

Code-executing commands ask for confirmation unless you pass `--yes`. Only
non-code-executing `cat` and `grep` commands can replay without a prompt; see
[Replay Safety](docs/replay-safety.md) for the complete policy.

## Runnable demo

From a checkout, generate a minimal repro bundle from the checked-in fixture:

```bash
npm run build
bash demo/run-minimal-bundle.sh
```

See [docs/tutorials/capture-a-minimal-repro.md](docs/tutorials/capture-a-minimal-repro.md)
for the walkthrough and [docs/promo/minimal-repro-brief.md](docs/promo/minimal-repro-brief.md)
for a short recording outline.

## What goes in a bundle

- command, exit code, runtime, duration
- bounded stdout/stderr with redactions applied
- Node/npm/git/platform facts
- git branch/commit/dirty status when available
- only fixture files you explicitly name
- `REPRO.md` for humans and `repro.json` for tools

## Safety

- Review `REPRO.md` before sharing.
- Prefer narrow `--fixture` paths over whole repositories.
- Add custom `--redact name::pattern::replacement` rules for project-specific identifiers.
- `bugrepro` does not upload bundles or containerize arbitrary systems.

## Contributing

Please keep changes small, tested, and local-first. Run:

```bash
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [docs/redaction.md](docs/redaction.md), [docs/replay-safety.md](docs/replay-safety.md), and [docs/PRD.md](docs/PRD.md).

## Development

Use Node.js 20 or newer. Run the same checks locally before opening a PR:

```sh
npm run build
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Releases

Pushing a `v*.*.*` tag runs the reviewed release workflow. The workflow checks
ReleaseBox readiness and the full release suite, then publishes the package to
npm with provenance and attaches the same tarball to a GitHub release.

## License

MIT
