import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../dist/index.js';

test('rejects malformed manifests', () => {
  assert.throws(() => validateManifest({ schemaVersion: 1 }), /command/);
  assert.throws(() => validateManifest({ schemaVersion: 2 }), /schemaVersion/);
});

test('rejects empty and non-string command arrays with a stable diagnostic', () => {
  const commandError = /Manifest command\.command must be a non-empty array of strings/;
  assert.throws(() => validateManifest({ schemaVersion: 1, command: {} }), commandError);
  assert.throws(() => validateManifest({ schemaVersion: 1, command: { command: [] } }), commandError);
  assert.throws(() => validateManifest({ schemaVersion: 1, command: { command: ['node', 42] } }), commandError);
});

test('accepts minimal valid manifests', () => {
  assert.doesNotThrow(() => validateManifest({
    schemaVersion: 1,
    command: { command: ['node', '-v'] },
    environment: { node: process.version },
    fixtures: [],
    redactions: []
  }));
});
