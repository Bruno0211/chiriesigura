import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ADDRESSES, DEMO_APARTMENT } from './geocode';
import { DEMO_LISTINGS } from './demo-listings';
import { distanceM, listingFarFrom, listingTooFar, lookupPlace, MAX_LISTING_DISTANCE_M, MAX_PLACE_DISTANCE_M } from './listing-area';

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

describe('listingFarFrom', () => {
  const AT = HOME;
  const north = (km: number) => ({ lat: AT.lat + km / 111.2, lng: AT.lng });
  const stub = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
    const f = vi.fn(impl);
    vi.stubGlobal('fetch', f);
    return f;
  };
  const at = (p: { lat: number; lng: number }) => async () => ({ ok: true, json: async () => [{ lat: String(p.lat), lon: String(p.lng) }] }) as Response;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('demo place names resolve without the network', async () => {
    const f = stub(at(north(100)));
    expect(await lookupPlace('lugoj,  centru')).toEqual(DEMO_LISTINGS.d6!.coords);
    expect(await lookupPlace('Cluj-Napoca, Centru')).toEqual(DEMO_LISTINGS.d7!.coords);
    expect(f).not.toHaveBeenCalled();
  });
  it('coordinates use the 5 km limit', async () => {
    expect(await listingFarFrom({ text: null, coords: north(4) }, AT)).toBe(false);
    expect(await listingFarFrom({ text: null, coords: north(6) }, AT)).toBe(true);
  });
  it('a place name uses the 15 km limit', async () => {
    expect(MAX_PLACE_DISTANCE_M).toBe(15_000);
    stub(at(north(10)));
    expect(await listingFarFrom({ text: 'Satellite Town Ten', coords: null }, AT)).toBe(false);
    stub(at(north(16)));
    expect(await listingFarFrom({ text: 'Town Sixteen', coords: null }, AT)).toBe(true);
  });
  it('unknown never punishes', async () => {
    expect(await listingFarFrom({ text: null, coords: null }, AT)).toBe(false);
    stub(async () => { throw new Error('down'); });
    expect(await listingFarFrom({ text: 'Nowhere A', coords: null }, AT)).toBe(false);
    stub(async () => ({ ok: true, json: async () => [] }) as Response);
    expect(await listingFarFrom({ text: 'Nowhere B', coords: null }, AT)).toBe(false);
  });
  it('a slow lookup gives up after 2 s', async () => {
    vi.useFakeTimers();
    stub((_url, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    const result = listingFarFrom({ text: 'Slow Town', coords: null }, AT);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await result).toBe(false);
  });
  it('lookups are remembered', async () => {
    const f = stub(at(north(100)));
    await lookupPlace('Oradea');
    await lookupPlace('Oradea');
    expect(f).toHaveBeenCalledTimes(1);
  });
});
