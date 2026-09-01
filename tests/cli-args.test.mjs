import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cli = path.resolve('dist/cli.js');

async function run(args, options = {}) {
  try {
    return { ...(await execFileAsync(process.execPath, [cli, ...args], options)), code: 0 };
  } catch (error) {
    return { stdout: error.stdout, stderr: error.stderr, code: error.code };
  }
}

async function replayBundle() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-cli-'));
  await mkdir(path.join(dir, 'fixtures'));
  await writeFile(path.join(dir, 'repro.json'), JSON.stringify({
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    command: { command: [process.execPath, '-e', 'process.exit(0)'], cwd: '.', exitCode: 0, signal: null, stdout: '', stderr: '', startedAt: '', finishedAt: '', durationMs: 0 },
    environment: { platform: 'test', arch: 'test', node: process.version },
    git: {}, fixtures: [], redactions: []
  }));
  return dir;
}

test('--yes works before and after the replay bundle directory', async () => {
  const dir = await replayBundle();
  assert.equal((await run(['replay', '--yes', dir])).code, 0);
  assert.equal((await run(['replay', dir, '--yes'])).code, 0);
});

test('capture --max-bytes bounds multibyte stdout and stderr in generated files', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-cli-'));
  const script = "process.stdout.write('x😀😀'); process.stderr.write('y界界')";
  const result = await run(['capture', '--out', out, '--max-bytes', '4', '--', process.execPath, '-e', script]);

  assert.equal(result.code, 0);
  const manifest = JSON.parse(await readFile(path.join(out, 'repro.json'), 'utf8'));
  assert.equal(manifest.command.stdout, '😀');
  assert.equal(manifest.command.stderr, '界');
  assert.equal(Buffer.byteLength(manifest.command.stdout, 'utf8'), 4);
  assert.equal(Buffer.byteLength(manifest.command.stderr, 'utf8'), 3);
  assert.doesNotMatch(await readFile(path.join(out, 'REPRO.md'), 'utf8'), /\uFFFD/);
});

test('pack exits nonzero without success JSON when tar fails after writing bytes', async () => {
  const dir = await replayBundle();
  await writeFile(path.join(dir, 'REPRO.md'), '# repro\n');
  const bin = await mkdtemp(path.join(os.tmpdir(), 'bugrepro-cli-bin-'));
  const fakeTar = path.join(bin, 'tar');
  await writeFile(fakeTar, '#!/bin/sh\nprintf partial\nprintf "synthetic tar failure\\n" >&2\nexit 2\n');
  await chmod(fakeTar, 0o755);
  const out = path.join(path.dirname(dir), 'failed.tar.gz');
  const result = await run(['pack', dir, '--out', out], {
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` }
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /tar failed: synthetic tar failure/);
  await assert.rejects(readFile(out), { code: 'ENOENT' });
});

for (const [name, args, message] of [
  ['unknown options', ['replay', '--wat'], /Unknown option/],
  ['missing option values', ['pack', '--out'], /requires a value/],
  ['surplus positionals', ['replay', 'one', 'two'], /Too many arguments/],
  ['boolean option values', ['replay', '--yes=true'], /does not take a value/],
  ['non-numeric max bytes', ['capture', '--max-bytes', 'many', '--', 'true'], /positive integer/],
  ['non-positive max bytes', ['capture', '--max-bytes=0', '--', 'true'], /positive integer/]
]) {
  test(`rejects ${name} with usage`, async () => {
    const result = await run(args);
    assert.equal(result.code, 64);
    assert.match(result.stderr, message);
    assert.match(result.stderr, /Usage:/);
  });
}
