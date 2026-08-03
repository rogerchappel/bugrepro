export type ParsedArgs = { command: string; flags: Map<string, string[]>; rest: string[] };

type CommandSpec = {
  boolean: ReadonlySet<string>;
  valued: ReadonlySet<string>;
  maxPositionals?: number;
};

const commandSpecs: Record<string, CommandSpec> = {
  capture: {
    boolean: new Set(),
    valued: new Set(['out', 'fixture', 'redact', 'max-bytes'])
  },
  redact: {
    boolean: new Set(),
    valued: new Set(['redact']),
    maxPositionals: 1
  },
  pack: {
    boolean: new Set(),
    valued: new Set(['out']),
    maxPositionals: 1
  },
  replay: {
    boolean: new Set(['yes']),
    valued: new Set(),
    maxPositionals: 1
  }
};

export class UsageError extends Error {}

function addFlag(flags: Map<string, string[]>, name: string, value: string): void {
  const values = flags.get(name) ?? [];
  values.push(value);
  flags.set(name, values);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? 'help';
  const spec = commandSpecs[command];
  const flags = new Map<string, string[]>();
  const rest: string[] = [];
  let afterDashDash = false;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (afterDashDash || !arg.startsWith('--') || arg === '--') {
      if (arg === '--' && !afterDashDash) afterDashDash = true;
      else rest.push(arg);
      continue;
    }

    const [name, inline] = arg.slice(2).split('=', 2);
    if (!spec || (!spec.boolean.has(name) && !spec.valued.has(name))) {
      throw new UsageError(`Unknown option for ${command}: --${name}`);
    }
    if (spec.boolean.has(name)) {
      if (inline !== undefined) throw new UsageError(`Option --${name} does not take a value`);
      addFlag(flags, name, 'true');
      continue;
    }

    const next = argv[i + 1];
    const value = inline ?? (next && !next.startsWith('--') ? argv[++i]! : undefined);
    if (value === undefined || value === '') throw new UsageError(`Option --${name} requires a value`);
    addFlag(flags, name, value);
  }

  if (spec?.maxPositionals !== undefined && rest.length > spec.maxPositionals) {
    throw new UsageError(`Too many arguments for ${command}`);
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
