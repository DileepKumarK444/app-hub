import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { HttpError, stopProject, viewOf } from '@/lib/procs';
import { getProject, removeProject, updateProject } from '@/lib/store';
import { validatePort } from '@/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = ['name', 'description', 'path', 'stack', 'tags', 'port', 'command', 'installCommand', 'notes', 'url', 'enabled'];

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const current = getProject(id);
    if (!current) throw new HttpError(404, 'App not found.');
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of EDITABLE) if (k in body) patch[k] = body[k];

    if ('port' in patch) validatePort(patch.port, id);
    // Re-enabling must not clash with a port another app took in the meantime.
    if (patch.enabled === true && !current.enabled) validatePort(current.port, id);
    if (patch.enabled === false) await stopProject(current);

    const updated = updateProject(id, patch);
    return NextResponse.json({ project: await viewOf(updated!) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const current = getProject(id);
    if (!current) throw new HttpError(404, 'App not found.');
    await stopProject(current);
    removeProject(id); // only the dashboard entry is removed, never the project folder
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
