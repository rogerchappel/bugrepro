import path from 'node:path';
import { promises as fs } from 'node:fs';
import { copyFilePreservingPath, listFiles, pathExists } from './fs-utils.js';

export async function expandFixtureInputs(cwd: string, inputs: string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const input of inputs) {
    const resolved = path.resolve(cwd, input);
    if (!await pathExists(resolved)) continue;
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      for (const file of await listFiles(resolved)) files.add(file);
    } else if (stat.isFile()) {
      files.add(resolved);
    }
  }
  return [...files].sort();
}

export async function copyFixtures(cwd: string, outputDir: string, inputs: string[]): Promise<Array<{ source: string; bundledPath: string; bytes: number }>> {
  const files = await expandFixtureInputs(cwd, inputs);
  const copied = [] as Array<{ source: string; bundledPath: string; bytes: number }>;
  for (const file of files) {
    const result = await copyFilePreservingPath(cwd, file, outputDir);
    copied.push({ source: path.relative(cwd, file), bundledPath: result.bundledPath, bytes: result.bytes });
  }
  return copied;
}
