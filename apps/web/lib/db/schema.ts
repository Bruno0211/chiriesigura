import { boolean, doublePrecision, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const landlord = pgTable('landlord', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneHash: text('phone_hash').notNull().unique(),
  numberVerifiedAt: timestamp('number_verified_at', { withTimezone: true }),
  kycMatchedAt: timestamp('kyc_matched_at', { withTimezone: true }),
  simCheckedAt: timestamp('sim_checked_at', { withTimezone: true }),
  // Keyed hashes of the KYC-confirmed ID card number and name + birthdate; the ban follows the person across SIMs.
  idDocHash: text('id_doc_hash'),
  nameBirthHash: text('name_birth_hash'),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull().references(() => landlord.id),
  code: text('code').unique(),
  addressText: text('address_text').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  // The city of the verified address, shown on the badge (never the street).
  city: text('city'),
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
  reporterAccountHash: text('reporter_account_hash'),
  simSwapped: boolean('sim_swapped'),
  createdAt: createdAt(),
}, (t) => [unique('report_once').on(t.verificationId, t.reporterPhoneHash)]);

export const reportCase = pgTable('report_case', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().unique().references(() => viewingReport.id, { onDelete: 'cascade' }),
  landlordId: uuid('landlord_id').notNull().references(() => landlord.id),
  status: text('status').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedBy: text('decided_by'),
  createdAt: createdAt(),
});

export const reporterBar = pgTable('reporter_bar', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  hash: text('hash').notNull(),
  caseId: uuid('case_id').references(() => reportCase.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [unique('bar_once').on(t.kind, t.hash)]);

// The landlord's own description for an editable /demo listing, lines joined by "\n". The seed deletes every row.
export const demoListingEdit = pgTable('demo_listing_edit', {
  listingId: text('listing_id').primaryKey(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
