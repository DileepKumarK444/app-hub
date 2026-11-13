import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { DATA_DIR, LOG_DIR, expandPath } from './paths';
import type { Project, ProjectView, RunStatus } from './types';

const RUNTIME = path.join(DATA_DIR, 'runtime.json');
const STARTING_GRACE_MS = 120_000;

type RuntimeEntry = { pid: number; port: number | null; startedAt: number };
type RuntimeState = Record<string, RuntimeEntry>;

function readRuntime(): RuntimeState {
  try {
    return JSON.parse(fs.readFileSync(RUNTIME, 'utf8')) as RuntimeState;
  } catch {
    return {};
  }
}

function writeRuntime(state: RuntimeState) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RUNTIME, JSON.stringify(state, null, 2));
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** True when something accepts connections on the port (IPv4 or IPv6 loopback). */
export function portInUse(port: number, timeoutMs = 400): Promise<boolean> {
  const probe = (host: string) =>
    new Promise<boolean>((resolve) => {
      const socket = net.connect({ port, host });
      const done = (v: boolean) => {
        socket.destroy();
        resolve(v);
      };
      socket.setTimeout(timeoutMs, () => done(false));
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
    });
  return Promise.all([probe('127.0.0.1'), probe('::1')]).then(([a, b]) => a || b);
}

export function resolveCommand(p: Project): string | null {
  if (!p.command) return null;
  return p.command.replaceAll('{port}', String(p.port ?? ''));
}

export function openUrl(p: Project): string | null {
  if (p.url) return p.url.replaceAll('{port}', String(p.port ?? ''));
  return p.port ? `http://localhost:${p.port}` : null;
}

export async function viewOf(p: Project): Promise<ProjectView> {
  const state = readRuntime();
  const entry = state[p.id];
  let status: RunStatus = 'stopped';
  let pid: number | null = null;
  let startedAt: number | null = null;

  if (entry && isAlive(entry.pid)) {
    pid = entry.pid;
    startedAt = entry.startedAt;
    const listening = p.port ? await portInUse(p.port) : true;
    status = listening || Date.now() - entry.startedAt > STARTING_GRACE_MS ? 'running' : 'starting';
  } else {
    if (entry) {
      delete state[p.id];
      writeRuntime(state);
    }
    if (p.port && (await portInUse(p.port))) status = 'external';
  }

  return { ...p, status, pid, startedAt, openUrl: openUrl(p), pathExists: fs.existsSync(expandPath(p.path)) };
}

/** Child apps must not inherit the dashboard's own Next.js/Node settings. */
function cleanEnv(port: number | null): NodeJS.ProcessEnv {
  const env = {} as NodeJS.ProcessEnv;
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('__NEXT') || k.startsWith('NEXT_') || k === 'NODE_ENV' || k === 'PORT') continue;
    env[k] = v;
  }
  if (port) env.PORT = String(port);
  return env;
}

export function logFile(id: string): string {
  return path.join(LOG_DIR, `${id}.log`);
}

export async function startProject(p: Project): Promise<{ pid: number }> {
  if (!p.enabled) throw new HttpError(409, 'This app is disabled. Re-enable it first.');
  const cmd = resolveCommand(p);
  if (!cmd) throw new HttpError(400, 'This app has no run command. Add one in Settings.');
  const cwd = expandPath(p.path);
  if (!fs.existsSync(cwd)) throw new HttpError(400, `Project folder not found: ${p.path}`);

  const view = await viewOf(p);
  if (view.status === 'running' || view.status === 'starting') throw new HttpError(409, 'Already running.');
  if (p.port && (await portInUse(p.port))) {
    throw new HttpError(409, `Port ${p.port} is already in use by another process. Pick a different port in Settings.`);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const fd = fs.openSync(logFile(p.id), 'w');
  fs.writeSync(fd, `$ ${cmd}\n# cwd: ${cwd}\n\n`);

  const child = spawn('/bin/sh', ['-c', cmd], {
    cwd,
    env: cleanEnv(p.port),
    detached: true, // own process group so Stop can kill the whole tree
    stdio: ['ignore', fd, fd],
  });
  fs.closeSync(fd);
  child.unref();
  if (!child.pid) throw new HttpError(500, 'Failed to start the process.');

  const state = readRuntime();
  state[p.id] = { pid: child.pid, port: p.port, startedAt: Date.now() };
  writeRuntime(state);
  return { pid: child.pid };
}

export async function stopProject(p: Project): Promise<boolean> {
  const state = readRuntime();
  const entry = state[p.id];
  if (!entry) return false;
  delete state[p.id];
  writeRuntime(state);
  if (!isAlive(entry.pid)) return true;

  const signal = (sig: NodeJS.Signals) => {
    try {
      process.kill(-entry.pid, sig); // whole process group
    } catch {
      try {
        process.kill(entry.pid, sig);
      } catch {
        /* already gone */
      }
    }
  };
  signal('SIGTERM');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (!isAlive(entry.pid)) return true;
  }
  signal('SIGKILL');
  return true;
}

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

export function readLogs(id: string, maxBytes = 48_000): string {
  const file = logFile(id);
  if (!fs.existsSync(file)) return '';
  const { size } = fs.statSync(file);
  const fd = fs.openSync(file, 'r');
  try {
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    let text = buf.toString('utf8').replace(ANSI, '').replace(/\r(?!\n)/g, '\n');
    if (size > maxBytes) text = text.slice(text.indexOf('\n') + 1);
    return text;
  } finally {
    fs.closeSync(fd);
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
