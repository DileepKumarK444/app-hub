'use client';
import { EyeOff, ExternalLink, MoreHorizontal, Play, RotateCcw, Square, Trash2, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ProjectView } from '@/lib/types';
import { Chip, Monogram, StatusPill } from './ui';

export type Actions = {
  start: (p: ProjectView) => void;
  stop: (p: ProjectView) => void;
  open: (p: ProjectView, tab?: string) => void;
  disable: (p: ProjectView) => void;
  enable: (p: ProjectView) => void;
  remove: (p: ProjectView) => void;
};

export function Tile({ p, busy, a }: { p: ProjectView; busy: boolean; a: Actions }) {
  const [menu, setMenu] = useState(false);
  const live = p.status === 'running' || p.status === 'starting';
  const runnable = !!p.command;

  return (
    <article className="group relative flex flex-col rounded-xl2 border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3.5">
        <Monogram name={p.name} />
        <div className="min-w-0 flex-1">
          <button className="block max-w-full truncate text-left text-[15px] font-semibold hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => a.open(p)}>
            {p.name}
          </button>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusPill
              status={p.status}
              title={p.status === 'external' ? `Something is already listening on port ${p.port} (not started from here)` : undefined}
            />
            {p.port && <span className="font-mono text-xs text-muted">:{p.port}</span>}
          </div>
        </div>
        <div className="relative">
          <button className="btn btn-ghost !p-1.5" aria-label={`More actions for ${p.name}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div role="menu" className="fade-in absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lift">
                <MenuItem icon={<FileText size={15} />} onClick={() => (setMenu(false), a.open(p))}>Details</MenuItem>
                <MenuItem icon={<EyeOff size={15} />} onClick={() => (setMenu(false), a.disable(p))}>Disable</MenuItem>
                <MenuItem danger icon={<Trash2 size={15} />} onClick={() => (setMenu(false), a.remove(p))}>Remove…</MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-3.5 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-muted">{p.description || 'No description yet.'}</p>

      <div className="mt-3 flex min-h-[1.5rem] flex-wrap gap-1.5">
        {p.stack.slice(0, 4).map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
        {p.stack.length > 4 && <Chip>+{p.stack.length - 4}</Chip>}
      </div>

      {!p.pathExists && <p className="mt-3 rounded-lg bg-warn/10 px-3 py-1.5 text-xs text-warn">Folder not found: {p.path}</p>}

      <div className="mt-5 flex items-center gap-2">
        {!runnable ? (
          <button className="btn flex-1" onClick={() => a.open(p, 'overview')}>
            <FileText size={15} /> Docs only
          </button>
        ) : live ? (
          <button className="btn flex-1" disabled={busy} onClick={() => a.stop(p)}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Square size={14} />} Stop
          </button>
        ) : p.status === 'external' ? (
          <button className="btn flex-1" onClick={() => a.open(p, 'run')} title="Running outside the dashboard">
            <Square size={14} className="opacity-40" /> Not managed
          </button>
        ) : (
          <button className="btn btn-primary flex-1" disabled={busy || !p.pathExists} onClick={() => a.start(p)}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} />} Start
          </button>
        )}
        {p.openUrl && (live || p.status === 'external') ? (
          <a className={`btn ${p.status === 'running' || p.status === 'external' ? 'btn-primary' : ''} flex-1`} href={p.openUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Open
          </a>
        ) : p.openUrl ? (
          <button className="btn flex-1" disabled title="Start the app first">
            <ExternalLink size={14} /> Open
          </button>
        ) : null}
      </div>
    </article>
  );
}

function MenuItem({ children, icon, onClick, danger = false }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-subtle ${danger ? 'text-bad' : ''}`}>
      {icon} {children}
    </button>
  );
}

export function DisabledRow({ p, a }: { p: ProjectView; a: Actions }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-3">
      <Monogram name={p.name} size={36} dim />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted">{p.name}</p>
        <p className="truncate text-xs text-muted/80">{p.path}{p.port ? ` · port ${p.port}` : ''}</p>
      </div>
      <button className="btn" onClick={() => a.enable(p)}>
        <RotateCcw size={14} /> Enable
      </button>
      <button className="btn btn-ghost !p-2 text-bad" aria-label={`Remove ${p.name}`} onClick={() => a.remove(p)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}
