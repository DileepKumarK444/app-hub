'use client';
import { useState } from 'react';
import type { Project } from '@/lib/types';

export type FormValues = Pick<
  Project,
  'name' | 'description' | 'path' | 'port' | 'command' | 'installCommand' | 'url' | 'notes' | 'stack' | 'tags'
>;

const list = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export function ProjectForm({
  initial,
  submitLabel,
  lockPath = false,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  lockPath?: boolean;
  onSubmit: (v: FormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState({
    name: initial.name,
    description: initial.description,
    path: initial.path,
    port: initial.port?.toString() ?? '',
    command: initial.command ?? '',
    installCommand: initial.installCommand ?? '',
    url: initial.url ?? '',
    notes: initial.notes ?? '',
    stack: initial.stack.join(', '),
    tags: initial.tags.join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const port = v.port.trim() === '' ? null : Number(v.port);
    if (port !== null && (!Number.isInteger(port) || port < 1024 || port > 65535)) {
      setError('Port must be a whole number between 1024 and 65535.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: v.name.trim(),
        description: v.description.trim(),
        path: v.path.trim(),
        port,
        command: v.command.trim() || null,
        installCommand: v.installCommand.trim() || null,
        url: v.url.trim() || null,
        notes: v.notes.trim() || null,
        stack: list(v.stack),
        tags: list(v.tags),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="f-name">Name</label>
        <input id="f-name" required className="field" value={v.name} onChange={set('name')} />
      </div>
      <div>
        <label className="label" htmlFor="f-desc">Description</label>
        <textarea id="f-desc" rows={2} className="field" value={v.description} onChange={set('description')} />
      </div>
      <div>
        <label className="label" htmlFor="f-path">Project folder</label>
        <input id="f-path" required readOnly={lockPath} className="field font-mono text-xs" value={v.path} onChange={set('path')} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="f-port">Port</label>
          <input id="f-port" inputMode="numeric" placeholder="none" className="field" value={v.port} onChange={set('port')} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="f-cmd">Run command</label>
          <input id="f-cmd" placeholder="npm run dev -- -p {port}" className="field font-mono text-xs" value={v.command} onChange={set('command')} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">
        <code className="rounded bg-subtle px-1">{'{port}'}</code> is replaced with the port above, and the app also gets it as the PORT environment variable.
      </p>
      <div>
        <label className="label" htmlFor="f-install">Setup command (run once, shown in the Run tab)</label>
        <input id="f-install" className="field font-mono text-xs" value={v.installCommand} onChange={set('installCommand')} />
      </div>
      <div>
        <label className="label" htmlFor="f-url">Open URL (optional, defaults to http://localhost:port)</label>
        <input id="f-url" className="field font-mono text-xs" value={v.url} onChange={set('url')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-stack">Stack (comma separated)</label>
          <input id="f-stack" className="field" value={v.stack} onChange={set('stack')} />
        </div>
        <div>
          <label className="label" htmlFor="f-tags">Tags (comma separated)</label>
          <input id="f-tags" className="field" value={v.tags} onChange={set('tags')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="f-notes">Notes</label>
        <textarea id="f-notes" rows={2} className="field" value={v.notes} onChange={set('notes')} />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
