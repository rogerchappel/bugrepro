import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../dist/index.js';

test('rejects malformed manifests', () => {
  assert.throws(() => validateManifest({ schemaVersion: 1 }), /command/);
  assert.throws(() => validateManifest({ schemaVersion: 2 }), /schemaVersion/);
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
