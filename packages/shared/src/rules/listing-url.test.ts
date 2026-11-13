import { describe, expect, it } from 'vitest';
import { listingKey, parseListingUrl } from './listing-url';

const OLX = 'https://www.olx.ro/d/oferta/apartament-2-camere-IDhXyZ1.html';
const DEMO = 'http://localhost:3000';

describe('parseListingUrl', () => {
  it('parses an OLX listing', () => {
    expect(parseListingUrl(OLX)).toEqual({ site: 'olx', listingId: 'hXyZ1' });
  });
  it('treats mobile host, query and fragment as the same OLX listing', () => {
    const want = { site: 'olx', listingId: 'hXyZ1' };
    expect(parseListingUrl('https://m.olx.ro/d/oferta/apartament-2-camere-IDhXyZ1.html')).toEqual(want);
    expect(parseListingUrl(`${OLX}?reason=hp_promoted`)).toEqual(want);
    expect(parseListingUrl(`${OLX}#gallery`)).toEqual(want);
  });
  it('parses a Storia listing', () => {
    expect(parseListingUrl('https://www.storia.ro/ro/oferta/apartament-2-camere-IDabc12')).toEqual({ site: 'storia', listingId: 'abc12' });
  });
  it('parses a demo listing on the demo origin', () => {
    expect(parseListingUrl(`${DEMO}/demo/listing/d1`, DEMO)).toEqual({ site: 'demo', listingId: 'd1' });
  });
  it('rejects unknown hosts, garbage and OLX URLs without an ID', () => {
    expect(parseListingUrl('https://example.com/x')).toBeNull();
    expect(parseListingUrl('not a url')).toBeNull();
    expect(parseListingUrl('https://www.olx.ro/d/oferta/apartament-2-camere.html')).toBeNull();
    expect(parseListingUrl(`${DEMO}/demo/listing/d1`)).toBeNull(); // no demo origin configured
  });
  it('builds a stable key', () => {
    expect(listingKey({ site: 'olx', listingId: 'hXyZ1' })).toBe('olx:hXyZ1');
  });
});
