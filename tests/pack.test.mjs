import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packBundle } from '../dist/index.js';

const validManifest = {
  schemaVersion: 1,
  command: { command: ['node', '-v'] },
  environment: { node: process.version },
  fixtures: [],
  redactions: []
};

async function writeBundle(dir, manifest = validManifest) {
  await writeFile(path.join(dir, 'repro.json'), JSON.stringify(manifest) + '\n');
  await writeFile(path.join(dir, 'REPRO.md'), '# repro\n');
}

test('packs a valid bundle into a sibling non-empty tarball', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-'));
  const dir = path.join(parent, 'bundle');
  await mkdir(dir);
  await writeBundle(dir);
  const out = path.join(parent, 'bundle.tar.gz');
  assert.equal(await packBundle(dir, out), out);
  assert.ok((await stat(out)).size > 0);
});

test('uses a default archive path outside the bundle', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-default-'));
  const dir = path.join(parent, 'bundle');
  await mkdir(dir);
  await writeBundle(dir);
  const previousCwd = process.cwd();
  process.chdir(parent);
  try {
    const out = path.join(parent, 'bundle.tar.gz');
    assert.equal(await packBundle(dir), out);
    assert.ok((await stat(out)).size > 0);
  } finally {
    process.chdir(previousCwd);
  }
});

test('rejects malformed repro.json before creating an archive', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-invalid-'));
  const dir = path.join(parent, 'bundle');
  await mkdir(dir);
  await writeBundle(dir, {});
  const out = path.join(parent, 'invalid.tar.gz');
  await assert.rejects(packBundle(dir, out), /Invalid repro\.json: Unsupported manifest schemaVersion/);
  await assert.rejects(readFile(out), { code: 'ENOENT' });
});

test('rejects archive output inside the input bundle before writing', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-inside-'));
  await writeBundle(dir);
  const out = path.join(dir, 'inside.tar.gz');
  await assert.rejects(packBundle(dir, out), /Archive output must be outside the input bundle/);
  await assert.rejects(readFile(out), { code: 'ENOENT' });
});
