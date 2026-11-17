'use client';
import { ChevronDown, LayoutGrid, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { call } from '@/lib/client';
import type { ProjectView } from '@/lib/types';
import { AddDialog } from './AddDialog';
import { Drawer, type TabId } from './Drawer';
import { DisabledRow, Tile, hueFor, type Actions } from './Tile';
import { ThemeToggle } from './ThemeToggle';
import { Modal } from './ui';

type Filter = 'all' | 'running' | 'stopped';

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectView | null>(null);
  const [showDisabled, setShowDisabled] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [hues, setHues] = useState<Record<string, number>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await call<{ projects: ProjectView[] }>('/api/projects');
      setProjects(r.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load apps.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => document.visibilityState === 'visible' && void refresh(), 3000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('apphub.order');
      if (raw) setOrder(JSON.parse(raw));
      const c = localStorage.getItem('apphub.hues');
      if (c) setHues(JSON.parse(c));
    } catch {
      /* ignore bad or blocked storage */
    }
  }, []);

  const setHue = (id: string, h: number) => {
    const next = { ...hues, [id]: h };
    setHues(next);
    try {
      localStorage.setItem('apphub.hues', JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
  };

  const saveOrder = useCallback((ids: string[]) => {
    setOrder(ids);
    try {
      localStorage.setItem('apphub.order', JSON.stringify(ids));
    } catch {
      /* storage blocked: order lasts for this session only */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.bad ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const withBusy = useCallback(
    async (id: string, fn: () => Promise<unknown>, okText?: string) => {
      setBusy((s) => new Set(s).add(id));
      try {
        await fn();
        if (okText) setToast({ text: okText, bad: false });
      } catch (e) {
        setToast({ text: e instanceof Error ? e.message : 'Something went wrong.', bad: true });
      } finally {
        setBusy((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        await refresh();
      }
    },
    [refresh],
  );

  const actions: Actions = useMemo(
    () => ({
      start: (p) => void withBusy(p.id, () => call(`/api/projects/${p.id}/start`, 'POST'), `${p.name} is starting`),
      stop: (p) => void withBusy(p.id, () => call(`/api/projects/${p.id}/stop`, 'POST'), `${p.name} stopped`),
      open: (p, t) => {
        setTab((t as TabId) ?? 'overview');
        setSelected(p.id);
      },
      disable: (p) => void withBusy(p.id, () => call(`/api/projects/${p.id}`, 'PATCH', { enabled: false }), `${p.name} disabled`),
      enable: (p) => void withBusy(p.id, () => call(`/api/projects/${p.id}`, 'PATCH', { enabled: true }), `${p.name} enabled`),
      remove: (p) => setRemoving(p),
    }),
    [withBusy],
  );

  const active = useMemo(() => {
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return (projects ?? []).filter((p) => p.enabled).sort((a, b) => rank(a.id) - rank(b.id));
  }, [projects, order]);

  const move = (id: string, targetId: string) => {
    if (id === targetId) return;
    const ids = active.map((p) => p.id);
    const to = ids.indexOf(targetId);
    ids.splice(ids.indexOf(id), 1);
    ids.splice(to, 0, id);
    saveOrder(ids);
  };
  const nudge = (id: string, dir: -1 | 1) => {
    const ids = visible.map((p) => p.id);
    const t = ids[ids.indexOf(id) + dir];
    if (t) move(id, t);
  };
  const disabled = (projects ?? []).filter((p) => !p.enabled);
  const runningCount = active.filter((p) => p.status === 'running' || p.status === 'starting').length;

  const visible = active.filter((p) => {
    const live = p.status === 'running' || p.status === 'starting';
    if (filter === 'running' && !live) return false;
    if (filter === 'stopped' && live) return false;
    const q = query.trim().toLowerCase();
    return !q || [p.name, p.description, ...p.stack, ...p.tags].join(' ').toLowerCase().includes(q);
  });

  const current = projects?.find((p) => p.id === selected) ?? null;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-5 pb-16 sm:px-8">
      <header className="flex flex-wrap items-center gap-4 py-7">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white dark:text-bg">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight tracking-tight">App Hub</h1>
            <p className="text-sm text-muted">
              {projects ? `${active.length} apps · ${runningCount} running` : 'Loading…'}
            </p>
          </div>
        </div>
        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              aria-label="Search apps"
              className="field !pl-9"
              placeholder="Search apps, stacks, tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ThemeToggle />
          <button className="btn btn-primary shrink-0" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add app
          </button>
        </div>
      </header>

      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Filter apps">
        {(['all', 'running', 'stopped'] as Filter[]).map((f) => {
          const n = f === 'all' ? active.length : f === 'running' ? runningCount : active.length - runningCount;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition ${filter === f ? 'bg-subtle text-ink' : 'text-muted hover:text-ink'}`}
            >
              {f} <span className="ml-1 text-xs text-muted">{n}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {projects === null && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <Tile
              key={p.id}
              p={p}
              busy={busy.has(p.id)}
              menuOpen={menuId === p.id}
              setMenuOpen={(open) => setMenuId((cur) => (open ? p.id : cur === p.id ? null : cur))}
              a={actions}
              hue={hues[p.id] ?? hueFor(p.id)}
              onHue={(h) => setHue(p.id, h)}
              drag={{
                dragging: dragId === p.id,
                over: !!dragId && overId === p.id && dragId !== p.id,
                onDragStart: () => setDragId(p.id),
                onDragEnter: () => setOverId(p.id),
                onDragEnd: () => (setDragId(null), setOverId(null)),
                onDrop: () => {
                  if (dragId) move(dragId, p.id);
                  setDragId(null);
                  setOverId(null);
                },
                onNudge: (d) => nudge(p.id, d),
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl2 border border-dashed border-line px-6 py-16 text-center">
          <p className="font-medium">{active.length === 0 ? 'No apps yet' : 'Nothing matches'}</p>
          <p className="mt-1 text-sm text-muted">
            {active.length === 0 ? 'Add a project folder and it shows up here as a tile.' : 'Try another search or filter.'}
          </p>
          {active.length === 0 && (
            <button className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add app
            </button>
          )}
        </div>
      )}

      {disabled.length > 0 && (
        <section className="mt-12">
          <button
            className="mb-3 flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
            aria-expanded={showDisabled}
            onClick={() => setShowDisabled((s) => !s)}
          >
            <ChevronDown size={16} className={`transition ${showDisabled ? '' : '-rotate-90'}`} />
            Disabled ({disabled.length})
          </button>
          {showDisabled && (
            <div className="grid gap-3 lg:grid-cols-2">
              {disabled.map((p) => (
                <DisabledRow key={p.id} p={p} a={actions} />
              ))}
            </div>
          )}
        </section>
      )}

      {current && (
        <Drawer
          p={current}
          tab={tab}
          setTab={setTab}
          busy={busy.has(current.id)}
          a={actions}
          onClose={() => setSelected(null)}
          onSaved={() => void refresh()}
        />
      )}

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onAdded={async (id) => {
            setAdding(false);
            await refresh();
            setTab('run');
            setSelected(id);
            setToast({ text: 'App added', bad: false });
          }}
        />
      )}

      {removing && (
        <Modal title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)}>
          <p className="text-sm leading-relaxed text-muted">
            This removes the tile from the dashboard and stops the app if it is running. Your project folder and its files are not touched. You can add it again later.
            If you only want to hide it for now, use Disable instead.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={() => setRemoving(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={() => {
                const p = removing;
                setRemoving(null);
                if (selected === p.id) setSelected(null);
                void withBusy(p.id, () => call(`/api/projects/${p.id}`, 'DELETE'), `${p.name} removed`);
              }}
            >
              <Trash2 size={15} /> Remove
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          className={`fade-in fixed bottom-6 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lift ${toast.bad ? 'bg-bad text-white dark:text-bg' : 'bg-ink text-bg'}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
