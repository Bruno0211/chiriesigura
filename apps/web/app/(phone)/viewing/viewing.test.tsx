// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyCounts, reportLine } from '@cs/shared';
import { CONTACT } from '@/lib/contact';
import { ViewingFlow } from './[verificationId]/ViewingFlow';

const VID = '0f3c2b1a-1111-4222-8333-444455556666';

function mockReport(status: number, json: unknown) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => ({ status, json: async () => json }) as Response,
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A student whose number is already confirmed, on the report step. */
function readyToReport() {
  sessionStorage.setItem(`cs.viewing.${VID}`, JSON.stringify({ stage: 'report', phone: '+40711111111', nvAt: Date.now() }));
}

async function sendNoShow() {
  await userEvent.click(screen.getByRole('radio', { name: "Landlord didn't show up" }));
  await userEvent.click(screen.getByRole('button', { name: /i'm at the viewing/i }));
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', `/viewing/${VID}`);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ViewingFlow', () => {
  it('starts with consent naming the number and location checks', () => {
    render(<ViewingFlow verificationId={VID} signedIn />);
    expect(screen.getByRole('heading', { level: 1, name: /report a viewing/i })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('offers the five report categories with their exact labels', () => {
    readyToReport();
    render(<ViewingFlow verificationId={VID} signedIn />);
    for (const label of [
      'All good',
      "Landlord didn't show up",
      "Apartment doesn't match photos/description",
      'Asked for money before the viewing',
      "Person at the viewing isn't the verified landlord",
    ]) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    }
  });

  it('a 403 tells the student to be at the apartment', async () => {
    readyToReport();
    mockReport(403, { ok: false, reason: 'not_at_address' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect(await screen.findByText('You need to be at the apartment to report')).toBeTruthy();
  });

  it('a 409 says the viewing was already reported', async () => {
    readyToReport();
    mockReport(409, { ok: false, reason: 'already_reported' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect(await screen.findByText("You've already reported this viewing")).toBeTruthy();
  });

  it('a double tap submits once', async () => {
    readyToReport();
    const fetchMock = mockReport(200, { ok: true, counts: { ...emptyCounts(), no_show: 1 } });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await userEvent.click(screen.getByRole('radio', { name: "Landlord didn't show up" }));
    await userEvent.dblClick(screen.getByRole('button', { name: /i'm at the viewing/i }));
    await screen.findByRole('heading', { level: 1, name: /report sent/i });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      consent: true,
      verificationId: VID,
      category: 'no_show',
    });
  });

  it('a 200 shows the landlord-wide report line', async () => {
    readyToReport();
    const counts = { ...emptyCounts(), ok: 3, no_show: 1 };
    mockReport(200, { ok: true, counts });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect(await screen.findByText(reportLine(counts)!)).toBeTruthy();
  });

  it('signed out: offers sign-in and no consent screen', () => {
    render(<ViewingFlow verificationId={VID} signedIn={false} />);
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe(`/auth/login?returnTo=/viewing/${VID}`);
    expect(screen.queryByRole('button', { name: /i agree/i })).toBeNull();
  });

  it('a 401 signed_out asks the student to sign in', async () => {
    readyToReport();
    mockReport(401, { ok: false, reason: 'signed_out' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Sign in to report');
    expect(within(alert).getByRole('link').getAttribute('href')).toBe(`/auth/login?returnTo=/viewing/${VID}`);
  });

  it('a 401 not_number_verified still sends the student back to the number step', async () => {
    readyToReport();
    mockReport(401, { ok: false, reason: 'not_number_verified' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect(await screen.findByText(/your number check expired/i)).toBeTruthy();
  });

  it('a 403 barred names the contact', async () => {
    readyToReport();
    mockReport(403, { ok: false, reason: 'barred' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("You can't report on ChirieSigură");
    expect(alert.textContent).toContain(CONTACT);
  });

  it('a 403 own_listing refuses a landlord reporting themselves', async () => {
    readyToReport();
    mockReport(403, { ok: false, reason: 'own_listing' });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect((await screen.findByRole('alert')).textContent).toContain("You can't report your own listing");
  });

  it('a problem report says the team reviews it first', async () => {
    readyToReport();
    mockReport(200, { ok: true, counts: emptyCounts() });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await sendNoShow();
    expect(await screen.findByText('Our team checks every problem report before it shows on the listing.')).toBeTruthy();
  });

  it('an ok report says it shows on the listings', async () => {
    readyToReport();
    mockReport(200, { ok: true, counts: { ...emptyCounts(), ok: 1 } });
    render(<ViewingFlow verificationId={VID} signedIn />);
    await userEvent.click(screen.getByRole('radio', { name: 'All good' }));
    await userEvent.click(screen.getByRole('button', { name: /i'm at the viewing/i }));
    expect(await screen.findByText("Your report shows on all of this landlord's listings.")).toBeTruthy();
  });

  it('shows the listing code passed in the QR link', () => {
    render(<ViewingFlow verificationId={VID} signedIn code="vc-7k3q" />);
    expect(screen.getByText('VC-7K3Q')).toBeTruthy();
  });
});
