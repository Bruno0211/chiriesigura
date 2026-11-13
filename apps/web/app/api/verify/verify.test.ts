import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityResponse, ListingsResponse, LocationResponse } from '@cs/shared';
import { makeTestDb } from '@/lib/db/test-db';
import { landlord, listing, verification, viewingReport } from '@/lib/db/schema';
import { DEMO_APARTMENT } from '@/lib/geocode';
import { mockNetwork } from '@/lib/network/mock';
import { issueNvCookie } from '@/lib/nv-session';
import { seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { POST as identity } from './identity/route';
import { POST as listings } from './listings/route';
import { POST as location } from './location/route';

let db: Db;
const ID = { givenName: 'Ana', familyName: 'Popescu', birthdate: '1999-04-12', idDocument: 'TZ918273' };

beforeEach(async () => {
  db = await makeTestDb();
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([]))); // Nominatim finds nothing unless it's the demo address
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const post = (fn: (r: Request) => Promise<Response>, body: unknown, phone?: string) =>
  fn(new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(phone ? { cookie: issueNvCookie(phone).split(';')[0]! } : {}) },
    body: JSON.stringify(body),
  }));

const idBody = (extra: object = {}) => ({ consent: true, ...ID, address: DEMO_APARTMENT, ...extra });

async function verifyAll(phone: string, urls: string[]) {
  const idRes = (await (await post(identity, idBody(), phone)).json()) as IdentityResponse;
  const locRes = (await (await post(location, { verificationId: idRes.verificationId }, phone)).json()) as LocationResponse;
  const lstRes = await post(listings, { verificationId: idRes.verificationId, urls }, phone);
  return { idRes, locRes, lstRes };
}

