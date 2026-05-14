import test from 'node:test';
import assert from 'node:assert/strict';
import { redactText, parseRule } from '../dist/index.js';

test('redacts default secret assignments', () => {
  const result = redactText('api_key=abc123 token: xyz');
  assert.match(result.text, /api_key=\[REDACTED:SECRET\]/);
  assert.match(result.text, /token: \[REDACTED:SECRET\]/);
  assert.ok(result.applied.includes('generic-secret-assignment'));
});

test('applies custom redaction rules', () => {
  const rule = parseRule('host::internal\\.example\\.test::[host]');
  const result = redactText('see internal.example.test', [rule]);
  assert.equal(result.text, 'see [host]');
  assert.deepEqual(result.applied, ['host']);
});
