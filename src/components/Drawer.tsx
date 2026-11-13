'use client';
import { ExternalLink, Loader2, Play, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { call } from '@/lib/client';
import type { Details, ProjectView } from '@/lib/types';
import type { Actions } from './Tile';
import { ProjectForm } from './ProjectForm';
import { Chip, CodeLine, CopyButton, Monogram, StatusPill } from './ui';

const TABS = [
  ['overview', 'Overview'],
  ['run', 'How to run'],
  ['logs', 'Logs'],
  ['settings', 'Settings'],
] as const;
export type TabId = (typeof TABS)[number][0];

export function Drawer({
  p,
  tab,
  setTab,
  busy,
  a,
  onClose,
  onSaved,
}: {
  p: ProjectView;
  tab: TabId;
  setTab: (t: TabId) => void;
  busy: boolean;
  a: Actions;
  onClose: () => void;
  onSaved: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const live = p.status === 'running' || p.status === 'starting';

  return (
    <div className="fade-in fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-label={`${p.name} details`}
        className="slide-in absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col border-l border-line bg-bg shadow-lift"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="border-b border-line bg-surface px-6 pb-0 pt-5">
          <div className="flex items-start gap-3.5">
            <Monogram name={p.name} size={48} dim={!p.enabled} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold">{p.name}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                {p.enabled ? <StatusPill status={p.status} /> : <span className="text-xs font-medium text-muted">Disabled</span>}
                {p.port && <span className="font-mono text-xs text-muted">:{p.port}</span>}
              </div>
            </div>
            <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close panel">
              <X size={18} />
            </button>
          </div>
          {p.enabled && (
            <div className="mt-4 flex gap-2">
              {p.command &&
                (live ? (
                  <button className="btn" disabled={busy} onClick={() => a.stop(p)}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Square size={14} />} Stop
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled={busy || p.status === 'external' || !p.pathExists} onClick={() => a.start(p)}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} />} Start
                  </button>
                ))}
              {p.openUrl && (
                <a className="btn" href={p.openUrl} target="_blank" rel="noreferrer" aria-disabled={!(live || p.status === 'external')} style={!(live || p.status === 'external') ? { pointerEvents: 'none', opacity: 0.45 } : undefined}>
                  <ExternalLink size={14} /> Open {p.openUrl.replace('http://', '')}
                </a>
              )}
            </div>
          )}
          <nav className="-mb-px mt-4 flex gap-1" role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === 'overview' && <Overview p={p} />}
          {tab === 'run' && <RunTab p={p} />}
          {tab === 'logs' && <Logs p={p} />}
          {tab === 'settings' && <Settings p={p} a={a} onSaved={onSaved} />}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

function useDetails(p: ProjectView) {
  const [d, setD] = useState<Details | null>(null);
  useEffect(() => {
    let live = true;
    setD(null);
    call<Details>(`/api/projects/${p.id}/details`)
      .then((r) => live && setD(r))
      .catch(() => live && setD({ readme: '', scripts: {}, files: [] }));
    return () => {
      live = false;
    };
  }, [p.id, p.path]);
  return d;
}

