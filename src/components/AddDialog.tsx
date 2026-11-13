'use client';
import { FolderSearch, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { call } from '@/lib/client';
import type { Detected } from '@/lib/types';
import { ProjectForm } from './ProjectForm';
import { Modal } from './ui';

export function AddDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [path, setPath] = useState('~/Documents/My Projects/');
  const [found, setFound] = useState<Detected | null>(null);
  const [candidates, setCandidates] = useState<Array<{ path: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ candidates: Array<{ path: string; name: string }> }>('/api/scan')
      .then((r) => setCandidates(r.candidates))
      .catch(() => undefined);
  }, []);

  async function detect(p: string) {
    setBusy(true);
    setError(null);
    try {
      setFound(await call<Detected>(`/api/detect?path=${encodeURIComponent(p)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that folder.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={found ? 'Add app' : 'Add an app'} onClose={onClose} wide>
      {!found ? (
        <div className="space-y-5">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void detect(path);
            }}
          >
            <label className="label" htmlFor="add-path">Project folder</label>
            <div className="flex gap-2">
              <input id="add-path" autoFocus className="field font-mono text-xs" value={path} onChange={(e) => setPath(e.target.value)} placeholder="~/Documents/My Projects/my-app" />
              <button className="btn btn-primary shrink-0" disabled={busy || !path.trim()}>
                <Sparkles size={15} /> {busy ? 'Reading…' : 'Detect'}
              </button>
            </div>
            <p className="text-xs text-muted">The dashboard reads package.json and the README to suggest a name, stack, run command and port. You can edit everything next.</p>
            {error && <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
          </form>

          {candidates.length > 0 && (
            <div>
              <p className="label flex items-center gap-1.5"><FolderSearch size={14} /> Found next to your other apps</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button key={c.path} className="btn" onClick={() => void detect(c.path)} title={c.path}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ProjectForm
          initial={{ ...found, url: null, notes: null, tags: [] }}
          submitLabel="Add to dashboard"
          lockPath
          onCancel={() => setFound(null)}
          onSubmit={async (v) => {
            const r = await call<{ project: { id: string } }>('/api/projects', 'POST', v);
            onAdded(r.project.id);
          }}
        />
      )}
    </Modal>
  );
}
