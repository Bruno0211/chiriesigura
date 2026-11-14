import type { ListingRef } from '@cs/shared';
import { DEMO_LISTINGS } from './demo-listings';

export interface LatLng { lat: number; lng: number }

/** A listing farther than this from where the network located the landlord is refused. Town-level, not flat-level. */
export const MAX_LISTING_DISTANCE_M = 5000;

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
