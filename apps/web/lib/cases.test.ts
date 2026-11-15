import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { landlord, verification } from './db/schema';
import { makeTestDb } from './db/test-db';
import { landlordStanding, personLandlordIds } from './cases';
import { addCases, addReports, seedVerified } from './test-seed';
import { phoneHash } from './hash';

let db: Db;
let seeded: Awaited<ReturnType<typeof seedVerified>>;

beforeEach(async () => {
  db = await makeTestDb();
  seeded = await seedVerified(db);
});

const DAY = 24 * 60 * 60 * 1000;

async function secondLandlord(idDocHash: string | null) {
  const [l2] = await db.insert(landlord).values({ phoneHash: phoneHash('+40700000002'), idDocHash }).returning();
  const [v2] = await db.insert(verification).values({
    landlordId: l2!.id, code: 'VC-AAAA', addressText: 'Other', lat: 45.7, lng: 21.2, locationResult: 'TRUE', verifiedAt: new Date(),
  }).returning();
  return { landlordId: l2!.id, verificationId: v2!.id };
}

describe('landlordStanding', () => {
  it('an open case puts the landlord under review without warning', async () => {
    await addCases(db, seeded.verificationId, 'money_upfront', 3);
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ warned: false, underReview: true });
    expect(s.counts.money_upfront).toBe(0);
  });
  it('an upheld case warns and counts publicly', async () => {
    await addCases(db, seeded.verificationId, 'no_show', 1, 'upheld', new Date());
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ warned: true, underReview: false });
    expect(s.counts.no_show).toBe(1);
  });
  it('dismissed and false reports count for nothing', async () => {
    await addCases(db, seeded.verificationId, 'no_show', 2, 'dismissed', new Date());
    await addCases(db, seeded.verificationId, 'money_upfront', 2, 'false_report', new Date());
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ warned: false, underReview: false });
    expect(s.counts).toMatchObject({ no_show: 0, money_upfront: 0, mismatch: 0, wrong_person: 0 });
  });
  it('ok reports count at once', async () => {
    await addReports(db, seeded.verificationId, 'ok', 2);
    expect((await landlordStanding(db, seeded.landlordId)).counts.ok).toBe(2);
  });
  it('an upheld case older than 2 years no longer counts', async () => {
    const now = new Date();
    await addCases(db, seeded.verificationId, 'no_show', 1, 'upheld', new Date(now.getTime() - 731 * DAY));
    const s = await landlordStanding(db, seeded.landlordId, now);
    expect(s.warned).toBe(false);
    expect(s.counts.no_show).toBe(0);
  });
  it('standing follows the ID card hash', async () => {
    await db.update(landlord).set({ idDocHash: 'same-id' }).where(eq(landlord.id, seeded.landlordId));
    const other = await secondLandlord('same-id');
    await addCases(db, other.verificationId, 'no_show', 1, 'upheld', new Date());
    expect((await landlordStanding(db, seeded.landlordId)).warned).toBe(true);
    expect((await personLandlordIds(db, seeded.landlordId)).sort()).toEqual([seeded.landlordId, other.landlordId].sort());
  });
  it('a legacy landlord with no ID hash stands alone', async () => {
    const other = await secondLandlord(null);
    await addCases(db, other.verificationId, 'no_show', 1, 'upheld', new Date());
    expect((await landlordStanding(db, seeded.landlordId)).warned).toBe(false);
    expect(await personLandlordIds(db, seeded.landlordId)).toEqual([seeded.landlordId]);
  });
});
