import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { DASHBOARD_PORT } from '@/lib/paths';
import { HttpError, viewOf } from '@/lib/procs';
import { addProject, readAll } from '@/lib/store';
import { validatePort } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await Promise.all(readAll().map(viewOf));
    return NextResponse.json({ projects, dashboardPort: DASHBOARD_PORT });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body.name !== 'string' || !body.name.trim()) throw new HttpError(400, 'Name is required.');
    if (typeof body.path !== 'string' || !body.path.trim()) throw new HttpError(400, 'Folder path is required.');
    validatePort(body.port ?? null, null);
    const project = addProject({ ...body, name: body.name.trim(), enabled: true });
    return NextResponse.json({ project: await viewOf(project) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
