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

Unsafe-looking commands ask for confirmation unless you pass `--yes`.

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
bash scripts/validate.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [docs/PRD.md](docs/PRD.md).

## License

MIT
