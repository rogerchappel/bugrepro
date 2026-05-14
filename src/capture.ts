import { promises as fs } from 'node:fs';
import path from 'node:path';
import { copyFixtures } from './fixtures.js';
import { ensureDir } from './fs-utils.js';
import { runCommand } from './exec.js';
import { collectEnvironmentFacts, collectGitFacts } from './facts.js';
import { defaultRedactionRules, redactText } from './redact.js';
import { renderReproMarkdown } from './repro-md.js';
import type { CaptureOptions, ReproManifest, RedactionRule } from './types.js';

export async function capture(options: CaptureOptions): Promise<ReproManifest> {
  await ensureDir(options.outputDir);
  const command = await runCommand(options.command, options.cwd, options.maxBytes);
  const rules = [...defaultRedactionRules, ...options.redactRules];
  const stdout = redactText(command.stdout, rules);
  const stderr = redactText(command.stderr, rules);
  const fixtures = await copyFixtures(options.cwd, options.outputDir, options.fixtures);
  const manifest: ReproManifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    command: { ...command, stdout: stdout.text, stderr: stderr.text },
    environment: await collectEnvironmentFacts(options.cwd),
    git: await collectGitFacts(options.cwd),
    fixtures,
    redactions: [...new Set([...stdout.applied, ...stderr.applied])].sort()
  };
  await writeManifest(options.outputDir, manifest);
  return manifest;
}

export async function writeManifest(outputDir: string, manifest: ReproManifest): Promise<void> {
  await ensureDir(outputDir);
  await fs.writeFile(path.join(outputDir, 'repro.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(outputDir, 'REPRO.md'), renderReproMarkdown(manifest));
}

export function defaultCaptureOptions(command: string[], partial: Partial<CaptureOptions> = {}): CaptureOptions {
  return {
    cwd: partial.cwd ?? process.cwd(),
    outputDir: partial.outputDir ?? path.resolve(process.cwd(), '.repro'),
    command,
    fixtures: partial.fixtures ?? [],
    maxBytes: partial.maxBytes ?? 64_000,
    redactRules: partial.redactRules ?? [] as RedactionRule[]
  };
}
