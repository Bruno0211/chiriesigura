import { describe, expect, it } from 'vitest';
import { DEMO_ADDRESSES, DEMO_APARTMENT } from './geocode';
import { distanceM, listingTooFar, MAX_LISTING_DISTANCE_M } from './listing-area';

const HOME = DEMO_ADDRESSES[DEMO_APARTMENT]!;
const LUGOJ = { lat: 45.6886, lng: 21.9031 };

describe('distanceM', () => {
  it('is 0 for the same point', () => {
    expect(distanceM(HOME, HOME)).toBe(0);
  });
  it('puts Lugoj about 53 km from the demo address', () => {
    const d = distanceM(HOME, LUGOJ);
    expect(d).toBeGreaterThan(51_000);
    expect(d).toBeLessThan(55_000);
    expect(d).toBeGreaterThan(MAX_LISTING_DISTANCE_M);
  });
});

describe('listingTooFar', () => {
  it('accepts demo listings in the same town', () => {
    expect(listingTooFar({ site: 'demo', listingId: 'd4' }, HOME)).toBe(false);
    expect(listingTooFar({ site: 'demo', listingId: 'd3' }, HOME)).toBe(false);
  });
  it('refuses the demo listing in another town', () => {
    expect(listingTooFar({ site: 'demo', listingId: 'd6' }, HOME)).toBe(true);
  });
  it('never refuses a listing whose location it cannot read', () => {
    expect(listingTooFar({ site: 'olx', listingId: 'l3tlJ' }, HOME)).toBe(false);
    expect(listingTooFar({ site: 'storia', listingId: 'abc' }, HOME)).toBe(false);
    expect(listingTooFar({ site: 'demo', listingId: 'd9' }, HOME)).toBe(false);
  });
  it('does not read the object prototype for crafted ids', () => {
    for (const listingId of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(listingTooFar({ site: 'demo', listingId }, HOME)).toBe(false);
    }
  });
});
