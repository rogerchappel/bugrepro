import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { copyFixtures, expandFixtureInputs } from './fixtures.js';
import { ensureDir, pathExists } from './fs-utils.js';
import { runCommand } from './exec.js';
import { collectEnvironmentFacts, collectGitFacts } from './facts.js';
import { defaultRedactionRules, redactText } from './redact.js';
import { renderReproMarkdown } from './repro-md.js';
import type { CaptureOptions, ReproManifest, RedactionRule } from './types.js';

export async function capture(options: CaptureOptions): Promise<ReproManifest> {
  // Validate all requested evidence before creating or changing the bundle.
  await expandFixtureInputs(options.cwd, options.fixtures);
  const command = await runCommand(options.command, options.cwd, options.maxBytes);
  const rules = [...defaultRedactionRules, ...options.redactRules];
  const stdout = redactText(command.stdout, rules);
  const stderr = redactText(command.stderr, rules);
  const outputDir = path.resolve(options.outputDir);
  const parentDir = path.dirname(outputDir);
  await ensureDir(parentDir);
  const stagingDir = await fs.mkdtemp(path.join(parentDir, `.${path.basename(outputDir)}.tmp-`));
  try {
    const fixtures = await copyFixtures(options.cwd, stagingDir, options.fixtures);
    const manifest: ReproManifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      command: { ...command, stdout: stdout.text, stderr: stderr.text },
      environment: await collectEnvironmentFacts(options.cwd),
      git: await collectGitFacts(options.cwd),
      fixtures,
      redactions: [...new Set([...stdout.applied, ...stderr.applied])].sort()
    };
    await writeManifest(stagingDir, manifest);
    await replaceBundle(outputDir, stagingDir);
    return manifest;
  } catch (error) {
    await fs.rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

async function replaceBundle(outputDir: string, stagingDir: string): Promise<void> {
  const backupDir = `${outputDir}.backup-${randomUUID()}`;
  const hadExistingBundle = await pathExists(outputDir);
  try {
    if (hadExistingBundle) await fs.rename(outputDir, backupDir);
    await fs.rename(stagingDir, outputDir);
    if (hadExistingBundle) await fs.rm(backupDir, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(stagingDir, { recursive: true, force: true });
    if (hadExistingBundle && await pathExists(backupDir) && !await pathExists(outputDir)) {
      await fs.rename(backupDir, outputDir);
    }
    throw error;
  }
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
