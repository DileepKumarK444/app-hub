import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, compactPath } from './paths';
import type { Project, ProjectInput } from './types';

const FILE = path.join(DATA_DIR, 'projects.json');
const SEED = path.join(DATA_DIR, 'projects.seed.json');

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
}

function normalise(p: Partial<Project> & { id: string }): Project {
  return {
    id: p.id,
    name: p.name ?? p.id,
    description: p.description ?? '',
    path: p.path ?? '',
    stack: p.stack ?? [],
    tags: p.tags ?? [],
    port: typeof p.port === 'number' ? p.port : null,
    command: p.command?.trim() ? p.command : null,
    installCommand: p.installCommand?.trim() ? p.installCommand : null,
    notes: p.notes?.trim() ? p.notes : null,
    url: p.url?.trim() ? p.url : null,
    enabled: p.enabled !== false,
  };
}

export function readAll(): Project[] {
  if (!fs.existsSync(FILE)) {
    // First run: copy the committed seed so the dashboard is never empty.
    const seed = fs.existsSync(SEED) ? fs.readFileSync(SEED, 'utf8') : '[]';
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, seed);
  }
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Array<Partial<Project> & { id: string }>;
  return raw.map(normalise);
}

function writeAll(list: Project[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n');
  fs.renameSync(tmp, FILE);
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id);
}

export function addProject(input: ProjectInput): Project {
  const list = readAll();
  const base = slug(input.name);
  let id = base;
  for (let n = 2; list.some((p) => p.id === id); n++) id = `${base}-${n}`;
  const project = normalise({ ...input, id, path: compactPath(input.path) });
  list.push(project);
  writeAll(list);
  return project;
}

export function updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): Project | undefined {
  const list = readAll();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  const next = normalise({ ...list[i], ...patch, id, path: patch.path ? compactPath(patch.path) : list[i].path });
  list[i] = next;
  writeAll(list);
  return next;
}

export function removeProject(id: string): boolean {
  const list = readAll();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}
