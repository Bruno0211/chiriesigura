import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { landlord, reportCase, reporterBar, verification, viewingReport } from './db/schema';
import { makeTestDb } from './db/test-db';
import { caseList, decideCase, landlordStanding, personLandlordIds, type CaseStatus } from './cases';
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
  it('an open case puts the landlord under review without publishing a count', async () => {
    await addCases(db, seeded.verificationId, 'money_upfront', 3);
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ underReview: true });
    expect(s.counts.money_upfront).toBe(0);
  });
  it('a banned case publishes no problem count', async () => {
    await addCases(db, seeded.verificationId, 'no_show', 1, 'banned', new Date());
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ underReview: false });
    expect(s.counts.no_show).toBe(0);
  });
  it('a legacy upheld case is neither open nor published', async () => {
    await addCases(db, seeded.verificationId, 'no_show', 1, 'upheld' as string as CaseStatus, new Date());
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ underReview: false });
    expect(s.counts.no_show).toBe(0);
    expect(await caseList(db)).toEqual([]);
  });
  it('dismissed and false reports count for nothing', async () => {
    await addCases(db, seeded.verificationId, 'no_show', 2, 'dismissed', new Date());
    await addCases(db, seeded.verificationId, 'money_upfront', 2, 'false_report', new Date());
    const s = await landlordStanding(db, seeded.landlordId);
    expect(s).toMatchObject({ underReview: false });
    expect(s.counts).toMatchObject({ no_show: 0, money_upfront: 0, mismatch: 0, wrong_person: 0 });
  });
  it('ok reports count at once', async () => {
    await addReports(db, seeded.verificationId, 'ok', 2);
    expect((await landlordStanding(db, seeded.landlordId)).counts.ok).toBe(2);
  });
  it('standing follows the ID card hash', async () => {
    await db.update(landlord).set({ idDocHash: 'same-id' }).where(eq(landlord.id, seeded.landlordId));
    const other = await secondLandlord('same-id');
    await addReports(db, other.verificationId, 'ok', 1);
    expect((await landlordStanding(db, seeded.landlordId)).counts.ok).toBe(1);
    expect((await personLandlordIds(db, seeded.landlordId)).sort()).toEqual([seeded.landlordId, other.landlordId].sort());
  });
  it('a legacy landlord with no ID hash stands alone', async () => {
    const other = await secondLandlord(null);
    await addReports(db, other.verificationId, 'ok', 1);
    expect((await landlordStanding(db, seeded.landlordId)).counts.ok).toBe(0);
    expect(await personLandlordIds(db, seeded.landlordId)).toEqual([seeded.landlordId]);
  });
});

