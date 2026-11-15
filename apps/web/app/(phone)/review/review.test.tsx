// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseItem } from '@/lib/cases';
import { ReviewList } from './ReviewList';

const item = (id: string, extra: Partial<CaseItem> = {}): CaseItem => ({
  caseId: id,
  landlordId: 'l-1',
  status: 'ready',
  category: 'money_upfront',
  createdAt: '2026-11-14T10:00:00Z',
  locationResult: 'TRUE',
  listings: [{ site: 'demo', listingId: 'd5', url: 'https://chiriesigura.vercel.app/demo/listing/d5' }],
  signs: [],
  ...extra,
});

function stubPost(status = 200) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => ({ status, ok: status < 400, json: async () => ({}) }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const card = (id: string) => screen.getByTestId(`case-${id}`);
const posted = (caseId: string, action: string) =>
  expect.objectContaining({ method: 'POST', body: JSON.stringify({ caseId, action }) });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReviewList', () => {
  it('shows one card per case: category, date, signs and listing links', () => {
    render(<ReviewList items={[item('a', { signs: ['burst', 'sim_changed', 'reporter_barred'] }), item('b', { category: 'no_show' })]} />);
    const a = within(card('a'));
    expect(a.getByRole('heading', { name: 'Asked for money first' })).toBeTruthy();
    expect(a.getByText('14 Nov')).toBeTruthy();
    expect(a.getByText('Burst: other reports on this landlord within 2 hours')).toBeTruthy();
    expect(a.getByText("Reporter's SIM changed in the last 30 days")).toBeTruthy();
    expect(a.getByText('Reporter is barred for a false report')).toBeTruthy();
    expect(a.getByText("Reporter's phone was at the address")).toBeTruthy();
    expect(a.getByRole('link', { name: 'demo/d5' }).getAttribute('href')).toBe('https://chiriesigura.vercel.app/demo/listing/d5');
    const b = within(card('b'));
    expect(b.getByRole('heading', { name: "Didn't show up" })).toBeTruthy();
    expect(b.queryByText(/Burst/)).toBeNull();
  });

  it('asks once before banning, then posts { caseId, action: "ban" }', async () => {
    const fetchMock = stubPost();
    render(<ReviewList items={[item('a')]} />);
    const user = userEvent.setup();
    await user.click(within(card('a')).getByRole('button', { name: 'Ban for life' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(card('a')).getByText('Ban this person for life? Every listing and any new verification with the same ID is blocked.')).toBeTruthy();
    await user.click(within(card('a')).getByRole('button', { name: 'Yes, ban for life' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review', posted('a', 'ban'));
    expect(await within(card('a')).findByText('Banned')).toBeTruthy();
  });

  it('asks once before marking a report false', async () => {
    const fetchMock = stubPost();
    render(<ReviewList items={[item('a')]} />);
    const user = userEvent.setup();
    await user.click(within(card('a')).getByRole('button', { name: 'False report' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(card('a')).getByText("Mark this report false? The reporter can't report again for 2 years.")).toBeTruthy();
    await user.click(within(card('a')).getByRole('button', { name: 'Cancel' }));
    expect(within(card('a')).queryByText(/Mark this report false/)).toBeNull();
    await user.click(within(card('a')).getByRole('button', { name: 'False report' }));
    await user.click(within(card('a')).getByRole('button', { name: 'Yes, mark it false' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/review', posted('a', 'false_report'));
    expect(await within(card('a')).findByText('Marked false')).toBeTruthy();
  });

  it('confirm warning and dismiss post at once', async () => {
    const fetchMock = stubPost();
    render(<ReviewList items={[item('a'), item('b')]} />);
    const user = userEvent.setup();
    await user.click(within(card('a')).getByRole('button', { name: 'Confirm warning' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review', posted('a', 'uphold'));
    expect(await within(card('a')).findByText('Warning confirmed')).toBeTruthy();
    await user.click(within(card('b')).getByRole('button', { name: 'Dismiss' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review', posted('b', 'dismiss'));
    expect(await within(card('b')).findByText('Dismissed')).toBeTruthy();
  });

  it('a failed request shows an error and keeps the buttons', async () => {
    stubPost(409);
    render(<ReviewList items={[item('a')]} />);
    await userEvent.setup().click(within(card('a')).getByRole('button', { name: 'Dismiss' }));
    expect(await within(card('a')).findByRole('alert')).toBeTruthy();
    for (const name of ['Confirm warning', 'Ban for life', 'Dismiss', 'False report']) {
      expect(within(card('a')).getByRole('button', { name })).toBeTruthy();
    }
  });

  it('says when nothing is waiting', () => {
    render(<ReviewList items={[]} />);
    expect(screen.getByText('No reports waiting.')).toBeTruthy();
  });
});
