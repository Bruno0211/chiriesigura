import { beforeEach, describe, expect, it } from 'vitest';
import { landlord, listing, verification, viewingReport } from './schema';
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
});
