import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { HttpError } from '@/lib/procs';

export const dynamic = 'force-dynamic';

/** Opens the native macOS folder picker on the machine running the dashboard. POST so the middleware's same-origin check applies. */
export async function POST() {
  try {
    if (process.platform !== 'darwin') throw new HttpError(501, 'The folder picker is only available on macOS. Type the path instead.');
    const script = `POSIX path of (choose folder with prompt "Choose your app's project folder" default location POSIX file "${homedir()}/Developer")`;
    const path = await new Promise<string | null>((resolve, reject) => {
      execFile('osascript', ['-e', script], { timeout: 5 * 60_000 }, (err, stdout, stderr) => {
        if (err) return /-128|User canceled/i.test(stderr) ? resolve(null) : reject(new HttpError(500, 'Could not open the folder picker.'));
        resolve(stdout.trim().replace(/\/$/, '') || null);
      });
    });
    return NextResponse.json({ path });
  } catch (e) {
    return fail(e);
  }
}
