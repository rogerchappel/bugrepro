import { spawn } from 'node:child_process';
import type { CommandRun } from './types.js';

export async function runCommand(command: string[], cwd: string, maxBytes: number): Promise<CommandRun> {
  if (command.length === 0) throw new Error('No command provided after --');
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  return await new Promise((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), { cwd, shell: false, env: process.env });
    let stdout = '';
    let stderr = '';
    const append = (current: string, chunk: Buffer): string => {
      const next = current + chunk.toString('utf8');
      return next.length > maxBytes ? next.slice(next.length - maxBytes) : next;
    };
    child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
    child.on('error', reject);
    child.on('close', (exitCode, signal) => {
      const finished = Date.now();
      resolve({
        command,
        cwd,
        exitCode,
        signal,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: finished - started
      });
    });
  });
}