describe('landlord verification API', () => {
  it('happy path issues a code and the paste line', async () => {
    const { idRes, locRes, lstRes } = await verifyAll('+40700000001', ['http://localhost:3000/demo/listing/d4']);
    expect(idRes.ok).toBe(true);
    expect(idRes.steps.map((s) => [s.name, s.ok])).toEqual([['number', true], ['kyc', true], ['simswap', true]]);
    expect(locRes).toMatchObject({ ok: true, step: { name: 'location', ok: true } });
    const body = (await lstRes.json()) as ListingsResponse;
    expect(body.code).toMatch(/^VC-[A-HJ-NP-Z2-9]{4}$/);
    expect(body.pasteLine).toBe(`Proprietar verificat · ChirieSigură ${body.code}`);
    expect(body.accepted).toEqual([{ site: 'demo', listingId: 'd4' }]);
  });

  it('stops on a swapped SIM without creating a verification', async () => {
    const res = (await (await post(identity, idBody(), '+40700000002')).json()) as IdentityResponse;
    expect(res.ok).toBe(false);
    expect(res.steps.find((s) => s.name === 'simswap')).toEqual({ name: 'simswap', ok: false, message: 'This SIM was changed in the last 7 days' });
    expect(res.verificationId).toBeUndefined();
    expect(await db.select().from(verification)).toHaveLength(0);
  });

  it('stops on a KYC mismatch', async () => {
    const res = (await (await post(identity, idBody(), '+40700000003')).json()) as IdentityResponse;
    expect(res.ok).toBe(false);
    expect(res.steps.find((s) => s.name === 'kyc')).toEqual({ name: 'kyc', ok: false, message: "Your ID details don't match this phone number's owner" });
  });

  it('fails location away from the address and then refuses listings', async () => {
    const { locRes, lstRes } = await verifyAll('+40700000004', ['http://localhost:3000/demo/listing/d4']);
    expect(locRes).toMatchObject({ ok: false, step: { message: "Your phone isn't near this address. Open this page at the apartment, on mobile data." } });
    expect(lstRes.status).toBe(409);
  });

  it('accepts PARTIAL location and stores it', async () => {
    const { locRes, idRes } = await verifyAll('+40700000005', []);
    expect(locRes.ok).toBe(true);
    const [v] = await db.select().from(verification);
    expect(v!.id).toBe(idRes.verificationId);
    expect(v!.locationResult).toBe('PARTIAL');
  });

  it('reports an address it cannot find', async () => {
    const res = (await (await post(identity, idBody({ address: 'Nowhere 999' }), '+40700000001')).json()) as IdentityResponse;
    expect(res.ok).toBe(false);
    expect(res.steps.at(-1)).toEqual({ name: 'location', ok: false, message: "We couldn't find that address" });
  });

  it('requires consent and a verified number', async () => {
    expect((await post(identity, idBody({ consent: false }), '+40700000001')).status).toBe(400);
    expect((await post(identity, idBody())).status).toBe(401);
  });

  it('refuses location/listings from a different phone than the landlord', async () => {
    const idRes = (await (await post(identity, idBody(), '+40700000001')).json()) as IdentityResponse;
    expect((await post(location, { verificationId: idRes.verificationId }, '+40711111111')).status).toBe(401);
  });

  it('rejects unparseable URLs and URLs registered by another landlord', async () => {
    await seedVerified(db); // landlord +40700000001 already holds demo:d1
    const { lstRes } = await verifyAll('+40711111111', ['not a url', 'http://localhost:3000/demo/listing/d1', 'http://localhost:3000/demo/listing/d9']);
    const body = (await lstRes.json()) as ListingsResponse;
    expect(body.rejected).toEqual([
      { url: 'not a url', reason: 'unparseable' },
      { url: 'http://localhost:3000/demo/listing/d1', reason: 'already_registered' },
    ]);
    expect(body.accepted).toEqual([{ site: 'demo', listingId: 'd9' }]);
  });

  it('adds more listings to the same code on a second call', async () => {
    const { idRes, lstRes } = await verifyAll('+40700000001', ['http://localhost:3000/demo/listing/d4']);
    const first = (await lstRes.json()) as ListingsResponse;
    const second = (await (await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d5', 'http://localhost:3000/demo/listing/d4'] }, '+40700000001')).json()) as ListingsResponse;
    expect(second.code).toBe(first.code);
    expect(second.accepted).toEqual([{ site: 'demo', listingId: 'd5' }, { site: 'demo', listingId: 'd4' }]);
    expect(await db.select().from(listing)).toHaveLength(2);
  });

  it('gives both concurrent listing requests the same, stored code', async () => {
    const idRes = (await (await post(identity, idBody(), '+40700000001')).json()) as IdentityResponse;
    await post(location, { verificationId: idRes.verificationId }, '+40700000001');
    const [a, b] = await Promise.all(['d4', 'd5'].map(async (id) =>
      (await (await post(listings, { verificationId: idRes.verificationId, urls: [`http://localhost:3000/demo/listing/${id}`] }, '+40700000001')).json()) as ListingsResponse));
    const [v] = await db.select().from(verification);
    expect(a!.code).toBe(v!.code);
    expect(b!.code).toBe(v!.code);
  });

  it('turns a failing operator call into a plain-words step, not a 500', async () => {
    vi.spyOn(mockNetwork, 'kycMatch').mockRejectedValueOnce(new Error('nokia 503'));
    const res = await post(identity, idBody(), '+40700000001');
    expect(res.status).toBe(200);
    const body = (await res.json()) as IdentityResponse;
    expect(body.ok).toBe(false);
    expect(body.steps.find((s) => s.name === 'kyc')).toEqual({ name: 'kyc', ok: false, message: "We couldn't run this check. Please try again." });

    const ok = (await (await post(identity, idBody(), '+40700000001')).json()) as IdentityResponse;
    vi.spyOn(mockNetwork, 'verifyLocation').mockRejectedValueOnce(new Error('nokia 429'));
    const loc = await post(location, { verificationId: ok.verificationId }, '+40700000001');
    expect(loc.status).toBe(200);
    expect(await loc.json()).toEqual({ ok: false, step: { name: 'location', ok: false, message: "We couldn't run this check. Please try again." } });
  });

  it('never stores the name, birthdate or ID number', async () => {
    await verifyAll('+40700000001', ['http://localhost:3000/demo/listing/d4']);
    const all = JSON.stringify(await Promise.all([landlord, verification, listing, viewingReport].map((t) => db.select().from(t))));
    for (const secret of [ID.givenName, ID.familyName, ID.birthdate, ID.idDocument, '+40700000001']) expect(all).not.toContain(secret);
  });
});
