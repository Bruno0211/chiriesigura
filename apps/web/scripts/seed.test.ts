import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/check/route';
import type { Db } from '@/lib/db';
import { landlord, listing, reportCase, verification, viewingReport } from '@/lib/db/schema';
import { makeTestDb } from '@/lib/db/test-db';
import { identityHashes, phoneHash } from '@/lib/hash';
import { banPerson, findVerificationByCode, holdList, isBannedIdentity } from '@/lib/queries';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { seed } from './seed';

vi.mock('@/lib/auth0', () => ({ isSignedIn: vi.fn(async () => true) }));

const check = async (listingId: string, phone?: string) => {
  const q = new URLSearchParams({ site: 'demo', listingId, code: 'VC-7K3Q', ...(phone ? { phone } : {}) });
  return (await (await GET(new Request(`http://localhost:3000/api/check?${q}`))).json()) as { status: string; verificationId?: string; underReview?: true };
};

describe('seed', () => {
  let db: Db;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it('reseeding puts d1 and d5 back to exactly their seeded reports', async () => {
    await seed(db);
    for (const [code, category] of [['VC-7K3Q', 'no_show'], ['VC-7K3Q', 'money_upfront'], ['VC-BAN5', 'money_upfront']] as const) {
      const v = await findVerificationByCode(db, code);
      await db.insert(viewingReport).values({ verificationId: v!.id, reporterPhoneHash: `rehearsal-${code}-${category}`, locationResult: 'TRUE', category });
    }
    await seed(db);
    expect(await check('d1')).toMatchObject({ status: 'green' });
    const d1 = await findVerificationByCode(db, 'VC-7K3Q');
    const d5 = await findVerificationByCode(db, 'VC-BAN5');
    expect(await db.select().from(viewingReport).where(eq(viewingReport.verificationId, d1!.id))).toHaveLength(2);
    expect(await db.select().from(viewingReport).where(eq(viewingReport.verificationId, d5!.id))).toHaveLength(3);
  });

  it('reseeding lifts a rehearsal ban or dismissal from every demo landlord', async () => {
    await seed(db);
    await db.update(landlord).set({ bannedAt: new Date(), reviewDismissedAt: new Date() });
    await seed(db);
    const rows = await db.select({ bannedAt: landlord.bannedAt, dismissed: landlord.reviewDismissedAt }).from(landlord);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.filter((r) => r.bannedAt || r.dismissed)).toEqual([]);
  });

  it('seeds a verified landlord whose d7 listing says Cluj, which the badge flags', async () => {
    await seed(db);
    await seed(db);
    const v = await findVerificationByCode(db, 'VC-CLJ7');
    expect(v).toMatchObject({ city: 'Timișoara', listings: [{ site: 'demo', listingId: 'd7' }], phoneHash: phoneHash('+40700000011') });
    expect(await db.select().from(verification).where(eq(verification.code, 'VC-CLJ7'))).toHaveLength(1);
    for (const code of ['VC-7K3Q', 'VC-BAN5']) expect((await findVerificationByCode(db, code))?.city).toBe('Timișoara');
    const d7 = DEMO_LISTINGS.d7!;
    const q = new URLSearchParams({ site: 'demo', listingId: 'd7', code: 'VC-CLJ7', phone: d7.phone, place: d7.area });
    const body = (await (await GET(new Request(`http://localhost:3000/api/check?${q}`))).json()) as { status: string };
    expect(body.status).toBe('red_far_away');
  });

  it('sets up the demo: d1 green, d2 copied, one live no-show puts d1 under review, reseeding resets it', async () => {
    await seed(db);
    await seed(db);
    const d1 = await check('d1', '+999 9999 2002');
    expect(d1.status).toBe('green');
    expect((await check('d2', '+40 799 999 999')).status).toBe('red_copied');

    // The live demo: a student reports a no-show, and the landlord registers d4 under a new verification.
    const [d1v] = await db.select().from(verification).where(eq(verification.id, d1.verificationId!));
    const [report] = await db.insert(viewingReport).values({ verificationId: d1.verificationId!, reporterPhoneHash: phoneHash('+99999992000'), locationResult: 'TRUE', category: 'no_show' }).returning();
    await db.insert(reportCase).values({ reportId: report!.id, landlordId: d1v!.landlordId, status: 'ready' });
    expect(await check('d1')).toMatchObject({ status: 'green', underReview: true });
    const [live] = await db.insert(verification).values({ landlordId: d1v!.landlordId, code: 'VC-LIVE', addressText: 'x', lat: 0, lng: 0, locationResult: 'TRUE', verifiedAt: new Date() }).returning();
    await db.insert(listing).values({ verificationId: live!.id, site: 'demo', siteListingId: 'd4', url: 'http://localhost:3000/demo/listing/d4' });

    await seed(db);
    expect(await check('d1')).toMatchObject({ status: 'green' });
    // The two seeded earlier no-shows stay open cases; only the live reporter's case is gone.
    expect(await db.select().from(reportCase).where(eq(reportCase.landlordId, d1v!.landlordId))).toHaveLength(2);
    expect(await db.select().from(listing).where(and(eq(listing.site, 'demo'), eq(listing.siteListingId, 'd4')))).toHaveLength(0);
  });

  it('seeds the scammer on hold; a ban makes d5 red_banned and blocks the same ID; reseeding resets it', async () => {
    const d5 = async () => {
      const q = new URLSearchParams({ site: 'demo', listingId: 'd5', code: 'VC-BAN5', phone: '+40 700 000 009' });
      return ((await (await GET(new Request(`http://localhost:3000/api/check?${q}`))).json()) as { status: string }).status;
    };
    const mihai = identityHashes({ givenName: 'Mihai', familyName: 'Ionescu', birthdate: '1990-07-15', idDocument: 'TM654321' });
    expect(DEMO_LISTINGS.d5!.description.at(-1)).toBe('Proprietar verificat · ChirieSigură VC-BAN5');

    await seed(db);
    await seed(db);
    expect(await d5()).toBe('green');
    const held = await holdList(db);
    expect(held).toHaveLength(1);
    expect(held[0]!.reports.money_upfront).toBe(3);

    await banPerson(db, held[0]!.landlordId);
    expect(await d5()).toBe('red_banned');
    expect(await isBannedIdentity(db, mihai)).toBe(true);

    await seed(db);
    expect(await d5()).toBe('green');
    expect(await isBannedIdentity(db, mihai)).toBe(false);
  });
});
