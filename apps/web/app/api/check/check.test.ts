import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckResponse } from '@cs/shared';
import { makeTestDb } from '@/lib/db/test-db';
import { landlord, verification } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addReports, seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { isSignedIn } from '@/lib/auth0';
import { GET } from './route';

vi.mock('@/lib/auth0', () => ({ isSignedIn: vi.fn(async () => true) }));

let db: Db;
let seeded: Awaited<ReturnType<typeof seedVerified>>;

beforeEach(async () => {
  db = await makeTestDb();
  seeded = await seedVerified(db);
});

async function check(params: Record<string, string>) {
  const res = await GET(new Request(`http://localhost:3000/api/check?${new URLSearchParams(params)}`));
  return { res, body: (await res.json()) as CheckResponse };
}
const d1 = { site: 'demo', listingId: 'd1' };

describe('GET /api/check', () => {
  it('shows a banned landlord as red_banned, with no verificationId', async () => {
    await db.update(landlord).set({ bannedAt: new Date() }).where(eq(landlord.id, seeded.landlordId));
    const { body } = await check({ ...d1, code: 'VC-7K3Q' });
    expect(body).toMatchObject({ status: 'red_banned', label: 'Landlord banned' });
    expect(body.verificationId).toBeUndefined();
  });
  it('refuses a signed-out student, with CORS headers', async () => {
    vi.mocked(isSignedIn).mockResolvedValueOnce(false);
    const res = await GET(new Request('http://localhost:3000/api/check?site=demo&listingId=d1&code=VC-7K3Q'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'signed_out' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
  it('cannot confirm a code without a listing', async () => {
    const { body } = await check({ code: 'VC-7K3Q' });
    expect(body).toMatchObject({ status: 'grey_cannot_confirm', label: "Can't confirm" });
  });
  it('flags an unknown code as fake', async () => {
    expect((await check({ ...d1, code: 'VC-ZZZZ' })).body).toMatchObject({ status: 'red_fake_code', label: 'Fake code' });
  });
  it('flags a copied listing', async () => {
    const { body } = await check({ site: 'demo', listingId: 'd2', code: 'VC-7K3Q' });
    expect(body).toMatchObject({ status: 'red_copied', label: 'Copied from a verified listing' });
    expect(body.verificationId).toBeUndefined();
  });
  it('flags a different phone on the page', async () => {
    const { body } = await check({ ...d1, code: 'VC-7K3Q', phone: '+40 799 999 999' });
    expect(body.status).toBe('red_phone_mismatch');
  });
  it('is green for the registered listing, matching phone in any format, lowercase code', async () => {
    for (const extra of [{}, { phone: '0700 000 001' }, { code: 'vc-7k3q' }] as Record<string, string>[]) {
      const { body } = await check({ ...d1, code: 'VC-7K3Q', ...extra });
      expect(body).toMatchObject({
        status: 'green', label: 'Verified landlord · near the address · 14 Nov 2026',
        verificationId: seeded.verificationId, locationResult: 'TRUE', verifiedAt: '2026-11-14T10:00:00.000Z',
      });
      expect(body.reports).toBeUndefined();
    }
  });
  it('never returns contact or address details', async () => {
    const { body } = await check({ ...d1, code: 'VC-7K3Q' });
    const json = JSON.stringify(body);
    for (const leak of ['phone', 'Hash', 'addressText', 'Str. Demo', '700000001']) expect(json).not.toContain(leak);
  });
  it('is not verified without a code', async () => {
    expect((await check(d1)).body).toMatchObject({ status: 'grey_unverified', label: 'Not verified' });
  });
  it('turns amber from reports on another verification of the same landlord', async () => {
    const [v2] = await db.insert(verification).values({
      landlordId: seeded.landlordId, code: 'VC-AAAA', addressText: 'Other', lat: 45.7, lng: 21.2, locationResult: 'TRUE', verifiedAt: new Date(),
    }).returning();
    await addReports(db, v2!.id, 'no_show', 3);
    const { body } = await check({ ...d1, code: 'VC-7K3Q' });
    expect(body.status).toBe('amber');
    expect(body.reports?.no_show).toBe(3);
  });
  it('ignores codes that were never issued', async () => {
    await db.insert(verification).values({ landlordId: seeded.landlordId, code: 'VC-BBBB', addressText: 'x', lat: 0, lng: 0 });
    expect((await check({ ...d1, code: 'VC-BBBB' })).body.status).toBe('red_fake_code');
  });
  it('allows the extension to call it cross-origin', async () => {
    const { res } = await check(d1);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
