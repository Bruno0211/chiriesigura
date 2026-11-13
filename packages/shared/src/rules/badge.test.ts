import { describe, expect, it } from 'vitest';
import { emptyCounts, type ListingRef, type ReportCounts } from '../types';
import { AMBER_THRESHOLDS, badgeLabel, decideBadge, reportLine, type BadgeInput } from './badge';

const L1: ListingRef = { site: 'demo', listingId: 'd1' };
const L2: ListingRef = { site: 'demo', listingId: 'd2' };
const V = { listings: [L1], phoneHash: 'h1', verifiedAt: '2026-11-14T10:00:00Z' };
const counts = (c: Partial<ReportCounts>): ReportCounts => ({ ...emptyCounts(), ...c });
const input = (i: Partial<BadgeInput>): BadgeInput => ({
  listing: L1, code: 'VC-7K3Q', verification: V, pagePhoneHash: null, reports: emptyCounts(), ...i,
});

describe('decideBadge (spec §6.2, in order)', () => {
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
  it('5: report thresholds turn green into amber', () => {
    expect(decideBadge(input({ reports: counts({ no_show: 3 }) }))).toBe('amber');
    expect(decideBadge(input({ reports: counts({ no_show: 2 }) }))).toBe('green');
    expect(decideBadge(input({ reports: counts({ money_upfront: 2 }) }))).toBe('amber');
    expect(decideBadge(input({ reports: counts({ wrong_person: 3 }) }))).toBe('amber');
  });
  it('6: no code → not verified, parseable listing or not', () => {
    expect(decideBadge(input({ code: null }))).toBe('grey_unverified');
    expect(decideBadge(input({ code: null, listing: null }))).toBe('grey_unverified');
  });
  it('exposes the spec thresholds', () => {
    expect(AMBER_THRESHOLDS).toEqual({ money_upfront: 2, no_show: 3, wrong_person: 3 });
  });
});

describe('badgeLabel', () => {
  it('uses the spec copy verbatim', () => {
    expect(badgeLabel('grey_cannot_confirm')).toBe("Can't confirm");
    expect(badgeLabel('red_fake_code')).toBe('Fake code');
    expect(badgeLabel('red_copied')).toBe('Copied from a verified listing');
    expect(badgeLabel('red_phone_mismatch')).toBe("Phone number doesn't match the verified landlord");
    expect(badgeLabel('green', '2026-11-14T10:00:00Z')).toBe('Verified landlord · near the address · 14 Nov 2026');
    expect(badgeLabel('amber')).toBe('Verified, but warnings from viewers');
    expect(badgeLabel('grey_unverified')).toBe('Not verified');
  });
});

describe('reportLine', () => {
  it('lists each non-zero category', () => {
    expect(reportLine(counts({ ok: 3, no_show: 1 }))).toBe("4 verified viewings: 3 ✅ · 1 didn't show up");
  });
  it('is null when there are no reports', () => {
    expect(reportLine(emptyCounts())).toBeNull();
  });
});
