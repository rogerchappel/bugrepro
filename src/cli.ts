#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs, flag, flagAll } from './args.js';
import { capture, defaultCaptureOptions } from './capture.js';
import { helpText } from './help.js';
import { packBundle } from './pack.js';
import { parseRule, redactText, defaultRedactionRules } from './redact.js';
import { replay } from './replay.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
    process.stdout.write(helpText());
    return 0;
  }
  if (parsed.command === 'capture') {
    const rules = flagAll(parsed.flags, 'redact').map(parseRule);
    const out = path.resolve(flag(parsed.flags, 'out', '.repro')!);
    const manifest = await capture(defaultCaptureOptions(parsed.rest, {
      outputDir: out,
      fixtures: flagAll(parsed.flags, 'fixture'),
      maxBytes: Number(flag(parsed.flags, 'max-bytes', '64000')),
      redactRules: rules
    }));
    process.stdout.write(`${JSON.stringify({ ok: true, out, exitCode: manifest.command.exitCode })}\n`);
    return manifest.command.exitCode ?? 1;
  }
  if (parsed.command === 'redact') {
    const rules = [...defaultRedactionRules, ...flagAll(parsed.flags, 'redact').map(parseRule)];
    const input = parsed.rest[0] ? await fs.readFile(parsed.rest[0], 'utf8') : await readStdin();
    process.stdout.write(redactText(input, rules).text);
    return 0;
  }
  if (parsed.command === 'pack') {
    const bundleDir = path.resolve(parsed.rest[0] ?? '.repro');
    const out = await packBundle(bundleDir, flag(parsed.flags, 'out'));
    process.stdout.write(`${JSON.stringify({ ok: true, out })}\n`);
    return 0;
  }
  if (parsed.command === 'replay') {
    return await replay(path.resolve(parsed.rest[0] ?? '.'), parsed.flags.has('yes')) ?? 1;
  }
  process.stderr.write(`Unknown command: ${parsed.command}\n\n${helpText()}`);
  return 64;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
