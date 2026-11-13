import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { details } from '@/lib/detect';
import { HttpError } from '@/lib/procs';
import { getProject } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = getProject(id);
    if (!p) throw new HttpError(404, 'App not found.');
    return NextResponse.json(details(p.path));
  } catch (e) {
    return fail(e);
  }
}
