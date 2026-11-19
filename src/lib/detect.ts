import fs from 'node:fs';
import path from 'node:path';
import { compactPath, expandPath } from './paths';
import type { Details, Detected } from './types';

function readJson(file: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readme(dir: string): string {
  const name = fs.readdirSync(dir).find((f) => /^readme(\.md)?$/i.test(f));
  return name ? fs.readFileSync(path.join(dir, name), 'utf8') : '';
}

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First real paragraph after the heading, with markdown/HTML noise removed. */
function firstParagraph(md: string): string {
  const paras = md
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|') && !p.startsWith('[!['));
  return (paras[0] ?? '').replace(/\s+/g, ' ').replace(/[*_`]/g, '').slice(0, 240);
}

function workspaceScripts(dir: string, pkg: Record<string, any>): Record<string, string> {
  return (pkg.scripts as Record<string, string>) ?? {};
}

export function detect(rawPath: string, usedPorts: number[]): Detected {
  const dir = expandPath(rawPath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('Folder not found.');

  const pkg = readJson(path.join(dir, 'package.json'));
  const text = readme(dir);
  const stack = new Set<string>();
  let command: string | null = null;
  let installCommand: string | null = null;
  const scripts = pkg ? workspaceScripts(dir, pkg) : {};

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    const has = (n: string) => n in deps;
    if (has('next')) stack.add('Next.js');
    if (has('react')) stack.add('React');
    if (has('vite')) stack.add('Vite');
    if (has('express')) stack.add('Express');
    if (has('prisma') || has('@prisma/client')) stack.add('Prisma');
    if (has('tailwindcss')) stack.add('Tailwind');
    if (has('typescript')) stack.add('TypeScript');
    installCommand = 'npm install';
    if (scripts.dev) {
      if (/^next dev\s*$/.test(scripts.dev)) command = 'npx next dev -p {port}';
      else if (/^vite\s*$/.test(scripts.dev)) command = 'npm run dev -- --port {port}';
      else command = 'PORT={port} npm run dev';
    } else if (scripts.start) command = 'PORT={port} npm start';
  }
  if (fs.existsSync(path.join(dir, 'manage.py'))) {
    stack.add('Django').add('Python');
    const py = fs.existsSync(path.join(dir, '.venv/bin/python')) ? '.venv/bin/python' : 'python3';
    command = `${py} manage.py runserver {port}`;
    installCommand = 'python3 -m venv .venv && .venv/bin/pip install -r requirements.txt';
  }
  if (!pkg && fs.existsSync(path.join(dir, 'requirements.txt'))) stack.add('Python');

  // Split projects (backend/ + frontend/) usually ship one launcher script at the root.
  // `bash` rather than ./ so it also works where the exec bit is lost (WSL on /mnt/c, zip downloads).
  if (!command) {
    const launcher = ['dev.sh', 'start.sh', 'run.sh'].find((f) => fs.existsSync(path.join(dir, f)));
    if (launcher) command = `PORT={port} bash ./${launcher}`;
  }
  if (fs.existsSync(path.join(dir, 'frontend/package.json'))) stack.add('Node');
  if (fs.existsSync(path.join(dir, 'backend/requirements.txt'))) stack.add('Python');

  const base = path.basename(dir);
  const name = titleCase(typeof pkg?.name === 'string' ? pkg.name.replace(/^@[^/]+\//, '') : base);
  const description = (typeof pkg?.description === 'string' && pkg.description) || firstParagraph(text);

  let port: number | null = null;
  if (command) {
    port = 3000;
    while (usedPorts.includes(port)) port += 10;
  }

  return {
    name,
    description,
    path: compactPath(dir),
    stack: [...stack],
    command,
    installCommand,
    port,
    scripts,
    readmeExcerpt: text.slice(0, 1500),
  };
}

export function details(rawPath: string): Details {
  const dir = expandPath(rawPath);
  if (!fs.existsSync(dir)) return { readme: '', scripts: {}, files: [] };
  const pkg = readJson(path.join(dir, 'package.json'));
  const files = fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.') && f !== 'node_modules')
    .sort()
    .slice(0, 40);
  return { readme: readme(dir).slice(0, 12_000), scripts: pkg ? workspaceScripts(dir, pkg) : {}, files };
}

/** Folders next to the registered projects that look like apps but are not registered yet. */
export function scanSiblings(registered: string[]): Array<{ path: string; name: string }> {
  const parents = new Set(registered.map((p) => path.dirname(expandPath(p))));
  const known = new Set(registered.map((p) => expandPath(p)));
  const out: Array<{ path: string; name: string }> = [];
  for (const parent of parents) {
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const full = path.join(parent, entry.name);
      if (known.has(full)) continue;
      const looksLikeApp = ['package.json', 'manage.py', 'requirements.txt', 'README.md', 'index.html'].some((f) =>
        fs.existsSync(path.join(full, f)),
      );
      if (looksLikeApp) out.push({ path: compactPath(full), name: titleCase(entry.name) });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
