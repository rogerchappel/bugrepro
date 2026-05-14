export type RedactionRule = {
  name: string;
  pattern: string;
  replacement: string;
  flags?: string;
};

export type CaptureOptions = {
  cwd: string;
  outputDir: string;
  command: string[];
  fixtures: string[];
  maxBytes: number;
  redactRules: RedactionRule[];
};

export type CommandRun = {
  command: string[];
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type GitFacts = {
  root?: string;
  branch?: string;
  commit?: string;
  dirty?: boolean;
};

export type EnvironmentFacts = {
  platform: NodeJS.Platform;
  arch: string;
  node: string;
  npm?: string;
  git?: string;
};

export type ReproManifest = {
  schemaVersion: 1;
  createdAt: string;
  command: CommandRun;
  environment: EnvironmentFacts;
  git: GitFacts;
  fixtures: Array<{ source: string; bundledPath: string; bytes: number }>;
  redactions: string[];
};
