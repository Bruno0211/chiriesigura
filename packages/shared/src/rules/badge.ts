import { REPORT_CATEGORIES, type BadgeStatus, type ListingRef, type ReportCategory, type ReportCounts } from '../types';

export interface BadgeInput {
  listing: ListingRef | null;
  code: string | null;
  /** null = the code is unknown */
  verification: { listings: ListingRef[]; phoneHash: string; verifiedAt: string; banned: boolean } | null;
  pagePhoneHash: string | null;
  reports: ReportCounts;
}

export const AMBER_THRESHOLDS = { money_upfront: 2, no_show: 3, wrong_person: 3 } as const;

export const isWarned = (r: ReportCounts): boolean =>
  r.money_upfront >= AMBER_THRESHOLDS.money_upfront ||
  r.no_show >= AMBER_THRESHOLDS.no_show ||
  r.wrong_person >= AMBER_THRESHOLDS.wrong_person;

/** Spec §6.2 rules, evaluated in order. */
export function decideBadge(i: BadgeInput): BadgeStatus {
  if (!i.code) return 'grey_unverified';
  if (!i.listing) return 'grey_cannot_confirm';
  if (!i.verification) return 'red_fake_code';
  if (i.verification.banned) return 'red_banned';
  const { site, listingId } = i.listing;
  if (!i.verification.listings.some((l) => l.site === site && l.listingId === listingId)) return 'red_copied';
  if (i.pagePhoneHash && i.pagePhoneHash !== i.verification.phoneHash) return 'red_phone_mismatch';
  return isWarned(i.reports) ? 'amber' : 'green';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const LABELS: Record<Exclude<BadgeStatus, 'green'>, string> = {
  amber: 'Verified, but warnings from viewers',
  red_fake_code: 'Fake code',
  red_copied: 'Copied from a verified listing',
  red_phone_mismatch: "Phone number doesn't match the verified landlord",
  red_banned: 'Landlord banned',
  grey_unverified: 'Not verified',
  grey_cannot_confirm: "Can't confirm",
};

export function badgeLabel(status: BadgeStatus, verifiedAt?: string): string {
  if (status !== 'green') return LABELS[status];
  return verifiedAt ? `Verified landlord · near the address · ${formatDate(verifiedAt)}` : 'Verified landlord · near the address';
}

const CATEGORY_TEXT: Record<ReportCategory, string> = {
  ok: '✅',
  no_show: "didn't show up",
  mismatch: "doesn't match the listing",
  money_upfront: 'asked for money first',
  wrong_person: 'wrong person',
};

export function reportLine(c: ReportCounts): string | null {
  const total = REPORT_CATEGORIES.reduce((n, k) => n + c[k], 0);
  if (total === 0) return null;
  const parts = REPORT_CATEGORIES.filter((k) => c[k] > 0).map((k) => `${c[k]} ${CATEGORY_TEXT[k]}`);
  return `${total} verified viewing${total === 1 ? '' : 's'}: ${parts.join(' · ')}`;
}
