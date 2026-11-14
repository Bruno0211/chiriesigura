import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADAPTERS, demoAdapter, findAdapter, storiaCoords } from './adapters';
import { extractFromDocument, isListingPage } from './extract';

const APP = 'http://localhost:3000';
const DEMO_URL = `${APP}/demo/listing/d1`;
const OLX_URL = 'https://www.olx.ro/d/oferta/apartament-2-camere-zona-complex-IDhXyZ1.html';

const fixture = (name: string) => readFileSync(resolve(import.meta.dirname, '../test/fixtures', name), 'utf8');
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const olx = ADAPTERS.find((a) => a.site === 'olx')!;
const demo = demoAdapter(APP);

describe('extractFromDocument', () => {
  it('reads the demo listing ref, its code and the visible phone', () => {
    const doc = parse(fixture('demo-listing.html'));
    expect(extractFromDocument(doc, DEMO_URL, demo, APP)).toEqual({
      listing: { site: 'demo', listingId: 'd1' },
      code: 'VC-7K3Q',
      phone: '+40 700 000 001',
      place: null,
      placeCoords: null,
    });
  });

  it('ignores a code that only appears in the similar-listings block', () => {
    const doc = parse(fixture('demo-listing.html'));
    doc.querySelector('[data-testid="description"]')!.innerHTML = '<p>Apartament fără cod.</p>';
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).code).toBeNull();
  });

  it('finds a code the landlord typed in lowercase', () => {
    const doc = parse(fixture('demo-listing.html'));
    doc.querySelector('[data-testid="description"]')!.textContent = 'Proprietar verificat · ChirieSigură vc-7k3q';
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).code).toBe('VC-7K3Q');
  });

  it('reads an OLX listing without a code, ignoring codes in the seller’s other ads', () => {
    const doc = parse(fixture('olx-listing.html'));
    expect(extractFromDocument(doc, OLX_URL, olx, APP)).toEqual({
      listing: { site: 'olx', listingId: 'hXyZ1' },
      code: null,
      phone: null,
      place: null,
      placeCoords: null,
    });
  });

  it('reads the OLX place as one line', () => {
    const doc = parse(fixture('olx-listing.html'));
    doc.querySelector('[data-testid="aside"]')!.insertAdjacentHTML('beforeend', '<div><img alt="Location" src="x.svg"><div><p>Timisoara</p><p>Timis</p></div></div>');
    expect(extractFromDocument(doc, OLX_URL, olx, APP).place).toBe('Timisoara, Timis');
  });

  it('reads the demo place', () => {
    const doc = parse(fixture('demo-listing.html'));
    doc.body.insertAdjacentHTML('beforeend', '<p><span data-testid="place">Timișoara, Centru</span> · 2 camere</p>');
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).place).toBe('Timișoara, Centru');
  });

  const STORIA_URL = 'https://www.storia.ro/ro/oferta/apartament-2-camere-soarelui-IDJdUz';
  const storiaDoc = (ad: object) => parse(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { ad } } })}</script>`);
  const AD = { slug: 'apartament-2-camere-soarelui-IDJdUz', location: { coordinates: { latitude: 45.73587, longitude: 21.249695 }, mapDetails: { radius: 100 } } };

  it('reads Storia coordinates from the page data', () => {
    expect(storiaCoords(storiaDoc(AD), STORIA_URL)).toEqual({ lat: 45.73587, lng: 21.249695 });
  });

  it('ignores Storia coordinates that belong to another ad (left over after in-site navigation)', () => {
    expect(storiaCoords(storiaDoc({ ...AD, slug: 'garsoniera-cluj-IDAbCd' }), STORIA_URL)).toBeNull();
    expect(storiaCoords(storiaDoc({ ...AD, slug: undefined }), STORIA_URL)).toBeNull();
  });

  it('ignores approximate or empty Storia coordinates', () => {
    const at = (location: object) => storiaCoords(storiaDoc({ ...AD, location: { ...AD.location, ...location } }), STORIA_URL);
    expect(at({ mapDetails: { radius: 5000 } })).toBeNull();
    expect(at({ mapDetails: undefined })).toBeNull();
    expect(at({ coordinates: { latitude: 0, longitude: 0 } })).toBeNull();
  });

  it('bad Storia page data gives no coordinates', () => {
    for (const html of [
      '<p>no data</p>',
      '<script id="__NEXT_DATA__">{not json</script>',
      '<script id="__NEXT_DATA__">{"props":{"pageProps":{"ad":{"location":{"coordinates":{"latitude":"x","longitude":21}}}}}}</script>',
    ]) expect(storiaCoords(parse(html), STORIA_URL)).toBeNull();
  });

  it('reads the OLX phone once the visitor reveals it', () => {
    const doc = parse(fixture('olx-listing.html'));
    doc.querySelector('[data-testid="phones-container"]')!.innerHTML =
      '<a data-testid="contact-phone" href="tel:0722123456">0722 123 456</a>';
    expect(extractFromDocument(doc, OLX_URL, olx, APP).phone).toBe('0722 123 456');
  });

  it.each([
    ['a <br> right after the code', 'Proprietar verificat · ChirieSigură VC-7K3Q<br>Preț negociabil'],
    ['a <br> right before the code', 'Vizionare după ora 17<br>VC-7K3Q'],
    ['the code ending a paragraph with no whitespace before the next', '<p>ChirieSigură VC-7K3Q</p><p>Contact doar telefonic</p>'],
    ['the code split across inline elements', 'ChirieSigură VC-<b>7K3Q</b> verificat'],
  ])('finds the code with %s', (_, html) => {
    const doc = parse(fixture('demo-listing.html'));
    doc.querySelector('[data-testid="description"]')!.innerHTML = html;
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).code).toBe('VC-7K3Q');
  });

  it('does not join a code fragment with the next paragraph into a code', () => {
    const doc = parse(fixture('demo-listing.html'));
    doc.querySelector('[data-testid="description"]')!.innerHTML = '<p>VC-7K3</p><p>Q este codul</p>';
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).code).toBeNull();
  });

  it('returns no code for a page without a description element', () => {
    const doc = parse('<main><p>Proprietar verificat · ChirieSigură VC-7K3Q</p></main>');
    expect(extractFromDocument(doc, DEMO_URL, demo, APP).code).toBeNull();
  });
});

describe('isListingPage', () => {
  it('is false on an OLX page that is not a listing (no badge on search results)', () => {
    const doc = parse('<main><h1>Apartamente de închiriat Timișoara</h1></main>');
    expect(isListingPage(extractFromDocument(doc, 'https://www.olx.ro/imobiliare/', olx, APP))).toBe(false);
  });

  it('is true for a listing URL, and for a code on a page whose URL we cannot parse', () => {
    expect(isListingPage({ listing: { site: 'olx', listingId: 'a1' }, code: null, phone: null, place: null, placeCoords: null })).toBe(true);
    expect(isListingPage({ listing: null, code: 'VC-7K3Q', phone: null, place: null, placeCoords: null })).toBe(true);
  });
});

describe('findAdapter', () => {
  it('picks OLX for desktop and mobile OLX hosts', () => {
    expect(findAdapter(OLX_URL, APP)?.site).toBe('olx');
    expect(findAdapter('https://m.olx.ro/d/oferta/x-IDab1.html#gallery', APP)?.site).toBe('olx');
  });

  it('picks the demo adapter only on the app’s demo listing pages', () => {
    expect(findAdapter(DEMO_URL, APP)?.site).toBe('demo');
    expect(findAdapter(`${APP}/verify`, APP)).toBeNull();
  });

  it('returns null for unsupported sites', () => {
    expect(findAdapter('https://example.com/listing/1', APP)).toBeNull();
  });
});

describe('demoAdapter', () => {
  it('matches the app host on any port, because extension match patterns cannot carry one', () => {
    expect(demoAdapter('http://localhost:3000').matches).toEqual(['http://localhost/demo/listing/*']);
    expect(demoAdapter('https://chiriesigura.vercel.app/').matches).toEqual(['https://chiriesigura.vercel.app/demo/listing/*']);
  });
});
