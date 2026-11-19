import { execFile } from 'node:child_process';
import { homedir, release } from 'node:os';
import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { HttpError } from '@/lib/procs';

export const dynamic = 'force-dynamic';

const TIMEOUT = 5 * 60_000;
const PROMPT = "Choose your app's project folder";

/** Runs a command; resolves with trimmed stdout, or null when the user cancelled (exit 1 / -128). */
function run(cmd: string, args: string[], cancelled: (code: unknown, stderr: string) => boolean): Promise<string | null> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: TIMEOUT }, (err, stdout, stderr) => {
      if (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return reject(new HttpError(501, `${cmd} is not installed, so the folder picker is unavailable. Type the path instead.`));
        return cancelled((err as { code?: unknown }).code, stderr) ? resolve(null) : reject(new HttpError(500, 'Could not open the folder picker.'));
      }
      resolve(stdout.trim() || null);
    });
  });
}

const isWSL = () => process.platform === 'linux' && /microsoft|wsl/i.test(release());

async function pick(): Promise<string | null> {
  if (process.platform === 'darwin') {
    const script = `POSIX path of (choose folder with prompt "${PROMPT}" default location POSIX file "${homedir()}/Developer")`;
    const out = await run('osascript', ['-e', script], (_c, stderr) => /-128|User canceled/i.test(stderr));
    return out && out.replace(/\/$/, '');
  }

  if (isWSL()) {
    // Windows' own folder dialog, then translate C:\Users\me\app -> /mnt/c/Users/me/app
    const ps = `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '${PROMPT.replace(/'/g, "''")}'; $d.ShowNewFolderButton = $false; if ($d.ShowDialog() -eq 'OK') { [Console]::Out.Write($d.SelectedPath) }`;
    const win = await run('powershell.exe', ['-NoProfile', '-STA', '-Command', ps], () => false);
    if (!win) return null;
    const linux = await run('wslpath', ['-u', win], () => false);
    return linux && linux.replace(/\/$/, '');
  }

  if (process.platform === 'linux') {
    const out = await run('zenity', ['--file-selection', '--directory', `--title=${PROMPT}`], (code) => code === 1);
    return out && out.replace(/\/$/, '');
  }

  throw new HttpError(501, 'The folder picker is not available on this system. Type the path instead.');
}

/** Opens a native folder picker on the machine running the dashboard. POST so the middleware's same-origin check applies. */
export async function POST() {
  try {
    return NextResponse.json({ path: await pick() });
  } catch (e) {
    return fail(e);
  }
}
