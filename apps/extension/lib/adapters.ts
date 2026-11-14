import type { Site } from '@cs/shared';
import { MatchPattern } from 'wxt/utils/match-patterns';

/** Where a listing site keeps the parts of the page the badge reads. */
export interface SiteAdapter {
  site: Site;
  /** Extension match patterns (no port: match patterns cannot carry one). */
  matches: string[];
  /** The listing's own description. Codes anywhere else (similar listings, other ads) are ignored. */
  descriptionSelector: string;
  /** The landlord's phone once it is shown on the page. */
  phoneSelector?: string;
  /** Where the listing says the flat is, as text (each line of the element becomes one part). */
  placeSelector?: string;
  /** Exact coordinates of the flat, when the site puts them in the page. */
  placeCoords?: (doc: Document, url: string) => { lat: number; lng: number } | null;
}

/** Storia shows a ~100 m circle when it knows the street; a wider one is a district or city centre, not the flat. */
const STORIA_EXACT_RADIUS_M = 500;

/** Storia's page data carries the flat's coordinates (checked on a real ad, 14 Nov 2026). */
export function storiaCoords(doc: Document, url: string): { lat: number; lng: number } | null {
  try {
    const ad = JSON.parse(doc.getElementById('__NEXT_DATA__')?.textContent ?? '')?.props?.pageProps?.ad;
    // In-site navigation keeps the first page's data: only trust it for the ad in the address bar.
    if (typeof ad?.slug !== 'string' || !ad.slug || !new URL(url).pathname.endsWith(`/${ad.slug}`)) return null;
    const radius = ad.location?.mapDetails?.radius;
    if (typeof radius !== 'number' || radius > STORIA_EXACT_RADIUS_M) return null;
    const c = ad.location?.coordinates;
    const p = { lat: c?.latitude, lng: c?.longitude };
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return p.lat === 0 && p.lng === 0 ? null : p;
  } catch {
    return null;
  }
}

export const ADAPTERS: SiteAdapter[] = [
  {
    site: 'olx',
    matches: ['*://*.olx.ro/*'],
    descriptionSelector: '[data-cy="ad_description"], [data-testid="ad_description"]',
    // OLX hides the number behind "Arată"; this link only exists once it is revealed.
    phoneSelector: '[data-testid="contact-phone"]',
    // City and county lines next to the location icon in the sidebar (checked on a real ad, 14 Nov 2026).
    placeSelector: '[data-testid="aside"] img[alt="Location"] + div',
  },
  {
    // Stretch: Storia shares OLX Group's ad page markup.
    site: 'storia',
    matches: ['*://*.storia.ro/*'],
    descriptionSelector: '[data-cy="adPageAdDescription"]',
    // Before "Afișează numărul" is clicked the same data-cy sits on a button; the link only exists once revealed.
    phoneSelector: 'a[data-cy="phone-number.number-button"]',
    placeSelector: 'a[href="#map"]',
    placeCoords: storiaCoords,
  },
];

/** The app's own demo listing pages (plan Task 13 markup), on whichever host the app runs. */
export function demoAdapter(appUrl: string): SiteAdapter {
  const { protocol, hostname } = new URL(appUrl);
  return {
    site: 'demo',
    matches: [`${protocol}//${hostname}/demo/listing/*`],
    descriptionSelector: '[data-testid="description"]',
    phoneSelector: '[data-testid="phone"]',
    placeSelector: '[data-testid="place"]',
  };
}

export function findAdapter(url: string, appUrl: string): SiteAdapter | null {
  return (
    [...ADAPTERS, demoAdapter(appUrl)].find((a) => a.matches.some((m) => new MatchPattern(m).includes(url))) ?? null
  );
}
