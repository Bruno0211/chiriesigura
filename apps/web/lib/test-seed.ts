import { phoneHash } from './hash';
import { landlord, listing, verification, viewingReport } from './db/schema';
import type { Db } from './db';

/** Minimal verified landlord for API tests: +40700000001, code VC-7K3Q, listing demo:d1. */
export async function seedVerified(db: Db) {
  const [l] = await db.insert(landlord).values({ phoneHash: phoneHash('+40700000001') }).returning();
  const [v] = await db.insert(verification).values({
    landlordId: l!.id, code: 'VC-7K3Q', addressText: 'Str. Demo 1, Timișoara', lat: 45.7489, lng: 21.2087,
    locationResult: 'TRUE', verifiedAt: new Date('2026-11-14T10:00:00Z'), city: 'Timișoara',
  }).returning();
  await db.insert(listing).values({ verificationId: v!.id, site: 'demo', siteListingId: 'd1', url: 'http://localhost:3000/demo/listing/d1' });
  return { landlordId: l!.id, verificationId: v!.id };
}

export async function addReports(db: Db, verificationId: string, category: string, n: number) {
  for (let i = 0; i < n; i++) {
    await db.insert(viewingReport).values({ verificationId, reporterPhoneHash: `r-${category}-${i}`, locationResult: 'TRUE', category });
  }
}
