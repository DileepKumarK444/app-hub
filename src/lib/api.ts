import { NextResponse } from 'next/server';
import { HttpError } from './procs';

export function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  const message = e instanceof Error ? e.message : 'Unexpected error';
  return NextResponse.json({ error: message }, { status: 500 });
}
