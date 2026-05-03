import { NextResponse, type NextRequest } from 'next/server';

// Light-weight gate: bounce unauthenticated traffic to /login.
// Real auth check still happens server-side in route handlers / pages.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  const cookie = req.cookies.get('ascended_session');
  if (!cookie && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
