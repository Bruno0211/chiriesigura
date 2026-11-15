// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerifyWizard } from './VerifyWizard';

const ID_NUMBER = 'TM123456';
const VID = '0f3c2b1a-1111-4222-8333-444455556666';

type Route = (body: unknown) => { status: number; json: unknown };

function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const { status, json } = route(init?.body ? JSON.parse(String(init.body)) : undefined);
    return { status, json: async () => json } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const identityOk: Route = () => ({
  status: 200,
  json: {
    ok: true,
    verificationId: VID,
    steps: [
      { name: 'number', ok: true, message: 'Phone number confirmed' },
      { name: 'kyc', ok: true, message: "ID details match this phone number's owner" },
      { name: 'simswap', ok: true, message: 'No recent SIM change' },
    ],
  },
});

/** A landlord who already holds a code for one listing. */
const DONE = {
  stage: 'done',
  phone: '+40700000001',
  nvAt: Date.now(),
  verificationId: VID,
  steps: [
    { name: 'number', ok: true, message: 'Phone number confirmed' },
    { name: 'kyc', ok: true, message: "ID details match this phone number's owner" },
    { name: 'simswap', ok: true, message: 'No recent SIM change' },
  ],
  location: { name: 'location', ok: true, message: 'Your phone is at the address' },
  times: { number: '14:31:07', kyc: '14:32:40', simswap: '14:32:40', location: '14:33:12' },
  code: 'VC-7K3Q',
  pasteLine: 'Proprietar verificat · ChirieSigură VC-7K3Q',
  issuedAt: Date.now(),
  accepted: [{ site: 'demo', listingId: 'd1' }],
  rejected: [],
};

/** Lands on /verify as the operator callback does: number stage saved, `?nv=ok` in the URL. */
function arriveVerified() {
  window.history.replaceState(null, '', '/verify?nv=ok');
  sessionStorage.setItem('cs.verify', JSON.stringify({ stage: 'number', phone: '+40700000001' }));
}

async function fillIdentity() {
  await userEvent.type(await screen.findByLabelText(/given name/i), 'Ana');
  await userEvent.type(screen.getByLabelText(/family name/i), 'Popescu');
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1980-05-01' } });
  await userEvent.type(screen.getByLabelText(/id card series and number/i), ID_NUMBER);
  await userEvent.type(screen.getByLabelText(/apartment address/i), 'Str. Demo 1, Timișoara');
  await userEvent.click(screen.getByRole('button', { name: /run the checks/i }));
}

