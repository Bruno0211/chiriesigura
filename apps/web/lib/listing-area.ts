import type { ListingRef } from '@cs/shared';
import { DEMO_LISTINGS } from './demo-listings';
import { geocode } from './geocode';

export interface LatLng { lat: number; lng: number }

/** A listing farther than this from where the network located the landlord is refused. Town-level, not flat-level. */
export const MAX_LISTING_DISTANCE_M = 5000;

/** A place name geocodes to the town centre, so it gets a city-sized limit. */
export const MAX_PLACE_DISTANCE_M = 15_000;

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Where a listing is, when we know it: only our own demo listings. OLX answers server-side page fetches
 * with 403 (bot protection), so OLX and Storia locations can't be read here.
 */
export function listingCoords(ref: ListingRef): LatLng | null {
  // The id comes from the pasted URL, so never let it reach the object prototype ('constructor', '__proto__').
  if (ref.site !== 'demo' || !Object.hasOwn(DEMO_LISTINGS, ref.listingId)) return null;
  return DEMO_LISTINGS[ref.listingId]!.coords;
}

/** True only when the listing's location is known and it is too far from where the landlord was located. */
export function listingTooFar(ref: ListingRef, at: LatLng): boolean {
  const c = listingCoords(ref);
  return c !== null && distanceM(c, at) > MAX_LISTING_DISTANCE_M;
}

/** Where a listing's own page says the flat is: a place name and, on some sites, exact coordinates. */
export interface PagePlace { text: string | null; coords: LatLng | null }

const placeKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
// shortcut: per-instance cache, move to a table if Nominatim rate-limits Vercel.
const lookups = new Map<string, LatLng | null>();

/** A place name to coordinates: demo places first (the demo never calls Nominatim), then a remembered lookup. */
export async function lookupPlace(text: string): Promise<LatLng | null> {
  const key = placeKey(text);
  const demo = Object.values(DEMO_LISTINGS).find((l) => placeKey(l.area) === key);
  if (demo) return demo.coords;
  if (lookups.has(key)) return lookups.get(key)!;
  const hit = await geocode(text, 2000);
  const at = hit && { lat: hit.lat, lng: hit.lng };
  lookups.set(key, at);
  return at;
}

/** True only when the page's place is known and too far from where the landlord verified. Unknown never punishes. */
export async function listingFarFrom(page: PagePlace, at: LatLng): Promise<boolean> {
  if (page.coords) return distanceM(page.coords, at) > MAX_LISTING_DISTANCE_M;
  if (!page.text) return false;
  const c = await lookupPlace(page.text);
  return c !== null && distanceM(c, at) > MAX_PLACE_DISTANCE_M;
}
