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

test('default redaction is safe when HOME is unset', async () => {
  const previousHome = process.env.HOME;
  try {
    delete process.env.HOME;
    const { defaultRedactionRules } = await import(`../dist/redact.js?home-unset=${Date.now()}`);
    assert.equal(defaultRedactionRules.some((rule) => rule.name === 'home-directory'), false);
    const result = redactText('ordinary text', defaultRedactionRules);
    assert.equal(result.text, 'ordinary text');
  } finally {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
  }
});

test('default redaction retains home path handling', () => {
  const home = process.env.HOME;
  if (!home) return;
  const result = redactText(`file at ${home}/private`);
  assert.equal(result.text, 'file at ~/private');
  assert.ok(result.applied.includes('home-directory'));
});
