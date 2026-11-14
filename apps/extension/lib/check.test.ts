import { describe, expect, it, vi } from 'vitest';
import { fetchCheck } from './check';

const EX = { listing: { site: 'demo' as const, listingId: 'd1' }, code: 'VC-7K3Q', phone: null };
const GREEN = { status: 'green', label: 'Verified landlord · near the address · 14 Nov 2026', verificationId: 'v1' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchCheck', () => {
  it('asks /api/check on the app and returns its answer', async () => {
    const f = vi.fn().mockResolvedValue(json(GREEN));
    await expect(fetchCheck('https://cs.example', EX, f)).resolves.toEqual({ ok: true, data: GREEN });
    expect(f.mock.calls[0]![0]).toBe('https://cs.example/api/check?site=demo&listingId=d1&code=VC-7K3Q');
    expect(f.mock.calls[0]![1]).toMatchObject({ credentials: 'include' });
  });

  it('fails closed on a server error, so no verdict is shown', async () => {
    const f = vi.fn().mockResolvedValue(json({ error: 'boom' }, 500));
    await expect(fetchCheck('https://cs.example', EX, f)).resolves.toEqual({ ok: false });
  });

  it('fails closed when the network is down', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchCheck('https://cs.example', EX, f)).resolves.toEqual({ ok: false });
  });

  it('fails closed on a body that is not a badge answer', async () => {
    const f = vi.fn().mockResolvedValue(new Response('<html>Vercel error</html>', { status: 200 }));
    await expect(fetchCheck('https://cs.example', EX, f)).resolves.toEqual({ ok: false });
  });
});
