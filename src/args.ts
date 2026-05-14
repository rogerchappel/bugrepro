export type ParsedArgs = { command: string; flags: Map<string, string[]>; rest: string[] };

export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? 'help';
  const flags = new Map<string, string[]>();
  const rest: string[] = [];
  let afterDashDash = false;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (afterDashDash) {
      rest.push(arg);
      continue;
    }
    if (arg === '--') {
      afterDashDash = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2);
      const value = inline ?? (argv[i + 1] && !argv[i + 1]!.startsWith('--') ? argv[++i]! : 'true');
      const values = flags.get(key) ?? [];
      values.push(value);
      flags.set(key, values);
    } else {
      rest.push(arg);
    }
  }
  return { command, flags, rest };
}

export function flag(flags: Map<string, string[]>, name: string, fallback?: string): string | undefined {
  const values = flags.get(name);
  return values?.[values.length - 1] ?? fallback;
}

export function flagAll(flags: Map<string, string[]>, name: string): string[] {
  return flags.get(name) ?? [];
}
