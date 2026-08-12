import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('rt_session')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  // Jika belum login dan mencoba mengakses dasbor utama (/), arahkan ke /login
  if (!sessionToken && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login dan mencoba membuka halaman /login, arahkan ke dasbor utama (/)
  if (sessionToken && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};
