import { phoneHash } from './hash';
import { eq } from 'drizzle-orm';
import { landlord, listing, reportCase, verification, viewingReport } from './db/schema';
import type { Db } from './db';
import type { CaseStatus } from './cases';

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

/** n reports of one category, each with its own case. Returns the case ids. */
export async function addCases(
  db: Db, verificationId: string, category: string, n: number, status: CaseStatus = 'ready', decidedAt?: Date,
): Promise<string[]> {
  const [v] = await db.select({ landlordId: verification.landlordId }).from(verification).where(eq(verification.id, verificationId));
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const [r] = await db.insert(viewingReport).values({
      verificationId, reporterPhoneHash: `c-${category}-${i}`, reporterAccountHash: `a-${category}-${i}`, locationResult: 'TRUE', category,
    }).returning();
    const [c] = await db.insert(reportCase).values({ reportId: r!.id, landlordId: v!.landlordId, status, decidedAt: decidedAt ?? null }).returning();
    ids.push(c!.id);
  }
  return ids;
}
