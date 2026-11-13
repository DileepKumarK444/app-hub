import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { HttpError, stopProject, viewOf } from '@/lib/procs';
import { getProject } from '@/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = getProject(id);
    if (!p) throw new HttpError(404, 'App not found.');
    const view = await viewOf(p);
    if (view.status === 'external') {
      throw new HttpError(409, `Port ${p.port} is held by a process this dashboard did not start. Stop it from its own terminal.`);
    }
    await stopProject(p);
    return NextResponse.json({ project: await viewOf(p) });
  } catch (e) {
    return fail(e);
  }
}
