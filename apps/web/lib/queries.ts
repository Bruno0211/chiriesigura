import { and, eq, isNotNull, or, sql } from 'drizzle-orm';
import { emptyCounts, REPORT_CATEGORIES, type ListingRef, type ReportCategory, type ReportCounts, type Site } from '@cs/shared';
import type { Db } from './db';
import { landlord, listing, verification, viewingReport } from './db/schema';
import type { IdentityHashes } from './hash';

export interface IssuedVerification {
  id: string;
  landlordId: string;
  listings: ListingRef[];
  phoneHash: string;
  verifiedAt: string;
  locationResult: 'TRUE' | 'PARTIAL';
}

/** Only issued codes (verification completed) count. */
export async function findVerificationByCode(db: Db, code: string): Promise<IssuedVerification | null> {
  const [v] = await db
    .select({ id: verification.id, landlordId: verification.landlordId, verifiedAt: verification.verifiedAt, locationResult: verification.locationResult, phoneHash: landlord.phoneHash })
    .from(verification)
    .innerJoin(landlord, eq(landlord.id, verification.landlordId))
    .where(and(eq(verification.code, code), isNotNull(verification.verifiedAt)));
  if (!v?.verifiedAt) return null;
  const rows = await db.select({ site: listing.site, listingId: listing.siteListingId }).from(listing).where(eq(listing.verificationId, v.id));
  return {
    id: v.id,
    landlordId: v.landlordId,
    phoneHash: v.phoneHash,
    verifiedAt: v.verifiedAt.toISOString(),
    locationResult: v.locationResult as 'TRUE' | 'PARTIAL',
    listings: rows.map((r) => ({ site: r.site as Site, listingId: r.listingId })),
  };
}

/** Reports attach to the landlord: across all their verifications, each reporter counts once per category. */
export async function landlordReportCounts(db: Db, landlordId: string): Promise<ReportCounts> {
  const rows = await db
    .select({ category: viewingReport.category, n: sql<number>`count(distinct ${viewingReport.reporterPhoneHash})::int` })
    .from(viewingReport)
    .innerJoin(verification, eq(verification.id, viewingReport.verificationId))
    .where(eq(verification.landlordId, landlordId))
    .groupBy(viewingReport.category);
  const counts = emptyCounts();
  for (const r of rows) if (REPORT_CATEGORIES.includes(r.category as ReportCategory)) counts[r.category as ReportCategory] = Number(r.n);
  return counts;
}

/** Whether either fingerprint belongs to someone the team banned. */
export async function isBannedIdentity(db: Db, h: IdentityHashes): Promise<boolean> {
  const [hit] = await db
    .select({ id: landlord.id })
    .from(landlord)
    .where(and(isNotNull(landlord.bannedAt), or(eq(landlord.idDocHash, h.idDocHash), eq(landlord.nameBirthHash, h.nameBirthHash))))
    .limit(1);
  return !!hit;
}
