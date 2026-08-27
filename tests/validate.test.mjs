import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../dist/index.js';

const validManifest = {
  schemaVersion: 1,
  createdAt: '2026-08-27T00:00:00.000Z',
  command: { command: ['node', '-v'], cwd: '.', exitCode: 0, signal: null, stdout: '', stderr: '', startedAt: '2026-08-27T00:00:00.000Z', finishedAt: '2026-08-27T00:00:01.000Z', durationMs: 1000 },
  environment: { platform: process.platform, arch: process.arch, node: process.version },
  git: {},
  fixtures: [],
  redactions: []
};

test('rejects malformed manifests', () => {
  assert.throws(() => validateManifest({ ...validManifest, command: undefined }), /command/);
  assert.throws(() => validateManifest({ schemaVersion: 2 }), /schemaVersion/);
});

test('rejects empty and non-string command arrays with a stable diagnostic', () => {
  const commandError = /Manifest command\.command must be a non-empty array of strings/;
  assert.throws(() => validateManifest({ ...validManifest, command: {} }), commandError);
  assert.throws(() => validateManifest({ ...validManifest, command: { command: [] } }), commandError);
  assert.throws(() => validateManifest({ ...validManifest, command: { command: ['node', 42] } }), commandError);
});

test('accepts minimal valid manifests', () => {
  assert.doesNotThrow(() => validateManifest(validManifest));
  const { git, ...withoutGit } = validManifest;
  assert.doesNotThrow(() => validateManifest(withoutGit));
});

test('rejects malformed persisted command and environment fields', () => {
  for (const [field, value] of [['cwd', 1], ['exitCode', '0'], ['signal', 9], ['stdout', null], ['stderr', []], ['startedAt', 1], ['finishedAt', false], ['durationMs', -1]]) {
    assert.throws(() => validateManifest({ ...validManifest, command: { ...validManifest.command, [field]: value } }), new RegExp(`Manifest command\\.${field}`));
  }
  for (const [field, value] of [['platform', 1], ['arch', null], ['node', []], ['npm', 1], ['git', false]]) {
    assert.throws(() => validateManifest({ ...validManifest, environment: { ...validManifest.environment, [field]: value } }), new RegExp(`Manifest environment\\.${field}`));
  }
});

test('rejects malformed fixture, redaction, and optional git fields', () => {
  for (const [field, value] of [['source', 1], ['bundledPath', null], ['bytes', -1]]) {
    assert.throws(() => validateManifest({ ...validManifest, fixtures: [{ source: 'a', bundledPath: 'fixtures/a', bytes: 1, [field]: value }] }), new RegExp(`Manifest fixtures\\[0\\]\\.${field}`));
  }
  assert.throws(() => validateManifest({ ...validManifest, redactions: ['token', 2] }), /Manifest redactions\[1\] must be a string/);
  assert.throws(() => validateManifest({ ...validManifest, git: { dirty: 'yes' } }), /Manifest git\.dirty/);
});
