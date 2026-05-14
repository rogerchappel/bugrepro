import type { ReproManifest } from './types.js';

export function validateManifest(value: unknown): asserts value is ReproManifest {
  if (!value || typeof value !== 'object') throw new Error('Manifest must be an object');
  const manifest = value as Partial<ReproManifest>;
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported manifest schemaVersion');
  if (!manifest.command || !Array.isArray(manifest.command.command)) throw new Error('Manifest command is missing');
  if (!manifest.environment || typeof manifest.environment.node !== 'string') throw new Error('Manifest environment is missing');
  if (!Array.isArray(manifest.fixtures)) throw new Error('Manifest fixtures must be an array');
  if (!Array.isArray(manifest.redactions)) throw new Error('Manifest redactions must be an array');
}
