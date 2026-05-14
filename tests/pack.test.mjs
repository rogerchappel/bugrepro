import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packBundle } from '../dist/index.js';

test('packs bundle directory into non-empty tarball', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-'));
  await writeFile(path.join(dir, 'repro.json'), '{}\n');
  await writeFile(path.join(dir, 'REPRO.md'), '# repro\n');
  const out = path.join(dir, '..', 'bundle.tar.gz');
  assert.equal(await packBundle(dir, out), out);
  assert.ok((await stat(out)).size > 0);
});
