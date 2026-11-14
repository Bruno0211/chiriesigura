import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/check/route';
import type { Db } from '@/lib/db';
import { listing, verification, viewingReport } from '@/lib/db/schema';
import { makeTestDb } from '@/lib/db/test-db';
import { identityHashes, phoneHash } from '@/lib/hash';
import { banPerson, holdList, isBannedIdentity } from '@/lib/queries';
import { DEMO_LISTINGS } from '@/lib/demo-listings';
import { seed } from './seed';

vi.mock('@/lib/auth0', () => ({ isSignedIn: vi.fn(async () => true) }));

const check = async (listingId: string, phone?: string) => {
  const q = new URLSearchParams({ site: 'demo', listingId, code: 'VC-7K3Q', ...(phone ? { phone } : {}) });
  return (await (await GET(new Request(`http://localhost:3000/api/check?${q}`))).json()) as { status: string; verificationId?: string };
};

describe('seed', () => {
  let db: Db;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it('sets up the demo: d1 green, d2 copied, one live no-show flips d1 amber, reseeding resets it', async () => {
    await seed(db);
    await seed(db);
    const d1 = await check('d1', '+999 9999 2002');
    expect(d1.status).toBe('green');
    expect((await check('d2', '+40 799 999 999')).status).toBe('red_copied');

    // The live demo: a student reports a no-show, and the landlord registers d4 under a new verification.
    await db.insert(viewingReport).values({ verificationId: d1.verificationId!, reporterPhoneHash: phoneHash('+99999992000'), locationResult: 'TRUE', category: 'no_show' });
    expect((await check('d1')).status).toBe('amber');
    const [d1v] = await db.select().from(verification).where(eq(verification.id, d1.verificationId!));
    const [live] = await db.insert(verification).values({ landlordId: d1v!.landlordId, code: 'VC-LIVE', addressText: 'x', lat: 0, lng: 0, locationResult: 'TRUE', verifiedAt: new Date() }).returning();
    await db.insert(listing).values({ verificationId: live!.id, site: 'demo', siteListingId: 'd4', url: 'http://localhost:3000/demo/listing/d4' });

    await seed(db);
    expect((await check('d1')).status).toBe('green');
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
    expect(await d5()).toBe('amber');
    const held = await holdList(db);
    expect(held).toHaveLength(1);
    expect(held[0]!.reports.money_upfront).toBe(3);

    await banPerson(db, held[0]!.landlordId);
    expect(await d5()).toBe('red_banned');
    expect(await isBannedIdentity(db, mihai)).toBe(true);

    await seed(db);
    expect(await d5()).toBe('amber');
    expect(await isBannedIdentity(db, mihai)).toBe(false);
  });
});
