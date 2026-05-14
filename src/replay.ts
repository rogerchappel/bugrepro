import { promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { runCommand } from './exec.js';
import type { ReproManifest } from './types.js';
import { validateManifest } from './validate.js';

const safeCommands = new Set(['node', 'npm', 'pnpm', 'yarn', 'python', 'python3', 'bash', 'sh', 'cat', 'grep']);
const dangerousPattern = /\b(rm|curl|wget|ssh|scp|sudo|dd|mkfs|chmod|chown)\b|[;&|`$<>]/;

export function commandNeedsConfirmation(command: string[]): boolean {
  const executable = path.basename(command[0] ?? '');
  return !safeCommands.has(executable) || dangerousPattern.test(command.join(' '));
}

export async function loadManifest(bundleDir: string): Promise<ReproManifest> {
  const raw = await fs.readFile(path.join(bundleDir, 'repro.json'), 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  validateManifest(parsed);
  return parsed;
}

export async function replay(bundleDir: string, assumeYes = false): Promise<number | null> {
  const manifest = await loadManifest(bundleDir);
  if (commandNeedsConfirmation(manifest.command.command) && !assumeYes) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(`Replay command ${manifest.command.command.join(' ')}? Type yes to continue: `);
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') return 130;
  }
  const cwd = path.join(bundleDir, 'fixtures');
  const run = await runCommand(manifest.command.command, cwd, 64_000);
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  return run.exitCode;
}
