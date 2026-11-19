import path from 'node:path';
import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { locateFolder } from '@/lib/locate';
import { expandPath } from '@/lib/paths';
import { HttpError } from '@/lib/procs';
import { readAll } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Turns a browser-picked folder (name + contents) into real paths on this machine. POST so the same-origin check applies. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: unknown; entries?: unknown };
    if (typeof body.name !== 'string' || !body.name || /[\\/]/.test(body.name)) throw new HttpError(400, 'A folder name is required.');
    const entries = Array.isArray(body.entries) ? body.entries.filter((x): x is string => typeof x === 'string').slice(0, 60) : [];
    const parents = readAll().map((p) => path.dirname(expandPath(p.path)));
    return NextResponse.json({ matches: locateFolder(body.name, entries, parents).slice(0, 8) });
  } catch (e) {
    return fail(e);
  }
}
