import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { packBundle } from '../dist/index.js';

const validManifest = {
  schemaVersion: 1,
  createdAt: '2026-08-27T00:00:00.000Z',
  command: { command: ['node', '-v'], cwd: '.', exitCode: 0, signal: null, stdout: '', stderr: '', startedAt: '', finishedAt: '', durationMs: 0 },
  environment: { platform: process.platform, arch: process.arch, node: process.version },
  fixtures: [],
  redactions: []
};

async function writeBundle(dir, manifest = validManifest) {
  await writeFile(path.join(dir, 'repro.json'), JSON.stringify(manifest) + '\n');
  await writeFile(path.join(dir, 'REPRO.md'), '# repro\n');
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function resolveSystemTar() {
  const result = spawnSync('sh', ['-c', 'command -v tar'], { encoding: 'utf8' });
  const candidate = result.status === 0 ? result.stdout.trim().split('\n')[0] : '';
  return candidate && existsSync(candidate) ? candidate : null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

async function waitForProcessExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isProcessAlive(pid);
}

async function readPidIfRecorded(pidFile, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const pid = Number.parseInt(await readFile(pidFile, 'utf8'), 10);
      if (Number.isInteger(pid) && pid > 0) return pid;
    } catch {
      // The wrapper has not started yet, or never started at all.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return 0;
}

// Direct child processes of this test process whose command line targets the
// bundle, i.e. the live archive helpers pack spawned. Returns null when the
// platform offers no way to list processes.
function listArchiveHelpers(wrapperPath) {
  const children = spawnSync('pgrep', ['-P', String(process.pid)], { encoding: 'utf8' });
  if (children.error) return null;
  const pids = children.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  if (pids.length === 0) return [];
  const listing = spawnSync('ps', ['-o', 'pid=,args=', '-p', pids.join(',')], { encoding: 'utf8' });
  if (listing.error) return null;
  return listing.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(wrapperPath) || /(^|\s)(\/\S*\/)tar\s/.test(line))
    .map((line) => Number.parseInt(line.split(' ')[0], 10));
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

test('preserves an existing target and removes partial output when tar fails', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-failure-'));
  const dir = path.join(parent, 'bundle');
  const bin = path.join(parent, 'bin');
  await mkdir(dir);
  await mkdir(bin);
  await writeBundle(dir);
  const out = path.join(parent, 'bundle.tar.gz');
  await writeFile(out, 'existing archive');
  const fakeTar = path.join(bin, 'tar');
  await writeFile(fakeTar, '#!/bin/sh\nprintf partial\nprintf "synthetic tar failure\\n" >&2\nexit 2\n');
  await chmod(fakeTar, 0o755);
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previousPath ?? ''}`;
  try {
    await assert.rejects(packBundle(dir, out), /tar failed: synthetic tar failure/);
  } finally {
    process.env.PATH = previousPath;
  }
  assert.equal(await readFile(out, 'utf8'), 'existing archive');
  assert.deepEqual((await readdir(parent)).filter((entry) => entry.startsWith('bundle.tar.gz.tmp-')), []);
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

test('rejects malformed fixture entries before creating an archive', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-fixture-invalid-'));
  const dir = path.join(parent, 'bundle');
  await mkdir(dir);
  await writeBundle(dir, { ...validManifest, fixtures: [{}] });
  const out = path.join(parent, 'invalid.tar.gz');
  await assert.rejects(packBundle(dir, out), /Invalid repro\.json: Manifest fixtures\[0\]\.source must be a string/);
  await assert.rejects(readFile(out), { code: 'ENOENT' });
});

test('rejects archive output inside the input bundle before writing', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-inside-'));
  await writeBundle(dir);
  const out = path.join(dir, 'inside.tar.gz');
  await assert.rejects(packBundle(dir, out), /Archive output must be outside the input bundle/);
  await assert.rejects(readFile(out), { code: 'ENOENT' });
});

test('leaves no running tar helper when the archive cannot be written', async (t) => {
  if (process.platform === 'win32') {
    t.skip('this regression needs POSIX directory permissions and process ids');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('root bypasses directory write permissions, so the write cannot be forced to fail');
    return;
  }
  const systemTar = resolveSystemTar();
  if (!systemTar) {
    t.skip('no system tar available');
    return;
  }
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-pack-tar-leak-'));
  const dir = path.join(parent, 'bundle');
  const bin = path.join(parent, 'bin');
  const targetDir = path.join(parent, 'out');
  await mkdir(dir);
  await mkdir(bin);
  await mkdir(targetDir);
  await writeBundle(dir);
  // High-entropy payload: gzip cannot shrink it, so the real tar outruns the
  // ~64 KB stdout pipe buffer and blocks once the doomed write stream stops
  // consuming its output.
  await writeFile(path.join(dir, 'payload.bin'), randomBytes(512 * 1024));
  // The wrapper records its own pid and then exec()s the genuine tar, so the
  // observed process is the real archive helper.
  const pidFile = path.join(parent, 'tar.pid');
  const wrapper = path.join(bin, 'tar');
  await writeFile(wrapper, `#!/bin/sh\necho $$ > ${shellQuote(pidFile)}\nexec ${shellQuote(systemTar)} "$@"\n`);
  await chmod(wrapper, 0o755);
  await chmod(targetDir, 0o555);
  const out = path.join(targetDir, 'bundle.tar.gz');
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previousPath ?? ''}`;
  let helperPid = 0;
  try {
    await assert.rejects(packBundle(dir, out), /EACCES|EPERM/);
    // A terminated helper can die before its shell records its pid, so the pid
    // assertion is best effort and the live-child check below is unconditional.
    helperPid = await readPidIfRecorded(pidFile, 1000);
    if (helperPid > 0) {
      assert.ok(
        await waitForProcessExit(helperPid, 5000),
        `tar helper ${helperPid} is still running after the pack failed`
      );
    }
    const survivors = listArchiveHelpers(wrapper);
    assert.ok(survivors, 'the platform must allow listing child processes');
    assert.deepEqual(survivors, [], 'a failed pack must terminate every tar helper it spawned');
  } finally {
    process.env.PATH = previousPath;
    for (const pid of [helperPid, ...(listArchiveHelpers(wrapper) ?? [])]) {
      if (pid > 0 && isProcessAlive(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // The helper already exited.
        }
      }
    }
    await chmod(targetDir, 0o755);
  }
  assert.deepEqual((await readdir(targetDir)).filter((entry) => entry.startsWith('bundle.tar.gz.tmp-')), []);
});
