'use client';
import { EyeOff, ExternalLink, GripVertical, MoreHorizontal, Palette, Play, RotateCcw, Square, Trash2, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ProjectView } from '@/lib/types';
import { Monogram, StatusPill, hueOf } from './ui';

export type Actions = {
  start: (p: ProjectView) => void;
  stop: (p: ProjectView) => void;
  open: (p: ProjectView, tab?: string) => void;
  disable: (p: ProjectView) => void;
  enable: (p: ProjectView) => void;
  remove: (p: ProjectView) => void;
};

export const HUES = [345, 215, 265, 150, 25, 190, 45, 320];
export const hueFor = (id: string) => HUES[hueOf(id) % HUES.length];

export type DragProps = {
  dragging: boolean;
  over: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onNudge: (dir: -1 | 1) => void;
};

export function Tile({ p, busy, a, drag, hue, onHue, menuOpen: menu, setMenuOpen: setMenu }: { p: ProjectView; busy: boolean; a: Actions; drag: DragProps; hue: number; onHue: (h: number) => void; menuOpen: boolean; setMenuOpen: (open: boolean) => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu, setMenu]);
  const live = p.status === 'running' || p.status === 'starting';
  const runnable = !!p.command;
  const style = { '--h': hue } as React.CSSProperties;

  return (
    <article
      draggable
      style={style}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', p.id);
        drag.onDragStart();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={drag.onDragEnter}
      onDragEnd={drag.onDragEnd}
      onDrop={(e) => (e.preventDefault(), drag.onDrop())}
      className={`tile group relative ${menu ? 'z-30' : ''} flex flex-col rounded-2xl p-3.5 transition hover:-translate-y-0.5 hover:shadow-lift ${drag.dragging ? 'tile-dragging' : ''} ${drag.over ? 'tile-over' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div aria-hidden className="tile-badge grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
          {p.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <button className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ts)]" onClick={() => a.open(p)}>
            {p.name}
          </button>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusPill
              status={p.status}
              title={p.status === 'external' ? `Something is already listening on port ${p.port} (not started from here)` : undefined}
            />
            {p.port && <span className="tile-muted font-mono text-[11px]">:{p.port}</span>}
          </div>
        </div>
        <button
          className="tile-muted -mr-1 cursor-grab rounded p-1 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-70"
          aria-label={`Reorder ${p.name}. Use left and right arrow keys, or drag the tile.`}
          title="Drag to reorder"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), drag.onNudge(-1));
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), drag.onNudge(1));
          }}
        >
          <GripVertical size={16} />
        </button>
        <div className="relative" ref={menuRef}>
          <button className="ibtn !h-7 !w-7 !bg-transparent" aria-label={`More actions for ${p.name}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <MoreHorizontal size={16} />
          </button>
          {menu && (
            <>
              <div role="menu" className="fade-in absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1 text-ink shadow-lift">
                <div className="px-3 pb-2 pt-1.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted"><Palette size={13} /> Colour</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HUES.map((h) => (
                      <button
                        key={h}
                        role="menuitemradio"
                        aria-checked={h === hue}
                        aria-label={`Colour ${h}`}
                        onClick={() => onHue(h)}
                        className={`h-5 w-5 rounded-full transition hover:scale-110 ${h === hue ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                        style={{ background: `hsl(${h} 78% 58%)` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="my-1 border-t border-line" />
                <MenuItem icon={<FileText size={15} />} onClick={() => (setMenu(false), a.open(p))}>Details</MenuItem>
                <MenuItem icon={<EyeOff size={15} />} onClick={() => (setMenu(false), a.disable(p))}>Disable</MenuItem>
                <MenuItem danger icon={<Trash2 size={15} />} onClick={() => (setMenu(false), a.remove(p))}>Remove…</MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="tile-muted mt-2.5 line-clamp-1 text-xs leading-relaxed">{p.description || 'No description yet.'}</p>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1 overflow-hidden">
          {p.stack.slice(0, 2).map((s) => (
            <span key={s} className="tile-chip rounded-md px-1.5 py-0.5 text-[10px] font-medium">{s}</span>
          ))}
          {p.stack.length > 2 && <span className="tile-chip rounded-md px-1.5 py-0.5 text-[10px] font-medium">+{p.stack.length - 2}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!runnable ? (
            <button className="ibtn" aria-label={`Docs for ${p.name}`} title="Docs only" onClick={() => a.open(p, 'overview')}>
              <FileText size={14} />
            </button>
          ) : live ? (
            <button className="ibtn ibtn-solid" aria-label={`Stop ${p.name}`} title="Stop" disabled={busy} onClick={() => a.stop(p)}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} fill="currentColor" />}
            </button>
          ) : p.status === 'external' ? (
            <button className="ibtn" aria-label={`${p.name} is running outside the dashboard`} title="Running outside the dashboard" onClick={() => a.open(p, 'run')}>
              <Square size={13} className="opacity-50" />
            </button>
          ) : (
            <button className="ibtn ibtn-solid" aria-label={`Start ${p.name}`} title="Start" disabled={busy || !p.pathExists} onClick={() => a.start(p)}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            </button>
          )}
          {p.openUrl &&
            (live || p.status === 'external' ? (
              <a className="ibtn" aria-label={`Open ${p.name}`} title="Open" href={p.openUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
              </a>
            ) : (
              <button className="ibtn" disabled aria-label="Open (start the app first)" title="Start the app first">
                <ExternalLink size={14} />
              </button>
            ))}
        </div>
      </div>

      {!p.pathExists && <p className="mt-2 rounded-lg bg-warn/10 px-2.5 py-1 text-[11px] text-warn">Folder not found: {p.path}</p>}
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
