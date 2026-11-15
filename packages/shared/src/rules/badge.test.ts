import { describe, expect, it } from 'vitest';
import { emptyCounts, type ListingRef, type ReportCounts } from '../types';
import { badgeLabel, decideBadge, reportLine, UNDER_REVIEW_TEXT, type BadgeInput } from './badge';

const L1: ListingRef = { site: 'demo', listingId: 'd1' };
const L2: ListingRef = { site: 'demo', listingId: 'd2' };
const V = { listings: [L1], phoneHash: 'h1', verifiedAt: '2026-11-14T10:00:00Z', banned: false };
const counts = (c: Partial<ReportCounts>): ReportCounts => ({ ...emptyCounts(), ...c });
const input = (i: Partial<BadgeInput>): BadgeInput => ({
  listing: L1, code: 'VC-7K3Q', verification: V, pagePhoneHash: null, listingFar: false, ...i,
});

describe('decideBadge (spec §6.2, in order)', () => {
  it('a listing far from the verified place is red_far_away', () => {
    expect(decideBadge(input({ pagePhoneHash: 'h1', listingFar: true }))).toBe('red_far_away');
  });
  it('banned, copied and phone mismatch still win over far away', () => {
    expect(decideBadge(input({ listingFar: true, verification: { ...V, banned: true } }))).toBe('red_banned');
    expect(decideBadge(input({ listingFar: true, listing: L2 }))).toBe('red_copied');
    expect(decideBadge(input({ listingFar: true, pagePhoneHash: 'h2' }))).toBe('red_phone_mismatch');
  });
  it('a banned landlord shows red_banned on their own listing', () => {
    expect(decideBadge(input({ verification: { ...V, banned: true } }))).toBe('red_banned');
  });
  it('a banned landlord shows red_banned even on a copied listing', () => {
    expect(decideBadge(input({ listing: L2, verification: { ...V, banned: true } }))).toBe('red_banned');
  });
  it('1: code but no parseable listing → cannot confirm', () => {
    expect(decideBadge(input({ listing: null }))).toBe('grey_cannot_confirm');
  });
  it('2: unknown code → fake code', () => {
    expect(decideBadge(input({ verification: null }))).toBe('red_fake_code');
  });
  it('3: code registered to another listing → copied', () => {
    expect(decideBadge(input({ listing: L2 }))).toBe('red_copied');
  });
  it('4: visible phone differs → phone mismatch', () => {
    expect(decideBadge(input({ pagePhoneHash: 'h2' }))).toBe('red_phone_mismatch');
  });
  it('5: registered listing → green, with or without a matching phone', () => {
    expect(decideBadge(input({}))).toBe('green');
    expect(decideBadge(input({ pagePhoneHash: 'h1' }))).toBe('green');
  });
  it('the soft note copy is verbatim', () => {
    expect(UNDER_REVIEW_TEXT).toBe("Viewers reported a problem · under review · never pay before you've seen the flat.");
  });
  it('6: no code → not verified, parseable listing or not', () => {
    expect(decideBadge(input({ code: null }))).toBe('grey_unverified');
    expect(decideBadge(input({ code: null, listing: null }))).toBe('grey_unverified');
  });
});

describe('badgeLabel', () => {
  it('labels red_banned', () => expect(badgeLabel('red_banned')).toBe('Landlord banned'));
  it('labels red_far_away', () => expect(badgeLabel('red_far_away')).toBe('Listing is far from where the landlord verified'));
  it('the green label names the verified city', () => {
    expect(badgeLabel('green', '2026-11-14T10:00:00Z', 'Timișoara')).toBe('Verified landlord · near Timișoara · 14 Nov 2026');
    expect(badgeLabel('green', '2026-11-14T10:00:00Z', null)).toBe('Verified landlord · near the address · 14 Nov 2026');
  });
  it('uses the spec copy verbatim', () => {
    expect(badgeLabel('grey_cannot_confirm')).toBe("Can't confirm");
    expect(badgeLabel('red_fake_code')).toBe('Fake code');
    expect(badgeLabel('red_copied')).toBe('Copied from a verified listing');
    expect(badgeLabel('red_phone_mismatch')).toBe("Phone number doesn't match the verified landlord");
    expect(badgeLabel('green', '2026-11-14T10:00:00Z')).toBe('Verified landlord · near the address · 14 Nov 2026');
    expect(badgeLabel('grey_unverified')).toBe('Not verified');
  });
});

describe('reportLine', () => {
  it('lists each non-zero category', () => {
    expect(reportLine(counts({ ok: 3, no_show: 1 }))).toBe("4 verified viewings: 3 all good · 1 didn't show up");
  });
  it('is null when there are no reports', () => {
    expect(reportLine(emptyCounts())).toBeNull();
  });
});
