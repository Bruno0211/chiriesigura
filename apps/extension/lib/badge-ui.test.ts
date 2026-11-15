import type { BadgeStatus, CheckResponse } from '@cs/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBadge, renderEmpty, renderState } from './badge-ui';

const APP = 'http://localhost:3000';
const OPTS = { appUrl: APP, code: 'VC-7K3Q', phoneShown: true };

/** Verbatim badge copy (spec §6.2), written out by hand rather than taken from badgeLabel(). */
const LABELS: Record<BadgeStatus, string> = {
  green: 'Verified landlord · near the address · 14 Nov 2026',
  amber: 'Verified, but warnings from viewers',
  red_fake_code: 'Fake code',
  red_copied: 'Copied from a verified listing',
  red_phone_mismatch: "Phone number doesn't match the verified landlord",
  red_banned: 'Landlord banned',
  red_far_away: 'Listing is far from where the landlord verified',
  grey_unverified: 'Not verified',
  grey_cannot_confirm: "Can't confirm",
};
const STATUSES = Object.keys(LABELS) as BadgeStatus[];
const VERIFIED = { verificationId: 'v1', verifiedAt: '2026-11-14T10:00:00Z', locationResult: 'TRUE' as const };

const res = (status: BadgeStatus, extra: Partial<CheckResponse> = {}): CheckResponse => ({
  status,
  label: LABELS[status],
  ...(status === 'green' || status === 'amber' ? VERIFIED : {}),
  ...extra,
});

let host: HTMLElement;
const root = () => host.shadowRoot!;
const text = () => root().textContent ?? '';
const qr = () => root().querySelector('svg[role="img"]');
const button = (name: string) =>
  [...root().querySelectorAll('button')].find((b) => b.textContent?.trim() === name) ?? null;
const failedRow = () => root().querySelector('[data-state="fail"]')?.closest('li')?.textContent ?? null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  host.remove();
  vi.unstubAllGlobals();
});