function Overview({ p }: { p: ProjectView }) {
  const d = useDetails(p);
  return (
    <>
      <p className="mb-6 text-sm leading-relaxed">{p.description || <span className="text-muted">No description yet. Add one in Settings.</span>}</p>
      <Section title="Location">
        <CodeLine text={p.path} />
      </Section>
      {(p.stack.length > 0 || p.tags.length > 0) && (
        <Section title="Stack">
          <div className="flex flex-wrap gap-1.5">
            {p.stack.map((s) => <Chip key={s}>{s}</Chip>)}
            {p.tags.map((s) => <span key={s} className="rounded-md border border-line px-2 py-0.5 text-[11px] font-medium text-muted">#{s}</span>)}
          </div>
        </Section>
      )}
      <Section title="README">
        {d === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : d.readme ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 font-sans text-[13px] leading-relaxed text-ink/90">{d.readme}</pre>
        ) : (
          <p className="text-sm text-muted">No README found in this folder.</p>
        )}
      </Section>
    </>
  );
}

function RunTab({ p }: { p: ProjectView }) {
  const d = useDetails(p);
  const cmd = p.command ? p.command.replaceAll('{port}', String(p.port ?? '')) : null;
  const scripts = d ? Object.entries(d.scripts) : [];
  return (
    <>
      {p.notes && <p className="mb-6 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm leading-relaxed">{p.notes}</p>}
      <Section title="From the dashboard">
        <p className="text-sm text-muted">
          {cmd ? 'Press Start. The dashboard runs the command below inside the project folder and gives it the port.' : 'This app has no run command, so there is nothing to start. Add one in Settings if it should be runnable.'}
        </p>
      </Section>
      <Section title="By hand in a terminal">
        <ol className="space-y-3 text-sm">
          <li>
            <p className="mb-1.5 font-medium">1. Go to the folder</p>
            <CodeLine text={`cd ${p.path}`} />
          </li>
          {p.installCommand && (
            <li>
              <p className="mb-1.5 font-medium">2. First-time setup</p>
              <CodeLine text={p.installCommand} />
            </li>
          )}
          {cmd && (
            <li>
              <p className="mb-1.5 font-medium">{p.installCommand ? '3' : '2'}. Start it</p>
              <CodeLine text={cmd} />
            </li>
          )}
          {p.openUrl && (
            <li>
              <p className="mb-1.5 font-medium">{p.installCommand ? '4' : '3'}. Open it</p>
              <CodeLine text={p.openUrl} />
            </li>
          )}
        </ol>
      </Section>
      {scripts.length > 0 && (
        <Section title="Other scripts in package.json">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {scripts.map(([name, body]) => (
              <li key={name} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <code className="text-[13px] font-semibold">npm run {name}</code>
                  <p className="truncate font-mono text-[11.5px] text-muted" title={body}>{body}</p>
                </div>
                <CopyButton text={`npm run ${name}`} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function Logs({ p }: { p: ProjectView }) {
  const [text, setText] = useState('');
  const box = useRef<HTMLPreElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      call<{ logs: string }>(`/api/projects/${p.id}/logs`)
        .then((r) => alive && setText(r.logs))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [p.id]);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted">Output of the last run, refreshed every 1.5s</span>
        {text && <CopyButton text={text} label="Copy log" />}
      </div>
      <pre
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-[#0d1117] p-4 font-mono text-[12px] leading-relaxed text-[#d6dde8]"
      >
        {text || 'No output yet. Start the app to see its logs here.'}
      </pre>
    </div>
  );
}

function Settings({ p, a, onSaved }: { p: ProjectView; a: Actions; onSaved: () => void }) {
  const [saved, setSaved] = useState(false);
  const running = p.status === 'running' || p.status === 'starting';
  return (
    <>
      {running && <p className="mb-4 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">Running now. Port and command changes apply the next time you start it.</p>}
      <ProjectForm
        key={p.id}
        initial={p}
        submitLabel="Save changes"
        onSubmit={async (v) => {
          await call(`/api/projects/${p.id}`, 'PATCH', v);
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          onSaved();
        }}
      />
      {saved && <p role="status" className="mt-3 text-right text-sm text-ok">Saved.</p>}
      <div className="mt-8 rounded-xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">{p.enabled ? 'Hide from the dashboard' : 'Disabled'}</h3>
        <p className="mt-1 text-sm text-muted">
          {p.enabled ? 'Disabling stops the app and moves it to the Disabled list. Nothing is deleted and you can enable it again any time.' : 'This app is hidden and cannot be started.'}
        </p>
        <div className="mt-3 flex gap-2">
          {p.enabled ? (
            <button className="btn" onClick={() => a.disable(p)}>Disable</button>
          ) : (
            <button className="btn btn-primary" onClick={() => a.enable(p)}>Enable</button>
          )}
          <button className="btn btn-danger" onClick={() => a.remove(p)}>Remove…</button>
        </div>
      </div>
    </>
  );
}
