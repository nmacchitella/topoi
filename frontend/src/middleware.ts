import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/verification-required',
  '/auth/callback',
];

// Route patterns that are public (for dynamic routes)
const publicPatterns = [
  /^\/share\/.+$/,           // /share/[token]
  /^\/shared\/place\/.+$/,   // /shared/place/[id]
  /^\/shared\/collection\/.+$/, // /shared/collection/[id]
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.includes(pathname) ||
                        publicPatterns.some(pattern => pattern.test(pathname));

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for authentication tokens
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // If we have either token, allow access - the client-side will handle refresh if needed
  // Only redirect to login if BOTH tokens are missing
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    // Add return URL so user can be redirected back after login
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User has tokens, allow access (client-side refresh interceptor will handle expired access tokens)
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
