import { doublePrecision, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const landlord = pgTable('landlord', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneHash: text('phone_hash').notNull().unique(),
  numberVerifiedAt: timestamp('number_verified_at', { withTimezone: true }),
  kycMatchedAt: timestamp('kyc_matched_at', { withTimezone: true }),
  simCheckedAt: timestamp('sim_checked_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull().references(() => landlord.id),
  code: text('code').unique(),
  addressText: text('address_text').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  locationResult: text('location_result'), // 'TRUE' | 'PARTIAL'
  // Last passed location check not yet used by a listings submission; each submission needs a fresh one.
  locationCheckedAt: timestamp('location_checked_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const listing = pgTable('listing', {
  id: uuid('id').primaryKey().defaultRandom(),
  verificationId: uuid('verification_id').notNull().references(() => verification.id, { onDelete: 'cascade' }),
  site: text('site').notNull(),
  siteListingId: text('site_listing_id').notNull(),
  url: text('url').notNull(),
  createdAt: createdAt(),
}, (t) => [unique('listing_site_id').on(t.site, t.siteListingId)]);

export const viewingReport = pgTable('viewing_report', {
  id: uuid('id').primaryKey().defaultRandom(),
  verificationId: uuid('verification_id').notNull().references(() => verification.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listing.id, { onDelete: 'set null' }),
  reporterPhoneHash: text('reporter_phone_hash').notNull(),
  locationResult: text('location_result').notNull(),
  category: text('category').notNull(),
  createdAt: createdAt(),
}, (t) => [unique('report_once').on(t.verificationId, t.reporterPhoneHash)]);
