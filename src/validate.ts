import type { ReproManifest } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, path: string): void {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`);
}

function optionalString(value: unknown, path: string): void {
  if (value !== undefined) requireString(value, path);
}

export function validateManifest(value: unknown): asserts value is ReproManifest {
  if (!isRecord(value)) throw new Error('Manifest must be an object');
  if (value.schemaVersion !== 1) throw new Error('Unsupported manifest schemaVersion');
  requireString(value.createdAt, 'Manifest createdAt');

  if (!isRecord(value.command)) throw new Error('Manifest command is missing');
  const command = value.command;
  if (!Array.isArray(command.command) || command.command.length === 0 || !command.command.every((part) => typeof part === 'string')) {
    throw new Error('Manifest command.command must be a non-empty array of strings');
  }
  requireString(command.cwd, 'Manifest command.cwd');
  if (command.exitCode !== null && !Number.isInteger(command.exitCode)) throw new Error('Manifest command.exitCode must be an integer or null');
  if (command.signal !== null && typeof command.signal !== 'string') throw new Error('Manifest command.signal must be a string or null');
  requireString(command.stdout, 'Manifest command.stdout');
  requireString(command.stderr, 'Manifest command.stderr');
  requireString(command.startedAt, 'Manifest command.startedAt');
  requireString(command.finishedAt, 'Manifest command.finishedAt');
  if (typeof command.durationMs !== 'number' || !Number.isFinite(command.durationMs) || command.durationMs < 0) {
    throw new Error('Manifest command.durationMs must be a non-negative number');
  }

  if (!isRecord(value.environment)) throw new Error('Manifest environment is missing');
  requireString(value.environment.platform, 'Manifest environment.platform');
  requireString(value.environment.arch, 'Manifest environment.arch');
  requireString(value.environment.node, 'Manifest environment.node');
  optionalString(value.environment.npm, 'Manifest environment.npm');
  optionalString(value.environment.git, 'Manifest environment.git');

  if (value.git !== undefined) {
    if (!isRecord(value.git)) throw new Error('Manifest git must be an object');
    optionalString(value.git.root, 'Manifest git.root');
    optionalString(value.git.branch, 'Manifest git.branch');
    optionalString(value.git.commit, 'Manifest git.commit');
    if (value.git.dirty !== undefined && typeof value.git.dirty !== 'boolean') throw new Error('Manifest git.dirty must be a boolean');
  }

  if (!Array.isArray(value.fixtures)) throw new Error('Manifest fixtures must be an array');
  value.fixtures.forEach((fixture, index) => {
    if (!isRecord(fixture)) throw new Error(`Manifest fixtures[${index}] must be an object`);
    requireString(fixture.source, `Manifest fixtures[${index}].source`);
    requireString(fixture.bundledPath, `Manifest fixtures[${index}].bundledPath`);
    if (!Number.isInteger(fixture.bytes) || (fixture.bytes as number) < 0) throw new Error(`Manifest fixtures[${index}].bytes must be a non-negative integer`);
  });

  if (!Array.isArray(value.redactions)) throw new Error('Manifest redactions must be an array');
  value.redactions.forEach((redaction, index) => requireString(redaction, `Manifest redactions[${index}]`));
}
