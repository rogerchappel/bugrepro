import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { commandNeedsConfirmation, replay } from '../dist/index.js';

test('flags dangerous replay commands', () => {
  assert.equal(commandNeedsConfirmation(['rm', '-rf', 'tmp']), true);
  assert.equal(commandNeedsConfirmation(['bash', '-c', 'touch /tmp/example']), true);
  assert.equal(commandNeedsConfirmation(['sh', '-c', 'touch /tmp/example']), true);
  assert.equal(commandNeedsConfirmation(['python', '-c', 'open("/tmp/example", "w")']), true);
  assert.equal(commandNeedsConfirmation(['python3', '-c', 'open("/tmp/example", "w")']), true);
});

test('replays non-code-executing commands without confirmation', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-replay-'));
  await mkdir(path.join(dir, 'fixtures'));
  await writeFile(path.join(dir, 'fixtures', 'empty.txt'), '');
  await writeFile(path.join(dir, 'repro.json'), JSON.stringify({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    command: { command: ['cat', 'empty.txt'], cwd: '.', exitCode: 0, signal: null, stdout: '', stderr: '', startedAt: '', finishedAt: '', durationMs: 0 },
    environment: { platform: process.platform, arch: process.arch, node: process.version },
    git: {},
    fixtures: [],
    redactions: []
  }));
  assert.equal(await replay(dir, false), 0);
});

test('replays code-executing commands when confirmation is explicitly bypassed', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-replay-'));
  await mkdir(path.join(dir, 'fixtures'));
  await writeFile(path.join(dir, 'fixtures', 'ok.mjs'), 'process.exit(3);\n');
  await writeFile(path.join(dir, 'repro.json'), JSON.stringify({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    command: { command: [process.execPath, 'ok.mjs'], cwd: '.', exitCode: 3, signal: null, stdout: '', stderr: '', startedAt: '', finishedAt: '', durationMs: 0 },
    environment: { platform: process.platform, arch: process.arch, node: process.version },
    git: {},
    fixtures: [],
    redactions: []
  }));
  assert.equal(await replay(dir, true), 3);
});
