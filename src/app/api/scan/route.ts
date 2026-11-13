import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { scanSiblings } from '@/lib/detect';
import { readAll } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ candidates: scanSiblings(readAll().map((p) => p.path)) });
  } catch (e) {
    return fail(e);
  }
}
