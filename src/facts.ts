import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { EnvironmentFacts, GitFacts } from './types.js';

const execFileAsync = promisify(execFile);

async function firstLine(command: string, args: string[], cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd, timeout: 2000 });
    return stdout.trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

export async function collectEnvironmentFacts(cwd: string): Promise<EnvironmentFacts> {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: await firstLine('npm', ['--version'], cwd),
    git: await firstLine('git', ['--version'], cwd)
  };
}

export async function collectGitFacts(cwd: string): Promise<GitFacts> {
  const root = await firstLine('git', ['rev-parse', '--show-toplevel'], cwd);
  if (!root) return {};
  const branch = await firstLine('git', ['branch', '--show-current'], cwd);
  const commit = await firstLine('git', ['rev-parse', '--short', 'HEAD'], cwd);
  const status = await firstLine('git', ['status', '--porcelain'], cwd);
  return { root, branch, commit, dirty: Boolean(status) };
}
