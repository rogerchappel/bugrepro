# bugrepro PRD

Status: in-progress

## One-liner
`bugrepro` packages a tiny, sanitized local repro bundle from a failing command, fixtures, logs, and environment facts. 🪲

## Problem
Bug reports are either vague or accidentally leak sensitive data. Developers and agents need a repeatable local repro artifact with just enough context to fail the same way.

## Users
- Maintainers turning failing smokes into shareable issues.
- Agentic workers handing a blocker to another agent.
- Developers filing high-signal OSS bug reports.

## MVP
- Node/TypeScript CLI.
- `bugrepro capture -- <cmd>` records command, exit code, selected stdout/stderr, platform/tool versions, git facts, and optional fixture globs.
- `bugrepro redact` applies default and custom redaction rules.
- `bugrepro pack` writes a tarball/zip plus `REPRO.md` and `repro.json`.
- `bugrepro replay` runs the captured command in the unpacked fixture directory with confirmation prompts for unsafe commands.
- Tests for redaction, manifests, replay safety, and fixture packaging.

## Non-goals
- Containerizing arbitrary systems in V1.
- Uploading repro bundles to third-party services.

## Differentiation
Balances practical bug-report ergonomics with agent-safe, local-first boundaries.

## Sources / attribution
Inspired by common minimal reproduction guidance in OSS communities and local OSS Factory smoke-test blocker handoffs; renamed/reframed as a deterministic CLI.
