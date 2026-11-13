import type { ListingRef, Site } from '../types';

const ID_SITES: { site: Site; host: string }[] = [
  { site: 'olx', host: 'olx.ro' },
  { site: 'storia', host: 'storia.ro' },
  // shortcut: imobiliare.ro URL format not confirmed yet, returns null until a real URL is added to the tests (stretch goal).
];

const onHost = (hostname: string, host: string) => hostname === host || hostname.endsWith(`.${host}`);

export function parseListingUrl(url: string, demoOrigin?: string): ListingRef | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (demoOrigin && u.origin === new URL(demoOrigin).origin) {
    const m = u.pathname.match(/^\/demo\/listing\/([^/]+)\/?$/);
    return m?.[1] ? { site: 'demo', listingId: m[1] } : null;
  }
  const match = ID_SITES.find((s) => onHost(u.hostname, s.host));
  if (!match) return null;
  const at = u.pathname.lastIndexOf('-ID');
  if (at < 0) return null;
  const listingId = u.pathname.slice(at + 3).replace(/\.html$/, '').replace(/\/$/, '');
  return listingId ? { site: match.site, listingId } : null;
}

export const listingKey = (ref: ListingRef): string => `${ref.site}:${ref.listingId}`;
