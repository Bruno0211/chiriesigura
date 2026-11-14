import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityResponse, ListingsResponse, LocationResponse } from '@cs/shared';
import { makeTestDb } from '@/lib/db/test-db';
import { landlord, listing, verification, viewingReport } from '@/lib/db/schema';
import { DEMO_APARTMENT } from '@/lib/geocode';
import { identityHashes } from '@/lib/hash';
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

  it('needs a fresh location check before each listings submission, then adds to the same code', async () => {
    const phone = '+40700000001';
    const { idRes, lstRes } = await verifyAll(phone, ['http://localhost:3000/demo/listing/d4']);
    const first = (await lstRes.json()) as ListingsResponse;

    const withoutCheck = await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d5'] }, phone);
    expect(withoutCheck.status).toBe(409);

    await post(location, { verificationId: idRes.verificationId }, phone);
    const second = (await (await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d5', 'http://localhost:3000/demo/listing/d4'] }, phone)).json()) as ListingsResponse;
    expect(second.code).toBe(first.code);
    expect(second.accepted).toEqual([{ site: 'demo', listingId: 'd5' }, { site: 'demo', listingId: 'd4' }]);
    expect(await db.select().from(listing)).toHaveLength(2);
  });

  it('a location check older than 10 minutes no longer allows listings', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const phone = '+40700000001';
      const idRes = (await (await post(identity, idBody(), phone)).json()) as IdentityResponse;
      await post(location, { verificationId: idRes.verificationId }, phone);
      vi.setSystemTime(Date.now() + 11 * 60 * 1000);
      const late = await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d4'] }, phone);
      expect(late.status).toBe(409);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a submission that registers nothing does not use up the location check', async () => {
    const phone = '+40700000001';
    const { idRes, lstRes } = await verifyAll(phone, ['not a url']);
    expect(((await lstRes.json()) as ListingsResponse).accepted).toEqual([]);
    const retry = await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d4'] }, phone);
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as ListingsResponse).accepted).toEqual([{ site: 'demo', listingId: 'd4' }]);
  });

  it('a failed location check withdraws an earlier pass', async () => {
    const phone = '+40700000001';
    const idRes = (await (await post(identity, idBody(), phone)).json()) as IdentityResponse;
    await post(location, { verificationId: idRes.verificationId }, phone);
    vi.spyOn(mockNetwork, 'verifyLocation').mockResolvedValueOnce('FALSE');
    expect(((await (await post(location, { verificationId: idRes.verificationId }, phone)).json()) as LocationResponse).ok).toBe(false);
    const res = await post(listings, { verificationId: idRes.verificationId, urls: ['http://localhost:3000/demo/listing/d4'] }, phone);
    expect(res.status).toBe(409);
  });

  it('one location check allows only one of two concurrent submissions', async () => {
    const phone = '+40700000001';
    const idRes = (await (await post(identity, idBody(), phone)).json()) as IdentityResponse;
    await post(location, { verificationId: idRes.verificationId }, phone);
    const [a, b] = await Promise.all(['d4', 'd5'].map((id) =>
      post(listings, { verificationId: idRes.verificationId, urls: [`http://localhost:3000/demo/listing/${id}`] }, phone)));
    expect([a!.status, b!.status].sort()).toEqual([200, 409]);
    const accepted = (await (a!.status === 200 ? a! : b!).json()) as ListingsResponse;
    const [v] = await db.select().from(verification);
    expect(accepted.code).toBe(v!.code);
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

describe('lifetime ban at the identity step', () => {
  const REFUSAL = "You can't verify with ChirieSigură. If you think this is a mistake, email privacy@chiriesigura.example.";
  const banned = (h: Partial<{ idDocHash: string; nameBirthHash: string }>) =>
    db.insert(landlord).values({ phoneHash: 'banned-old-sim', bannedAt: new Date(), idDocHash: 'other', nameBirthHash: 'other', ...h });
  const kycStep = (r: IdentityResponse) => r.steps.find((s) => s.name === 'kyc');

  it('stores both hashes on the landlord', async () => {
    await post(identity, idBody(), '+40700000001');
    const [l] = await db.select().from(landlord);
    expect(l).toMatchObject(identityHashes(ID));
  });

  it('refuses a banned person on a new number, matched by card', async () => {
    await banned({ idDocHash: identityHashes(ID).idDocHash });
    const r = (await (await post(identity, idBody(), '+40700000010')).json()) as IdentityResponse;
    expect(r.ok).toBe(false);
    expect(kycStep(r)).toEqual({ name: 'kyc', ok: false, message: REFUSAL });
    expect(await db.select().from(landlord)).toHaveLength(1);
    expect(await db.select().from(verification)).toHaveLength(0);
  });

  it('refuses a banned person matched by name and birthdate only', async () => {
    await banned({ nameBirthHash: identityHashes(ID).nameBirthHash });
    const r = (await (await post(identity, idBody({ idDocument: 'TZ000001' }), '+40700000010')).json()) as IdentityResponse;
    expect(kycStep(r)).toEqual({ name: 'kyc', ok: false, message: REFUSAL });
    expect(await db.select().from(verification)).toHaveLength(0);
  });

  it('a banned person whose KYC fails gets the KYC message', async () => {
    await banned({ idDocHash: identityHashes(ID).idDocHash });
    const r = (await (await post(identity, idBody(), '+40700000003')).json()) as IdentityResponse;
    expect(kycStep(r)?.message).toBe("Your ID details don't match this phone number's owner");
  });
});
