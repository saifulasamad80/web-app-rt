import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('rt_session')?.value;

  // Bebaskan akses publik untuk rute /checkin/* dan /login
  if (pathname.startsWith('/checkin') || pathname === '/login') {
    if (sessionToken && pathname === '/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Proteksi rute /admin, /owner, dan / utama
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
