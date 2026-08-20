import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
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

test('capture retains independent UTF-8 tails within the byte limit', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-capture-'));
  const script = "process.stdout.write('start-😀界'); process.stderr.write('error-界😀')";
  const manifest = await capture(defaultCaptureOptions([process.execPath, '-e', script], {
    outputDir: out,
    maxBytes: 7
  }));

  assert.equal(manifest.command.stdout, '😀界');
  assert.equal(manifest.command.stderr, '界😀');
  assert.ok(Buffer.byteLength(manifest.command.stdout, 'utf8') <= 7);
  assert.ok(Buffer.byteLength(manifest.command.stderr, 'utf8') <= 7);
  assert.doesNotMatch(manifest.command.stdout + manifest.command.stderr, /\uFFFD/);

  const saved = JSON.parse(await readFile(path.join(out, 'repro.json'), 'utf8'));
  assert.equal(saved.command.stdout, '😀界');
  assert.equal(saved.command.stderr, '界😀');
  const markdown = await readFile(path.join(out, 'REPRO.md'), 'utf8');
  assert.match(markdown, /Captured stdout\n\n```text\n😀界\n```/);
  assert.match(markdown, /Captured stderr\n\n```text\n界😀\n```/);
});

test('capture preserves ASCII tail-retention behavior', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-capture-'));
  const manifest = await capture(defaultCaptureOptions([
    process.execPath,
    '-e',
    "process.stdout.write('123456'); process.stderr.write('abcdef')"
  ], {
    outputDir: out,
    maxBytes: 4
  }));

  assert.equal(manifest.command.stdout, '3456');
  assert.equal(manifest.command.stderr, 'cdef');
});

test('capture rejects external fixtures that map to the same bundled path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-collision-'));
  const cwd = path.join(root, 'project');
  const first = path.join(root, 'a', 'input.txt');
  const second = path.join(root, 'b', 'input.txt');
  await mkdir(cwd);
  await mkdir(path.dirname(first));
  await mkdir(path.dirname(second));
  await writeFile(first, 'first');
  await writeFile(second, 'second');

  await assert.rejects(
    capture(defaultCaptureOptions([process.execPath, '-e', 'process.exit(1)'], {
      cwd,
      outputDir: path.join(root, 'bundle'),
      fixtures: [first, second]
    })),
    /Requested fixtures collide at fixtures\/input\.txt:.*a.*input\.txt.*b.*input\.txt/
  );
});

test('capture reports a missing requested fixture before writing a bundle', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-missing-'));
  const outputDir = path.join(root, 'bundle');
  await assert.rejects(
    capture(defaultCaptureOptions([process.execPath, '-e', 'process.exit(1)'], {
      cwd: root,
      outputDir,
      fixtures: ['missing.txt']
    })),
    /Requested fixture does not exist: missing\.txt \(.*missing\.txt\)/
  );
  await assert.rejects(readFile(path.join(outputDir, 'repro.json')), /ENOENT/);
});
