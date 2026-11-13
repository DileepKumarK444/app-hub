import os from 'node:os';
import path from 'node:path';

export function expandPath(p: string): string {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return path.resolve(p);
}

/** Store paths under the home directory with a leading ~ so config stays portable. */
export function compactPath(p: string): string {
  const abs = path.resolve(expandPath(p));
  const home = os.homedir();
  return abs === home ? '~' : abs.startsWith(home + path.sep) ? '~/' + abs.slice(home.length + 1) : abs;
}

export const DATA_DIR = path.join(process.cwd(), 'data');
export const LOG_DIR = path.join(DATA_DIR, 'logs');
export const DASHBOARD_PORT = 4747;
