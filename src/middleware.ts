import { NextResponse, type NextRequest } from 'next/server';

/**
 * The dashboard can run shell commands, so only the local machine may talk to its API:
 * - the Host header must be loopback (blocks DNS-rebinding),
 * - state-changing requests must come from this same origin (blocks other websites).
 */
const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  if (!LOOPBACK.test(host)) return new NextResponse('Forbidden', { status: 403 });

  if (req.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (!origin || new URL(origin).host !== host) return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
