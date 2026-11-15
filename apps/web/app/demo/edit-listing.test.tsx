// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditListing } from './EditListing';

const INITIAL = ['Apartament 3 camere decomandat, renovat.', 'Două băi, balcon închis, loc de parcare.'];
const LINE = 'Proprietar verificat · ChirieSigură VC-7K3Q';
const LIMITS = 'Descrierea poate avea cel mult 2000 de caractere și 20 de rânduri.';
const FAILED = 'Nu am putut salva. Încearcă din nou.';

function mockPut(answer: () => { status: number; json: unknown }) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    const { status, json } = answer();
    return { ok: status >= 200 && status < 300, status, json: async () => json } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The paragraphs the extension reads. */
const shown = () => [...screen.getByTestId('description').querySelectorAll('p')].map((p) => p.textContent);

async function openAndReplace(text: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Editează anunțul' }));
  const area = screen.getByRole('textbox', { name: 'Descriere' });
  await userEvent.clear(area);
  await userEvent.click(area);
  await userEvent.paste(text);
  return area as HTMLTextAreaElement;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/demo/listing/d4');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('EditListing', () => {
  it('shows the description one paragraph per line', () => {
    render(<EditListing listingId="d4" initial={INITIAL} />);
    expect(shown()).toEqual(INITIAL);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('opens an editor prefilled with the description', async () => {
    render(<EditListing listingId="d4" initial={INITIAL} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editează anunțul' }));
    expect((screen.getByRole('textbox', { name: 'Descriere' }) as HTMLTextAreaElement).value).toBe(INITIAL.join('\n'));
    expect(screen.getByRole('button', { name: 'Salvează' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Renunță' })).toBeTruthy();
  });

  it('saves the text and shows the lines the server kept', async () => {
    const fetchMock = mockPut(() => ({ status: 200, json: { description: ['Line one', LINE] } }));
    render(<EditListing listingId="d4" initial={INITIAL} />);
    const text = `Line one\n${LINE}`;
    await openAndReplace(text);
    await userEvent.click(screen.getByRole('button', { name: 'Salvează' }));

    expect(await screen.findByText('Anunțul a fost actualizat.')).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/demo/listings/d4/description');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ description: text });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(shown()).toEqual(['Line one', LINE]);
  });

  it('names the limits on a 400 and keeps the text', async () => {
    mockPut(() => ({ status: 400, json: { error: 'bad_request' } }));
    render(<EditListing listingId="d4" initial={INITIAL} />);
    const text = 'a'.repeat(2001);
    const area = await openAndReplace(text);
    await userEvent.click(screen.getByRole('button', { name: 'Salvează' }));

    expect(await screen.findByText(LIMITS)).toBeTruthy();
    expect(area.value).toBe(text);
    expect(screen.getByRole('textbox', { name: 'Descriere' })).toBe(area);
  });

  it('asks to try again on any other failure', async () => {
    mockPut(() => ({ status: 500, json: { error: 'boom' } }));
    render(<EditListing listingId="d4" initial={INITIAL} />);
    await openAndReplace(LINE);
    await userEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(await screen.findByText(FAILED)).toBeTruthy();

    cleanup();
    mockPut(() => {
      throw new TypeError('Failed to fetch');
    });
    render(<EditListing listingId="d4" initial={INITIAL} />);
    await openAndReplace(LINE);
    await userEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(await screen.findByText(FAILED)).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Descriere' }) as HTMLTextAreaElement).value).toBe(LINE);
  });

  it('Renunță puts the description back as it was', async () => {
    const fetchMock = mockPut(() => ({ status: 200, json: { description: [LINE] } }));
    render(<EditListing listingId="d4" initial={INITIAL} />);
    await openAndReplace(LINE);
    await userEvent.click(screen.getByRole('button', { name: 'Renunță' }));

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(shown()).toEqual(INITIAL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the editor straight away with ?edit=1', () => {
    window.history.replaceState(null, '', '/demo/listing/d4?edit=1');
    render(<EditListing listingId="d4" initial={INITIAL} />);
    expect((screen.getByRole('textbox', { name: 'Descriere' }) as HTMLTextAreaElement).value).toBe(INITIAL.join('\n'));
  });

  it('renders markup as text, never as HTML', () => {
    const { container } = render(<EditListing listingId="d4" initial={['<script>alert(1)</script>']} />);
    expect(shown()).toEqual(['<script>alert(1)</script>']);
    expect(container.querySelector('script')).toBeNull();
  });
});
