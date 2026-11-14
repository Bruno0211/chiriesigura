import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocode } from './geocode';

function stubNominatim(body: unknown) {
  const f = vi.fn(async () => ({ ok: true, json: async () => body }) as Response);
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe('geocode', () => {
  it('returns the city Nominatim gives', async () => {
    stubNominatim([{ lat: '46.77', lon: '23.62', address: { city: 'Cluj-Napoca' } }]);
    expect(await geocode('Strada Memorandumului 1, Cluj-Napoca')).toEqual({ lat: 46.77, lng: 23.62, city: 'Cluj-Napoca' });
  });
  it('falls back to the town, then null', async () => {
    stubNominatim([{ lat: '45.69', lon: '21.9', address: { town: 'Lugoj' } }]);
    expect((await geocode('Lugoj'))?.city).toBe('Lugoj');
    stubNominatim([{ lat: '45.69', lon: '21.9' }]);
    expect((await geocode('Somewhere'))?.city).toBeNull();
  });
  it('the demo apartment needs no network', async () => {
    const f = stubNominatim([]);
    expect((await geocode('Strada Alba Iulia 2, Timișoara'))?.city).toBe('Timișoara');
    expect(f).not.toHaveBeenCalled();
  });
});
