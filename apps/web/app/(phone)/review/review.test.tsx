// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyCounts } from '@cs/shared';
import type { HoldItem } from '@/lib/queries';
import { ReviewList } from './ReviewList';

const item = (id: string, extra: Partial<HoldItem> = {}): HoldItem => ({
  landlordId: id,
  reports: { ...emptyCounts(), money_upfront: 3 },
  lastReportAt: '2026-11-14T10:00:00Z',
  listings: [{ site: 'demo', listingId: 'd5', url: 'https://chiriesigura.vercel.app/demo/listing/d5' }],
  ...extra,
});

function stubPost(status = 200) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => ({ status, ok: status < 400, json: async () => ({}) }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const card = (id: string) => screen.getByTestId(`hold-${id}`);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReviewList', () => {
  it('shows one card per landlord on hold, with reports, date and listing links', () => {
    render(<ReviewList items={[item('a'), item('b')]} />);
    const a = within(card('a'));
    expect(a.getByText('3 verified viewings: 3 asked for money first')).toBeTruthy();
    expect(a.getByText(/Last report 14 Nov/)).toBeTruthy();
    expect(a.getByRole('link', { name: 'demo/d5' }).getAttribute('href')).toBe('https://chiriesigura.vercel.app/demo/listing/d5');
    expect(card('b')).toBeTruthy();
  });

  it('asks once before banning, then posts the ban', async () => {
    const fetchMock = stubPost();
    render(<ReviewList items={[item('a')]} />);
    const user = userEvent.setup();
    await user.click(within(card('a')).getByRole('button', { name: 'Confirm ban' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(card('a')).getByText('Ban this person for life? Every listing and any new verification with the same ID is blocked.')).toBeTruthy();
    await user.click(within(card('a')).getByRole('button', { name: 'Yes, ban for life' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review', expect.objectContaining({ method: 'POST', body: JSON.stringify({ landlordId: 'a', action: 'ban' }) }));
    expect(await within(card('a')).findByText('Banned')).toBeTruthy();
  });

  it('dismisses', async () => {
    const fetchMock = stubPost();
    render(<ReviewList items={[item('a')]} />);
    await userEvent.setup().click(within(card('a')).getByRole('button', { name: 'Dismiss' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review', expect.objectContaining({ body: JSON.stringify({ landlordId: 'a', action: 'dismiss' }) }));
    expect(await within(card('a')).findByText('Dismissed')).toBeTruthy();
  });

  it('a failed request shows an error and keeps the buttons', async () => {
    stubPost(500);
    render(<ReviewList items={[item('a')]} />);
    await userEvent.setup().click(within(card('a')).getByRole('button', { name: 'Dismiss' }));
    expect(await within(card('a')).findByRole('alert')).toBeTruthy();
    expect(within(card('a')).getByRole('button', { name: 'Dismiss' })).toBeTruthy();
  });

  it('says when nobody is on hold', () => {
    render(<ReviewList items={[]} />);
    expect(screen.getByText('No landlords on hold.')).toBeTruthy();
  });
});
