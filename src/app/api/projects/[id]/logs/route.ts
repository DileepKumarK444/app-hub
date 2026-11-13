import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { readLogs } from '@/lib/procs';
import { getProject } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!getProject(id)) return NextResponse.json({ error: 'App not found.' }, { status: 404 });
    return NextResponse.json({ logs: readLogs(id) });
  } catch (e) {
    return fail(e);
  }
}
