import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { landlord, listing, reportCase, reporterBar, verification, viewingReport } from './schema';
import { makeTestDb } from './test-db';
import type { Db } from './index';

let db: Db;
let verificationId: string;

beforeEach(async () => {
  db = await makeTestDb();
  const [l] = await db.insert(landlord).values({ phoneHash: 'h1' }).returning();
  const [v] = await db.insert(verification).values({ landlordId: l!.id, addressText: 'Str. X 1', lat: 45.75, lng: 21.23 }).returning();
  verificationId = v!.id;
});

describe('schema constraints', () => {
  it('rejects the same listing registered twice', async () => {
    const row = { verificationId, site: 'demo', siteListingId: 'd1', url: 'http://x/demo/listing/d1' };
    await db.insert(listing).values(row);
    await expect(db.insert(listing).values(row)).rejects.toThrow();
  });
  it('rejects a second report from the same phone for one verification', async () => {
    const row = { verificationId, reporterPhoneHash: 's1', locationResult: 'TRUE', category: 'no_show' };
    await db.insert(viewingReport).values(row);
    await expect(db.insert(viewingReport).values(row)).rejects.toThrow();
  });
  it('rejects duplicate codes but allows many verifications without a code', async () => {
    const [l] = await db.insert(landlord).values({ phoneHash: 'h2' }).returning();
    const base = { landlordId: l!.id, addressText: 'Str. Y 2', lat: 45.7, lng: 21.2 };
    await db.insert(verification).values([base, base]);
    await db.insert(verification).values({ ...base, code: 'VC-7K3Q' });
    await expect(db.insert(verification).values({ ...base, code: 'VC-7K3Q' })).rejects.toThrow();
  });

  it('a report has at most one case', async () => {
    const [l] = await db.insert(landlord).values({ phoneHash: 'h3' }).returning();
    const [r] = await db.insert(viewingReport).values({ verificationId, reporterPhoneHash: 's1', locationResult: 'TRUE', category: 'no_show' }).returning();
    const row = { reportId: r!.id, landlordId: l!.id, status: 'ready' };
    await db.insert(reportCase).values(row);
    await expect(db.insert(reportCase).values(row)).rejects.toThrow();
  });
  it('deleting a report deletes its case', async () => {
    const [l] = await db.insert(landlord).values({ phoneHash: 'h3' }).returning();
    const [r] = await db.insert(viewingReport).values({ verificationId, reporterPhoneHash: 's1', locationResult: 'TRUE', category: 'no_show' }).returning();
    await db.insert(reportCase).values({ reportId: r!.id, landlordId: l!.id, status: 'ready' });
    await db.delete(viewingReport).where(eq(viewingReport.id, r!.id));
    expect(await db.select().from(reportCase)).toHaveLength(0);
  });
  it('one bar per kind and hash', async () => {
    const row = { kind: 'phone', hash: 'h', expiresAt: new Date('2030-01-01') };
    await db.insert(reporterBar).values(row);
    await expect(db.insert(reporterBar).values(row)).rejects.toThrow();
  });
});
