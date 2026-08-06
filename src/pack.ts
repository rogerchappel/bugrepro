import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, pathExists } from './fs-utils.js';
import { validateManifest } from './validate.js';

export async function packBundle(inputDir: string, outputFile?: string): Promise<string> {
  const resolvedInput = path.resolve(inputDir);
  const reproJson = path.join(resolvedInput, 'repro.json');
  const reproMd = path.join(resolvedInput, 'REPRO.md');
  if (!await pathExists(reproJson) || !await pathExists(reproMd)) {
    throw new Error(`Expected repro.json and REPRO.md in ${inputDir}`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(await fs.readFile(reproJson, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid repro.json: ${message}`);
  }
  try {
    validateManifest(manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid repro.json: ${message}`);
  }

  const target = path.resolve(outputFile ?? path.join(process.cwd(), `${path.basename(resolvedInput) || 'repro'}.tar.gz`));
  const relativeTarget = path.relative(resolvedInput, target);
  if (relativeTarget === '' || (!relativeTarget.startsWith(`..${path.sep}`) && relativeTarget !== '..' && !path.isAbsolute(relativeTarget))) {
    throw new Error('Archive output must be outside the input bundle');
  }
  await ensureDir(path.dirname(target));
  await tarGzip(resolvedInput, target);
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
