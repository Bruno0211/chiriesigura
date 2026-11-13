import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { emptyCounts, REPORT_CATEGORIES, type ListingRef, type ReportCategory, type ReportCounts, type Site } from '@cs/shared';
import type { Db } from './db';
import { landlord, listing, verification, viewingReport } from './db/schema';

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

/** Reports attach to the landlord: counts across all of their verifications. */
export async function landlordReportCounts(db: Db, landlordId: string): Promise<ReportCounts> {
  const rows = await db
    .select({ category: viewingReport.category, n: sql<number>`count(*)::int` })
    .from(viewingReport)
    .innerJoin(verification, eq(verification.id, viewingReport.verificationId))
    .where(eq(verification.landlordId, landlordId))
    .groupBy(viewingReport.category);
  const counts = emptyCounts();
  for (const r of rows) if (REPORT_CATEGORIES.includes(r.category as ReportCategory)) counts[r.category as ReportCategory] = Number(r.n);
  return counts;
}
