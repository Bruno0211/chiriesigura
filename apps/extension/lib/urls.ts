import type { Extracted } from './extract';

const base = (appUrl: string) => appUrl.replace(/\/+$/, '');

/** GET /api/check with whatever the page had. The phone goes only to this comparison and is never logged. */
export function checkUrl(appUrl: string, e: Extracted): string {
  const q = new URLSearchParams();
  if (e.listing) {
    q.set('site', e.listing.site);
    q.set('listingId', e.listing.listingId);
  }
  if (e.code) q.set('code', e.code);
  if (e.phone) q.set('phone', e.phone);
  if (e.place) q.set('place', e.place);
  if (e.placeCoords) {
    q.set('placeLat', String(e.placeCoords.lat));
    q.set('placeLng', String(e.placeCoords.lng));
  }
  const qs = q.toString();
  return `${base(appUrl)}/api/check${qs ? `?${qs}` : ''}`;
}

/** The phone page a student opens at the viewing; ?code= lets it name the listing. */
export function viewingUrl(appUrl: string, verificationId: string, code: string | null): string {
  const path = `${base(appUrl)}/viewing/${encodeURIComponent(verificationId)}`;
  return code ? `${path}?code=${encodeURIComponent(code)}` : path;
}

/** Back to a "you are signed in" page; the listing tab re-checks by itself when the student returns to it. */
export const signInUrl = (appUrl: string): string => `${base(appUrl)}/auth/login?returnTo=/signed-in`;

/** The page sign-in from the badge returns to; the background then takes the student back to their listing. */
export function isSignedInPage(appUrl: string, url: string): boolean {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}` === `${base(appUrl)}/signed-in`;
  } catch {
    return false;
  }
}

export const verifyUrl = (appUrl: string): string => `${base(appUrl)}/verify`;

export const askMessage = (appUrl: string): string =>
  `Hi! Before I visit, could you verify your listing on ChirieSigură? It takes 2 minutes: ${verifyUrl(appUrl)}`;
