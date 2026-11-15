export type Site = 'olx' | 'storia' | 'imobiliare' | 'demo';
export interface ListingRef { site: Site; listingId: string }

export type ReportCategory = 'ok' | 'no_show' | 'mismatch' | 'money_upfront' | 'wrong_person';
export const REPORT_CATEGORIES: readonly ReportCategory[] = ['ok', 'no_show', 'mismatch', 'money_upfront', 'wrong_person'];
export type ReportCounts = Record<ReportCategory, number>;
export const emptyCounts = (): ReportCounts => ({ ok: 0, no_show: 0, mismatch: 0, money_upfront: 0, wrong_person: 0 });

export type LocationResult = 'TRUE' | 'PARTIAL' | 'FALSE' | 'UNKNOWN';

export type BadgeStatus =
  | 'green'
  | 'red_fake_code' | 'red_copied' | 'red_phone_mismatch' | 'red_banned' | 'red_far_away'
  | 'grey_unverified' | 'grey_cannot_confirm';
