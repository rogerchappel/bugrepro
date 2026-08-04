import { spawn } from 'node:child_process';
import type { CommandRun } from './types.js';

export async function runCommand(command: string[], cwd: string, maxBytes: number): Promise<CommandRun> {
  if (command.length === 0) throw new Error('No command provided after --');
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  return await new Promise((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), { cwd, shell: false, env: process.env });
    let stdout: Buffer = Buffer.alloc(0);
    let stderr: Buffer = Buffer.alloc(0);
    const append = (current: Buffer, chunk: Buffer): Buffer => {
      const next = Buffer.concat([current, chunk]);
      return next.length > maxBytes ? next.subarray(next.length - maxBytes) : next;
    };
    const decodeTail = (bytes: Buffer): string => {
      for (let offset = 0; offset <= Math.min(3, bytes.length); offset += 1) {
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset));
        } catch {
          // A byte-bounded tail can begin partway through a four-byte UTF-8 sequence.
        }
      }
      return '';
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
        stdout: decodeTail(stdout),
        stderr: decodeTail(stderr),
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: finished - started
      });
    });
  });
}