describe('caseList', () => {
  const ago = (days: number) => new Date(Date.now() - days * DAY);
  let landlords = 0;

  /** A landlord of their own (no ID hash), with one verification. */
  async function freshVerification() {
    landlords++;
    const [l] = await db.insert(landlord).values({ phoneHash: `fresh-${landlords}` }).returning();
    const [v] = await db.insert(verification).values({
      landlordId: l!.id, code: `VC-F${landlords}`, addressText: 'Other', lat: 45.7, lng: 21.2, locationResult: 'TRUE', verifiedAt: new Date(),
    }).returning();
    return v!.id;
  }

  /** One no-show report and its case, filed at `at`. */
  async function fileCase(verificationId: string, o: { phone: string; account?: string; simSwapped?: boolean; status?: CaseStatus; at: Date }) {
    const [v] = await db.select({ landlordId: verification.landlordId }).from(verification).where(eq(verification.id, verificationId));
    const [r] = await db.insert(viewingReport).values({
      verificationId, reporterPhoneHash: o.phone, reporterAccountHash: o.account ?? null, locationResult: 'TRUE', category: 'no_show',
      simSwapped: o.simSwapped ?? null, createdAt: o.at,
    }).returning();
    const status = o.status ?? 'ready';
    const [c] = await db.insert(reportCase).values({
      reportId: r!.id, landlordId: v!.landlordId, status, decidedAt: status === 'ready' || status === 'awaiting_landlord' ? null : o.at, createdAt: o.at,
    }).returning();
    return c!.id;
  }

  const signsOf = async (caseId: string) => (await caseList(db)).find((c) => c.caseId === caseId)!.signs;

  it('flags a burst', async () => {
    const ids = await addCases(db, seeded.verificationId, 'money_upfront', 3);
    const items = await caseList(db);
    expect(items.map((c) => c.caseId).sort()).toEqual([...ids].sort());
    for (const c of items) expect(c.signs).toContain('burst');
  });

  it('no burst when reports are days apart', async () => {
    const ids = await addCases(db, seeded.verificationId, 'money_upfront', 3);
    for (const [i, id] of ids.entries()) await db.update(reportCase).set({ createdAt: ago(i) }).where(eq(reportCase.id, id));
    const items = await caseList(db);
    expect(items).toHaveLength(3);
    for (const c of items) expect(c.signs).not.toContain('burst');
  });

  it('flags SIM change, a busy reporter, an earlier dismissal and a barred reporter', async () => {
    // Every fixture lands on its own day, so no burst mixes in.
    const sim = await fileCase(seeded.verificationId, { phone: 'p-sim', simSwapped: true, at: ago(1) });

    const busy = [];
    for (const [i, at] of [ago(2), ago(3), ago(4)].entries()) {
      busy.push(await fileCase(i === 0 ? seeded.verificationId : await freshVerification(), { phone: 'p-busy', at }));
    }

    // The same account, on a new phone, had a case dismissed before.
    await fileCase(await freshVerification(), { phone: 'p-old', account: 'acc-1', status: 'dismissed', at: ago(6) });
    const dismissedBefore = await fileCase(seeded.verificationId, { phone: 'p-new', account: 'acc-1', at: ago(5) });

    await db.insert(reporterBar).values({ kind: 'phone', hash: 'p-bar', expiresAt: new Date(Date.now() + 365 * DAY) });
    const barred = await fileCase(seeded.verificationId, { phone: 'p-bar', at: ago(7) });

    const plain = await fileCase(seeded.verificationId, { phone: 'p-plain', simSwapped: false, at: ago(8) });

    expect(await signsOf(sim)).toEqual(['sim_changed']);
    for (const id of busy) expect(await signsOf(id)).toEqual(['reporter_many_landlords']);
    expect(await signsOf(dismissedBefore)).toEqual(['reporter_dismissed_before']);
    expect(await signsOf(barred)).toEqual(['reporter_barred']);
    expect(await signsOf(plain)).toEqual([]);
  });

  it('lists ready before awaiting, newest first, and hides decided cases', async () => {
    const readyOld = await fileCase(seeded.verificationId, { phone: 'r1', at: ago(3) });
    const readyNewAt = ago(1);
    const readyNew = await fileCase(seeded.verificationId, { phone: 'r2', at: readyNewAt });
    const awaitingOld = await fileCase(seeded.verificationId, { phone: 'r3', status: 'awaiting_landlord', at: ago(5) });
    const awaitingNew = await fileCase(seeded.verificationId, { phone: 'r4', status: 'awaiting_landlord', at: ago(0) });
    for (const [i, status] of (['dismissed', 'false_report', 'banned'] as const).entries()) {
      await fileCase(seeded.verificationId, { phone: `d${i}`, status, at: ago(10 + i) });
    }

    const items = await caseList(db);
    expect(items.map((c) => c.caseId)).toEqual([readyNew, readyOld, awaitingNew, awaitingOld]);
    expect(items[0]).toEqual({
      caseId: readyNew,
      landlordId: seeded.landlordId,
      status: 'ready',
      category: 'no_show',
      createdAt: readyNewAt.toISOString(),
      locationResult: 'TRUE',
      listings: [{ site: 'demo', listingId: 'd1', url: 'http://localhost:3000/demo/listing/d1' }],
      signs: [],
    });
    expect(items[2]!.status).toBe('awaiting_landlord');
  });
});

describe('decideCase', () => {
  it('ban stores the case as banned', async () => {
    const [id] = (await addCases(db, seeded.verificationId, 'money_upfront', 1)) as [string];
    expect(await decideCase(db, id, 'ban', 'team@x.ro')).toBe('ok');
    expect((await db.select().from(reportCase).where(eq(reportCase.id, id)))[0]!.status).toBe('banned');
  });

  it('a second ban on the same person keeps the first ban time', async () => {
    const [first, second] = (await addCases(db, seeded.verificationId, 'money_upfront', 2)) as [string, string];
    const t1 = new Date('2026-11-15T10:00:00Z');
    expect(await decideCase(db, first, 'ban', 'team@x.ro', t1)).toBe('ok');
    const banned = (await db.select().from(landlord).where(eq(landlord.id, seeded.landlordId)))[0]!.bannedAt;
    expect(banned).not.toBeNull();
    await new Promise((r) => setTimeout(r, 10));
    expect(await decideCase(db, second, 'ban', 'team@x.ro', new Date(t1.getTime() + 60_000))).toBe('ok');
    const after = (await db.select().from(landlord).where(eq(landlord.id, seeded.landlordId)))[0]!.bannedAt;
    expect(after!.getTime()).toBe(banned!.getTime());
  });

  it("marking a report false flags the same reporter's other open cases as barred", async () => {
    const other = await secondLandlord(null);
    const reportFor = async (verificationId: string, landlordId: string) => {
      const [r] = await db.insert(viewingReport).values({
        verificationId, reporterPhoneHash: 'same-phone', locationResult: 'TRUE', category: 'no_show',
      }).returning();
      const [c] = await db.insert(reportCase).values({ reportId: r!.id, landlordId, status: 'ready', createdAt: new Date(Date.now() - (landlordId === seeded.landlordId ? 5 : 9) * DAY) }).returning();
      return c!.id;
    };
    const a = await reportFor(seeded.verificationId, seeded.landlordId);
    const b = await reportFor(other.verificationId, other.landlordId);
    expect(await decideCase(db, a, 'false_report', 'team@x.ro')).toBe('ok');
    const items = await caseList(db);
    expect(items.map((c) => c.caseId)).toEqual([b]);
    expect(items[0]!.signs).toContain('reporter_barred');
  });
});
