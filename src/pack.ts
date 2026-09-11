import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
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
  const temporaryFile = `${outputFile}.tmp-${process.pid}-${Date.now()}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(temporaryFile, { flags: 'wx' });
      const tar = spawn('tar', ['-czf', '-', '-C', inputDir, '.'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      let tarClosed = false;
      let outputFinished = false;
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        tar.stdout.unpipe(out);
        out.destroy();
        terminateTar(tar);
        reject(error);
      };
      const succeedIfComplete = () => {
        if (!settled && tarClosed && outputFinished) {
          settled = true;
          resolve();
        }
      };
      tar.stdout.pipe(out);
      tar.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
      tar.on('error', fail);
      tar.stdout.on('error', fail);
      out.on('error', fail);
      out.on('finish', () => {
        outputFinished = true;
        succeedIfComplete();
      });
      tar.on('close', (code) => {
        if (code !== 0) {
          fail(new Error(`tar failed${stderr.trim() ? `: ${stderr.trim()}` : ` with exit code ${code}`}`));
          return;
        }
        tarClosed = true;
        succeedIfComplete();
      });
    });
    const stat = await fs.stat(temporaryFile);
    if (stat.size === 0) throw new Error(`Created empty archive ${outputFile}`);
    await fs.rename(temporaryFile, outputFile);
  } catch (error) {
    await fs.rm(temporaryFile, { force: true });
    throw error;
  }
}

// Abandoning the archive also abandons the pipe its stdout flows into. Once the
// destination is gone nothing drains that pipe, so a tar helper with more than
// the ~64 KB buffer left to write blocks forever and keeps the event loop
// alive: the pack rejects, but the process never exits. Release both ends and
// terminate the helper on every path that gives up on the archive.
function terminateTar(tar: ChildProcess): void {
  tar.stdout?.destroy();
  tar.stderr?.destroy();
  try {
    tar.kill('SIGKILL');
  } catch {
    // The helper had already exited.
  }
}
