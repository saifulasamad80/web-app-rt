import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = request.cookies.get('rt_session')?.value;

  // Proteksi khusus untuk rute /rt
  if (path.startsWith('/rt')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Jika sudah login dan membuka /login, alihkan ke /rt
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/rt', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/rt/:path*', '/login'],
};
