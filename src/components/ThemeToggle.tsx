'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Pref = 'light' | 'dark' | 'system';
const KEY = 'apphub-theme';

function apply(pref: Pref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [pref, setPref] = useState<Pref>('system');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPref(saved);
    } catch {
      /* storage blocked: stay on system */
    }
  }, []);

  // Follow the OS while on "system".
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);

  function choose(next: Pref) {
    setPref(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }

  const options: Array<[Pref, string, React.ReactNode]> = [
    ['light', 'Light', <Sun key="l" size={15} />],
    ['system', 'System', <Monitor key="s" size={15} />],
    ['dark', 'Dark', <Moon key="d" size={15} />],
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex shrink-0 rounded-lg border border-line bg-surface p-0.5">
      {options.map(([id, label, icon]) => (
        <button
          key={id}
          role="radio"
          aria-checked={pref === id}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => choose(id)}
          className={`grid h-8 w-8 place-items-center rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${pref === id ? 'bg-subtle text-ink' : 'text-muted hover:text-ink'}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
