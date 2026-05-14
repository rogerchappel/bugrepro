import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { capture, defaultCaptureOptions } from '../dist/index.js';

const fixtureRoot = path.resolve('tests/fixtures/project');

test('capture writes redacted manifest and fixture copy', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-capture-'));
  const manifest = await capture(defaultCaptureOptions(['node', 'fail.mjs'], {
    cwd: fixtureRoot,
    outputDir: out,
    fixtures: ['input.txt'],
    maxBytes: 4096
  }));
  assert.equal(manifest.command.exitCode, 7);
  assert.match(manifest.command.stdout, /\[REDACTED:SECRET\]/);
  assert.equal(manifest.fixtures[0].bundledPath, 'fixtures/input.txt');
  assert.match(await readFile(path.join(out, 'REPRO.md'), 'utf8'), /boom from fixture/);
  assert.match(await readFile(path.join(out, 'fixtures/input.txt'), 'utf8'), /hello fixture/);
});
