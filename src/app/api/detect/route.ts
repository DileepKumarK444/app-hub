import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { detect } from '@/lib/detect';
import { HttpError } from '@/lib/procs';
import { readAll } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams.get('path');
    if (!p) throw new HttpError(400, 'path is required.');
    const used = readAll().flatMap((x) => (x.port ? [x.port] : []));
    try {
      return NextResponse.json(detect(p, used));
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Could not read that folder.');
    }
  } catch (e) {
    return fail(e);
  }
}