let writes: string[] = [];

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/verify');
  writes = [];
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
    writes.push(v);
    original.call(this, k, v);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('VerifyWizard', () => {
  it('starts with the consent screen naming all four checks', () => {
    render(<VerifyWizard />);
    expect(screen.getByRole('heading', { level: 1, name: /verify as a landlord/i })).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
  });

  it('happy path ends with the code and the exact paste line', async () => {
    arriveVerified();
    const fetchMock = mockApi({
      '/api/verify/identity': identityOk,
      '/api/verify/location': () => ({ status: 200, json: { ok: true, step: { name: 'location', ok: true, message: 'Your phone is at the address' } } }),
      '/api/verify/listings': () => ({
        status: 200,
        json: { code: 'VC-7K3Q', pasteLine: 'Proprietar verificat · ChirieSigură VC-7K3Q', accepted: [{ site: 'demo', listingId: 'd1' }], rejected: [] },
      }),
    });
    render(<VerifyWizard />);

    await fillIdentity();
    await userEvent.click(await screen.findByRole('button', { name: /i'm at the apartment/i }));
    await userEvent.click(await screen.findByRole('button', { name: /add your listings/i }));
    await userEvent.type(screen.getByLabelText(/your listing links/i), 'http://localhost:3000/demo/listing/d1');
    await userEvent.click(screen.getByRole('button', { name: /register these listings/i }));

    const plate = await screen.findByRole('region', { name: /your code/i });
    expect(within(plate).getAllByText('VC-7K3Q').length).toBeGreaterThan(0);
    const pasteLine = screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Proprietar verificat · ChirieSigură VC-7K3Q');
    expect(pasteLine).toBeTruthy();
    const identityBody = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(identityBody).toMatchObject({ consent: true, idDocument: ID_NUMBER, givenName: 'Ana' });
  });

  it('a SIM swap failure is named and no listings step is offered', async () => {
    arriveVerified();
    mockApi({
      '/api/verify/identity': () => ({
        status: 200,
        json: {
          ok: false,
          steps: [
            { name: 'number', ok: true, message: 'Phone number confirmed' },
            { name: 'kyc', ok: true, message: "ID details match this phone number's owner" },
            { name: 'simswap', ok: false, message: 'This SIM was changed in the last 7 days' },
          ],
        },
      }),
    });
    render(<VerifyWizard />);
    await fillIdentity();

    expect(await screen.findByText('This SIM was changed in the last 7 days')).toBeTruthy();
    expect(screen.getByText(/no code was issued/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /i'm at the apartment/i })).toBeNull();
    expect(screen.queryByLabelText(/your listing links/i)).toBeNull();
  });

  it('shows a listing that is already registered with its reason', async () => {
    sessionStorage.setItem(
      'cs.verify',
      JSON.stringify({ stage: 'listings', phone: '+40700000001', nvAt: Date.now(), verificationId: VID }),
    );
    mockApi({
      '/api/verify/listings': () => ({
        status: 200,
        json: { accepted: [], rejected: [{ url: 'https://www.olx.ro/d/oferta/x-IDabc12.html', reason: 'already_registered' }] },
      }),
    });
    render(<VerifyWizard />);
    await userEvent.type(screen.getByLabelText(/your listing links/i), 'https://www.olx.ro/d/oferta/x-IDabc12.html');
    await userEvent.click(screen.getByRole('button', { name: /register these listings/i }));

    expect(await screen.findByText('Already registered — contact us')).toBeTruthy();
  });

  it('adding another listing goes through the location check again', async () => {
    sessionStorage.setItem('cs.verify', JSON.stringify(DONE));
    const fetchMock = mockApi({
      '/api/verify/location': () => ({ status: 200, json: { ok: true, step: { name: 'location', ok: true, message: 'Your phone is at the address' } } }),
      '/api/verify/listings': () => ({
        status: 200,
        json: { code: 'VC-7K3Q', pasteLine: 'Proprietar verificat · ChirieSigură VC-7K3Q', accepted: [{ site: 'demo', listingId: 'd2' }], rejected: [] },
      }),
    });
    render(<VerifyWizard />);

    await userEvent.click(screen.getByRole('button', { name: /add a listing for this apartment/i }));
    expect(screen.queryByLabelText(/your listing links/i)).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: /i'm at the apartment/i }));
    await userEvent.click(await screen.findByRole('button', { name: /add your listings/i }));
    await userEvent.type(screen.getByLabelText(/your listing links/i), 'http://localhost:3000/demo/listing/d2');
    await userEvent.click(screen.getByRole('button', { name: /register these listings/i }));

    expect(await screen.findByRole('region', { name: /your code/i })).toBeTruthy();
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/verify/location', '/api/verify/listings']);
  });

  it('the done screen links each demo listing to its editor in a new tab, and no other site', () => {
    sessionStorage.setItem(
      'cs.verify',
      JSON.stringify({ ...DONE, accepted: [{ site: 'demo', listingId: 'd1' }, { site: 'olx', listingId: 'IDabc12' }] }),
    );
    render(<VerifyWizard />);

    const links = screen.getAllByRole('link', { name: 'Open the listing to add the line' });
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute('href')).toBe('/demo/listing/d1?edit=1');
    expect(links[0]!.getAttribute('target')).toBe('_blank');
    expect(within(screen.getByText('OLX').closest('li')!).queryByRole('link')).toBeNull();
  });

  it('a refused listings submission sends the landlord back to the location check', async () => {
    sessionStorage.setItem('cs.verify', JSON.stringify({ ...DONE, stage: 'listings' }));
    mockApi({ '/api/verify/listings': () => ({ status: 409, json: { error: 'location_not_verified' } }) });
    render(<VerifyWizard />);
    await userEvent.type(screen.getByLabelText(/your listing links/i), 'http://localhost:3000/demo/listing/d2');
    await userEvent.click(screen.getByRole('button', { name: /register these listings/i }));
    expect(await screen.findByRole('button', { name: /i'm at the apartment/i })).toBeTruthy();
  });

  it('never writes the ID document number to sessionStorage', async () => {
    arriveVerified();
    mockApi({ '/api/verify/identity': identityOk });
    render(<VerifyWizard />);
    await fillIdentity();
    await screen.findByRole('button', { name: /i'm at the apartment/i });

    expect(writes.length).toBeGreaterThan(0);
    expect(writes.some((w) => w.includes(ID_NUMBER))).toBe(false);
    expect(JSON.stringify(sessionStorage.getItem('cs.verify'))).not.toContain(ID_NUMBER);
  });

  it('sends the landlord back to the number step when the number session expired', async () => {
    arriveVerified();
    mockApi({ '/api/verify/identity': () => ({ status: 401, json: { error: 'not_number_verified' } }) });
    render(<VerifyWizard />);
    await fillIdentity();

    expect(await screen.findByLabelText(/your phone number/i)).toBeTruthy();
    expect(screen.getByText(/confirm it again/i)).toBeTruthy();
  });
});
