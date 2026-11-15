import { and, eq, isNotNull, isNull, or, type SQL } from 'drizzle-orm';
import type { ListingRef, Site } from '@cs/shared';
import type { Db } from './db';
import { landlord, listing, verification } from './db/schema';
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

/** Whether either fingerprint belongs to someone the team banned. */
export async function isBannedIdentity(db: Db, h: IdentityHashes): Promise<boolean> {
  const [hit] = await db
    .select({ id: landlord.id })
    .from(landlord)
    .where(and(isNotNull(landlord.bannedAt), or(eq(landlord.idDocHash, h.idDocHash), eq(landlord.nameBirthHash, h.nameBirthHash))))
    .limit(1);
  return !!hit;
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
