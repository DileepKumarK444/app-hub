import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { HttpError, startProject, viewOf } from '@/lib/procs';
import { getProject } from '@/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = getProject(id);
    if (!p) throw new HttpError(404, 'App not found.');
    await startProject(p);
    return NextResponse.json({ project: await viewOf(p) });
  } catch (e) {
    return fail(e);
  }
}
