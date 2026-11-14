import { describe, expect, it } from 'vitest';
import { askMessage, checkUrl, isSignedInPage, signInUrl, viewingUrl } from './urls';

describe('isSignedInPage', () => {
  it("recognises the app's signed-in page, the one sign-in returns to", () => {
    expect(isSignedInPage('http://localhost:3000', 'http://localhost:3000/signed-in')).toBe(true);
    expect(isSignedInPage('https://cs.example/', 'https://cs.example/signed-in?x=1')).toBe(true);
  });
  it('ignores other pages and other sites', () => {
    expect(isSignedInPage('http://localhost:3000', 'http://localhost:3000/check')).toBe(false);
    expect(isSignedInPage('https://cs.example', 'https://evil.example/signed-in')).toBe(false);
    expect(isSignedInPage('https://cs.example', 'not a url')).toBe(false);
  });
});

describe('signInUrl', () => {
  it("points at the site's Auth0 sign-in", () => {
    expect(signInUrl('https://cs.example/')).toBe('https://cs.example/auth/login?returnTo=/signed-in');
  });
});

describe('checkUrl', () => {
  it('sends the listing ref, code and the phone as shown', () => {
    const url = checkUrl('http://localhost:3000', {
      listing: { site: 'demo', listingId: 'd1' },
      code: 'VC-7K3Q',
      phone: '+40 700 000 001',
      place: null,
      placeCoords: null,
    });
    expect(url).toBe('http://localhost:3000/api/check?site=demo&listingId=d1&code=VC-7K3Q&phone=%2B40+700+000+001');
    expect(new URL(url).searchParams.get('phone')).toBe('+40 700 000 001');
  });

  it('sends the place and the page coordinates when the page has them', () => {
    const url = new URL(checkUrl('http://localhost:3000', {
      listing: { site: 'storia', listingId: 'IDJdUz' }, code: 'VC-7K3Q', phone: null,
      place: 'Zona Soarelui, Timisoara, Timis', placeCoords: { lat: 45.73587, lng: 21.249695 },
    }));
    expect(url.searchParams.get('place')).toBe('Zona Soarelui, Timisoara, Timis');
    expect(url.searchParams.get('placeLat')).toBe('45.73587');
    expect(url.searchParams.get('placeLng')).toBe('21.249695');
  });

  it('leaves out what the page did not have', () => {
    expect(checkUrl('http://localhost:3000', { listing: null, code: null, phone: null, place: null, placeCoords: null })).toBe(
      'http://localhost:3000/api/check',
    );
  });

  it('tolerates a trailing slash on the app URL', () => {
    expect(checkUrl('https://cs.example/', { listing: { site: 'olx', listingId: 'a1' }, code: null, phone: null, place: null, placeCoords: null })).toBe(
      'https://cs.example/api/check?site=olx&listingId=a1',
    );
  });
});

describe('viewingUrl', () => {
  it('links the viewing report and carries the listing code for the phone page', () => {
    expect(viewingUrl('https://cs.example/', 'v-1', 'VC-7K3Q')).toBe('https://cs.example/viewing/v-1?code=VC-7K3Q');
  });

  it('omits the code when there is none', () => {
    expect(viewingUrl('https://cs.example', 'v-1', null)).toBe('https://cs.example/viewing/v-1');
  });
});

describe('askMessage', () => {
  it('is the plan’s message with the verify link', () => {
    expect(askMessage('https://cs.example/')).toBe(
      'Hi! Before I visit, could you verify your listing on ChirieSigură? It takes 2 minutes: https://cs.example/verify',
    );
  });
});
