import { NextResponse } from 'next/server';

const decodeTokenPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export function middleware(req) {
  const pathname = req.nextUrl.pathname;

  if (!pathname.startsWith('/users')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('pos-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = decodeTokenPayload(token);
  const role = String(payload?.role || '').toUpperCase();

  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/users/:path*'],
};
