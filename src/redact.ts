import type { RedactionRule } from './types.js';

export const defaultRedactionRules: RedactionRule[] = [
  { name: 'github-token', pattern: 'gh[pousr]_[A-Za-z0-9_]{20,}', replacement: '[REDACTED:GITHUB_TOKEN]', flags: 'g' },
  { name: 'generic-secret-assignment', pattern: '(?i)(api[_-]?key|token|secret|password)([=:\\s]+)([^\\s,;]+)', replacement: '$1$2[REDACTED:SECRET]', flags: 'g' },
  { name: 'bearer-token', pattern: 'Bearer\\s+[A-Za-z0-9._~+/-]+=*', replacement: 'Bearer [REDACTED:TOKEN]', flags: 'gi' },
  { name: 'private-key', pattern: '-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----', replacement: '[REDACTED:PRIVATE_KEY]', flags: 'g' },
  { name: 'home-directory', pattern: escapeRegExp(process.env.HOME ?? ''), replacement: '~', flags: 'g' }
].filter((rule) => rule.pattern.length > 0);

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseRule(input: string): RedactionRule {
  const [name, pattern, replacement = '[REDACTED]'] = input.split('::');
  if (!name || !pattern) {
    throw new Error(`Invalid redaction rule "${input}". Use name::pattern::replacement.`);
  }
  return { name, pattern, replacement, flags: 'g' };
}

export function redactText(input: string, rules: RedactionRule[] = defaultRedactionRules): { text: string; applied: string[] } {
  let text = input;
  const applied = new Set<string>();
  for (const rule of rules) {
    const flags = rule.flags ?? 'g';
    const regex = new RegExp(rule.pattern, flags.includes('g') ? flags : `${flags}g`);
    if (regex.test(text)) {
      applied.add(rule.name);
      text = text.replace(regex, rule.replacement);
    }
  }
  return { text, applied: [...applied].sort() };
}
