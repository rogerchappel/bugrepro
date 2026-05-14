import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export function safeRelativePath(base: string, target: string): string {
  const relative = path.relative(base, target) || path.basename(target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.basename(target);
  }
  return relative;
}

export async function listFiles(root: string): Promise<string[]> {
  const stat = await fs.stat(root);
  if (stat.isFile()) return [root];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

export async function copyFilePreservingPath(base: string, source: string, destinationRoot: string): Promise<{ bundledPath: string; bytes: number }> {
  const relative = safeRelativePath(base, source);
  const bundledPath = path.join('fixtures', relative);
  const destination = path.join(destinationRoot, bundledPath);
  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);
  const stat = await fs.stat(destination);
  return { bundledPath, bytes: stat.size };
}
