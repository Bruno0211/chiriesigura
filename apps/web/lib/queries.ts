import { and, desc, eq, isNotNull, isNull, max, or, sql, type SQL } from 'drizzle-orm';
import { emptyCounts, isWarned, REPORT_CATEGORIES, type ListingRef, type ReportCategory, type ReportCounts, type Site } from '@cs/shared';
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
  banned: boolean;
  lat: number;
  lng: number;
  city: string | null;
}

/** Only issued codes (verification completed) count. */
export async function findVerificationByCode(db: Db, code: string): Promise<IssuedVerification | null> {
  const [v] = await db
    .select({ id: verification.id, landlordId: verification.landlordId, verifiedAt: verification.verifiedAt, locationResult: verification.locationResult, lat: verification.lat, lng: verification.lng, city: verification.city, phoneHash: landlord.phoneHash, bannedAt: landlord.bannedAt })
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
    banned: v.bannedAt !== null,
    lat: v.lat,
    lng: v.lng,
    city: v.city,
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

export interface HoldItem {
  landlordId: string;
  reports: ReportCounts;
  lastReportAt: string;
  listings: { site: string; listingId: string; url: string }[];
}

/** Landlords waiting for a team decision: over the warning thresholds, not banned, and not dismissed since their last report. */
export async function holdList(db: Db): Promise<HoldItem[]> {
  // shortcut: one query per reported landlord, fine for hackathon volumes; aggregate in SQL if the list grows.
  const rows = await db
    .select({ id: landlord.id, dismissedAt: landlord.reviewDismissedAt, last: max(viewingReport.createdAt) })
    .from(landlord)
    .innerJoin(verification, eq(verification.landlordId, landlord.id))
    .innerJoin(viewingReport, eq(viewingReport.verificationId, verification.id))
    .where(isNull(landlord.bannedAt))
    .groupBy(landlord.id)
    .orderBy(desc(max(viewingReport.createdAt)));
  const items: HoldItem[] = [];
  for (const r of rows) {
    if (!r.last || (r.dismissedAt && r.last <= r.dismissedAt)) continue;
    const reports = await landlordReportCounts(db, r.id);
    if (!isWarned(reports)) continue;
    const listings = await db
      .select({ site: listing.site, listingId: listing.siteListingId, url: listing.url })
      .from(listing)
      .innerJoin(verification, eq(verification.id, listing.verificationId))
      .where(eq(verification.landlordId, r.id));
    items.push({ landlordId: r.id, reports, lastReportAt: r.last.toISOString(), listings });
  }
  return items;
}

/**
 * Bans the person behind this landlord row: it and every row with the same ID card hash. Name + birthdate alone
 * never spreads a ban, so an innocent namesake isn't banned without review (spec §4.9). False if the row doesn't exist.
 */
export async function banPerson(db: Db, landlordId: string): Promise<boolean> {
  const [l] = await db.select().from(landlord).where(eq(landlord.id, landlordId));
  if (!l) return false;
  const same: SQL[] = [eq(landlord.id, l.id)];
  if (l.idDocHash) same.push(eq(landlord.idDocHash, l.idDocHash));
  await db.update(landlord).set({ bannedAt: new Date() }).where(and(isNull(landlord.bannedAt), or(...same)));
  return true;
}

export async function dismissHold(db: Db, landlordId: string): Promise<boolean> {
  const rows = await db.update(landlord).set({ reviewDismissedAt: new Date() }).where(eq(landlord.id, landlordId)).returning({ id: landlord.id });
  return rows.length > 0;
}
