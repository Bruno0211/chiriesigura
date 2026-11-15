// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckForm } from './CheckForm';

function stubCheck(status: number, json: unknown) {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => ({ status, ok: status < 400, json: async () => json }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fill(link: string, code: string, phone?: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Listing link/), link);
  await user.type(screen.getByLabelText(/Code from the listing/), code);
  if (phone) await user.type(screen.getByLabelText(/Phone number shown on the listing/), phone);
  await user.click(screen.getByRole('button', { name: 'Check listing' }));
}

const signInLink = () => screen.findByRole('link', { name: 'Sign in' });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CheckForm', () => {
  it('signed out: offers sign-in and no form', async () => {
    render(<CheckForm signedIn={false} />);
    expect((await signInLink()).getAttribute('href')).toBe('/auth/login?returnTo=/check');
    expect(screen.queryByLabelText(/Listing link/)).toBeNull();
  });

  it('sends the parsed listing, code and phone to /api/check and shows the verdict', async () => {
    const f = stubCheck(200, { status: 'green', label: 'Verified landlord · near the address · 14 Nov 2026' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q', '0700 000 001');
    expect(f.mock.calls[0]![0]).toBe('/api/check?site=demo&listingId=d1&code=VC-7K3Q&phone=0700+000+001');
    expect(await screen.findByText(/Verified landlord · near the address/)).toBeTruthy();
  });

  it('an unsupported URL still asks the server, without a listing', async () => {
    const f = stubCheck(200, { status: 'grey_cannot_confirm', label: "Can't confirm" });
    render(<CheckForm signedIn />);
    await fill('https://example.com/x', 'VC-7K3Q');
    expect(f.mock.calls[0]![0]).toBe('/api/check?code=VC-7K3Q');
    expect(await screen.findByText("Can't confirm")).toBeTruthy();
  });

  it("takes the link out of an app's share text", async () => {
    const f = stubCheck(200, { status: 'grey_unverified', label: 'Not verified' });
    render(<CheckForm signedIn />);
    await fill('Garsonieră lângă Politehnica https://www.olx.ro/d/oferta/garsoniera-IDabc12.html', 'VC-7K3Q');
    expect(f.mock.calls[0]![0]).toBe('/api/check?site=olx&listingId=abc12&code=VC-7K3Q');
  });

  it('switches to sign-in when the session has expired', async () => {
    stubCheck(401, { error: 'signed_out' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    expect((await signInLink()).getAttribute('href')).toBe('/auth/login?returnTo=/check');
  });

  it('says it could not check when the server fails, without a verdict', async () => {
    stubCheck(500, { error: 'boom' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    expect(await screen.findByText("Couldn't check this listing. Try again.")).toBeTruthy();
  });

  const REPORT = "I'm at the viewing · Report it";
  it.each(['green', 'amber'] as const)('%s: links to the viewing report for this verification', async (status) => {
    stubCheck(200, { status, label: 'x', verificationId: 'v1' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    expect((await screen.findByRole('link', { name: REPORT })).getAttribute('href')).toBe('/viewing/v1');
  });
  it.each(['red_copied', 'red_banned'] as const)('%s: no report link', async (status) => {
    stubCheck(200, { status, label: 'x' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    await screen.findByText('x');
    expect(screen.queryByRole('link', { name: REPORT })).toBeNull();
  });

  it('a verdict with underReview shows the note under it', async () => {
    stubCheck(200, { status: 'green', label: 'Verified landlord', underReview: true });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    expect(await screen.findByText("Viewers reported a problem · under review · never pay before you've seen the flat.")).toBeTruthy();
  });

  it('without underReview, the note is absent', async () => {
    stubCheck(200, { status: 'green', label: 'Verified landlord' });
    render(<CheckForm signedIn />);
    await fill('http://localhost:3000/demo/listing/d1', 'VC-7K3Q');
    await screen.findByText('Verified landlord');
    expect(screen.queryByText(/under review/)).toBeNull();
  });
});
