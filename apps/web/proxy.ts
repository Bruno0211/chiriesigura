import { auth0 } from './lib/auth0';

/** Mounts /auth/login, /auth/callback and /auth/logout, and keeps the student session rolling. */
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

// Student routes only: landlord and viewing flows never depend on Auth0 being configured or up.
export const config = {
  matcher: ['/auth/:path*', '/check', '/api/check'],
};
