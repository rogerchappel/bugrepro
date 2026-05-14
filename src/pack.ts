import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, pathExists } from './fs-utils.js';

export async function packBundle(inputDir: string, outputFile?: string): Promise<string> {
  const reproJson = path.join(inputDir, 'repro.json');
  const reproMd = path.join(inputDir, 'REPRO.md');
  if (!await pathExists(reproJson) || !await pathExists(reproMd)) {
    throw new Error(`Expected repro.json and REPRO.md in ${inputDir}`);
  }
  const target = outputFile ?? path.resolve(process.cwd(), `${path.basename(path.resolve(inputDir)) || 'repro'}.tar.gz`);
  await ensureDir(path.dirname(target));
  await tarGzip(inputDir, target);
  return target;
}

async function tarGzip(inputDir: string, outputFile: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(outputFile);
    const tar = spawn('tar', ['-czf', '-', '-C', inputDir, '.'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    tar.stdout.pipe(out);
    tar.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    tar.on('error', reject);
    out.on('error', reject);
    out.on('finish', () => resolve());
    tar.on('close', (code) => {
      if (code !== 0) reject(new Error(`tar failed: ${stderr.trim()}`));
    });
  });
  const stat = await fs.stat(outputFile);
  if (stat.size === 0) throw new Error(`Created empty archive ${outputFile}`);
}
