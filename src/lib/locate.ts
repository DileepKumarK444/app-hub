import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compactPath } from './paths';

const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'Library', 'AppData', '.cache', '.npm', '.Trash', 'venv', '.venv', '__pycache__']);
const MAX_DEPTH = 4;
const MAX_VISITED = 40_000;

/** Places a project is likely to live: home, and on WSL the Windows user folders. */
function roots(extra: string[]): string[] {
  const out = new Set<string>([os.homedir(), ...extra]);
  try {
    for (const u of fs.readdirSync('/mnt/c/Users', { withFileTypes: true })) {
      if (u.isDirectory() && !['Public', 'Default', 'All Users', 'Default User'].includes(u.name)) out.add(path.join('/mnt/c/Users', u.name));
    }
  } catch {
    /* not WSL */
  }
  return [...out];
}

/**
 * Browsers never reveal a picked folder's real path, only its name and the entries inside it.
 * Find folders with that name whose contents match, best match first.
 */
export function locateFolder(name: string, entries: string[], extraRoots: string[] = []): string[] {
  const want = new Set(entries);
  const hits: Array<{ full: string; score: number }> = [];
  const seen = new Set<string>();
  let visited = 0;

  const walk = (dir: string, depth: number) => {
    if (visited++ > MAX_VISITED) return;
    let list: fs.Dirent[];
    try {
      list = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      if (!e.isDirectory() || SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.name === name && !seen.has(full)) {
        seen.add(full);
        let score = 0;
        try {
          const have = new Set(fs.readdirSync(full));
          for (const w of want) if (have.has(w)) score++;
        } catch {
          continue;
        }
        if (want.size === 0 || score > 0) hits.push({ full, score });
      }
      if (depth < MAX_DEPTH && !e.name.startsWith('.')) walk(full, depth + 1);
    }
  };

  for (const r of roots(extraRoots)) walk(r, 1);
  return hits.sort((a, b) => b.score - a.score).map((h) => compactPath(h.full));
}
