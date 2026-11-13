'use client';
import { Check, Copy, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { RunStatus } from '@/lib/types';

export function hueOf(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Monogram({ name, size = 44, dim = false }: { name: string; size?: number; dim?: boolean }) {
  const h = hueOf(name);
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${h} 72% 56%), hsl(${(h + 40) % 360} 70% 44%))`,
        opacity: dim ? 0.5 : 1,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

const STATUS: Record<RunStatus, { label: string; dot: string; text: string }> = {
  running: { label: 'Running', dot: 'bg-ok pulse', text: 'text-ok' },
  starting: { label: 'Starting', dot: 'bg-warn animate-pulse', text: 'text-warn' },
  external: { label: 'In use', dot: 'bg-accent', text: 'text-accent' },
  stopped: { label: 'Stopped', dot: 'bg-muted/50', text: 'text-muted' },
};

export function StatusPill({ status, title }: { status: RunStatus; title?: string }) {
  const s = STATUS[status];
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted">{children}</span>;
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-2 !py-1 text-xs"
      aria-label={`${label}: ${text}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function CodeLine({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2">
      <code className="min-w-0 break-all font-mono text-[12.5px] leading-relaxed">{text}</code>
      <CopyButton text={text} />
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fade-in fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-surface shadow-lift ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