describe('renderBadge', () => {
  it.each(STATUSES)('shows the verbatim label for %s', (status) => {
    renderBadge(host, res(status), OPTS);
    expect(text()).toContain(LABELS[status]);
  });

  it.each(['green', 'amber'] as const)('%s shows the under-review note when a report is open', (status) => {
    renderBadge(host, res(status, { underReview: true }), OPTS);
    expect(text()).toContain("Viewers reported a problem · under review · never pay before you've seen the flat.");
  });

  it('no under-review note without an open report', () => {
    renderBadge(host, res('green'), OPTS);
    expect(text()).not.toContain('under review');
  });

  it.each(['green', 'amber'] as const)('%s offers a QR code to the viewing report, carrying the listing code', (status) => {
    renderBadge(host, res(status), OPTS);
    expect(qr()?.getAttribute('aria-label')).toBe('QR code: report a viewing');
    const link = root().querySelector<HTMLAnchorElement>('a[href*="/viewing/"]');
    expect(link?.href).toBe(`${APP}/viewing/v1?code=VC-7K3Q`);
    expect(button('Ask the landlord to verify')).toBeNull();
  });

  it('grey_unverified offers the ask button and no QR code', () => {
    renderBadge(host, res('grey_unverified'), { ...OPTS, code: null });
    expect(button('Ask the landlord to verify')).not.toBeNull();
    expect(qr()).toBeNull();
  });

  it.each(['red_fake_code', 'red_copied', 'red_phone_mismatch', 'red_banned', 'red_far_away', 'grey_cannot_confirm'] as const)(
    '%s shows neither a QR code nor the ask button',
    (status) => {
      renderBadge(host, res(status), OPTS);
      expect(qr()).toBeNull();
      expect(button('Ask the landlord to verify')).toBeNull();
    },
  );

  it.each([
    ['red_fake_code', 'Code issued by ChirieSigură'],
    ['red_copied', 'Registered to this listing'],
    ['red_phone_mismatch', 'Phone matches the verified one'],
    ['red_banned', 'Landlord in good standing'],
    ['red_far_away', 'Flat in the same area'],
    ['grey_cannot_confirm', 'Listing ID readable from the link'],
  ] as const)('%s names the check that failed: %s', (status, check) => {
    renderBadge(host, res(status), OPTS);
    expect(root().querySelectorAll('[data-state="fail"]')).toHaveLength(1);
    expect(failedRow()).toContain(check);
  });

  it('red_far_away explains the place mismatch and warns against paying', () => {
    renderBadge(host, res('red_far_away'), OPTS);
    expect(failedRow()).toContain('Where this listing says the flat is, is far from where the landlord verified.');
    expect(root().textContent).toContain("Don't send a deposit");
    expect(root().textContent).toContain('Registered to this listing');
  });

  it.each(['green', 'amber'] as const)('%s names the city the landlord verified in', (status) => {
    renderBadge(host, res(status, { city: 'Timișoara' }), OPTS);
    expect(root().textContent).toContain('near Timișoara');
  });

  it('says nothing about a city it does not know', () => {
    renderBadge(host, res('amber'), OPTS);
    expect([...root().querySelectorAll('.footLine')].map((e) => e.textContent).join(' ')).not.toContain('near ');
  });

  it('shows the report line when viewers have reported', () => {
    renderBadge(host, res('green', { reports: { ok: 3, no_show: 1, mismatch: 0, money_upfront: 0, wrong_person: 0 } }), OPTS);
    // No colour emoji: "all good" in words, with the badge's own drawn check beside them.
    expect(text()).toContain("4 verified viewings: 3 all good · 1 didn't show up");
    expect(text()).not.toContain('✅');
    expect(root().querySelector('.reportLine svg.okMark')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no report section when there are no reports', () => {
    renderBadge(host, res('green'), OPTS);
    expect(text()).not.toContain('verified viewing');
  });

  it('starts collapsed and the head toggles the panel', () => {
    renderBadge(host, res('green'), OPTS);
    const head = root().querySelector<HTMLButtonElement>('button[aria-expanded]')!;
    const panel = root().getElementById(head.getAttribute('aria-controls')!)!;
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    head.click();
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
  });

  it('keeps one badge and its open state when the page is re-checked', () => {
    renderBadge(host, res('green'), OPTS);
    root().querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    renderBadge(host, res('amber'), OPTS);
    expect(root().querySelectorAll('button[aria-expanded]')).toHaveLength(1);
    expect(root().querySelector('button[aria-expanded]')!.getAttribute('aria-expanded')).toBe('true');
    expect(text()).toContain(LABELS.amber);
    expect(text()).not.toContain(LABELS.green);
  });

  it('in the toolbar popup the panel is always open, with no toggle', () => {
    renderBadge(host, res('green'), { ...OPTS, mode: 'popup' });
    expect(root().querySelector('button[aria-expanded]')).toBeNull();
    expect(qr()).not.toBeNull();
  });

  it('copies the ask message for the landlord', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderBadge(host, res('grey_unverified'), { ...OPTS, code: null });
    button('Ask the landlord to verify')!.click();
    await vi.waitFor(() => expect(button('Copied')).not.toBeNull());
    expect(writeText).toHaveBeenCalledWith(
      'Hi! Before I visit, could you verify your listing on ChirieSigură? It takes 2 minutes: http://localhost:3000/verify',
    );
  });
});

describe('renderEmpty', () => {
  it('tells the student where the badge works and points landlords to /verify', () => {
    renderEmpty(host, { appUrl: 'https://cs.example/' });
    expect(text()).toContain('No listing on this page');
    expect(root().querySelector<HTMLAnchorElement>('a[href$="/verify"]')?.href).toBe('https://cs.example/verify');
    expect(root().querySelector('button[aria-expanded]')).toBeNull();
  });
});

describe('renderState', () => {
  it('says it is checking while the answer is on its way', () => {
    renderState(host, 'checking', OPTS);
    expect(text()).toContain('Checking this listing');
  });

  it('asks a signed-out student to sign in', () => {
    const onRetry = vi.fn();
    renderState(host, 'signed_out', { ...OPTS, onRetry });
    expect(text()).toContain('Sign in to check listings');
    expect(text()).not.toContain("Couldn't check");
    root().querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    const link = [...root().querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Sign in');
    expect(link?.href).toBe('http://localhost:3000/auth/login?returnTo=/signed-in');
    expect(link?.target).toBe('_blank');
    button('Try again')!.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers a retry when ChirieSigură cannot be reached', () => {
    const onRetry = vi.fn();
    renderState(host, 'unavailable', { ...OPTS, onRetry });
    root().querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    button('Try again')!.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
