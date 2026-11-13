import { describe, expect, it } from 'vitest';
import { GET as callback } from './callback/route';
import { GET as start } from './start/route';

const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(';')[0]!);

async function flow(phone: string, next = '/verify') {
  const s = await start(new Request(`http://localhost:3000/api/nv/start?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`));
  expect(s.status).toBe(302);
  const cb = await callback(new Request(s.headers.get('location')!, { headers: { cookie: cookiesOf(s).join('; ') } }));
  return cb;
}

describe('number verification routes (mock)', () => {
  it('lands on next with nv=ok and sets the nv cookie', async () => {
    const res = await flow('0700000001');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/verify?nv=ok');
    expect(cookiesOf(res).some((c) => c.startsWith('nv='))).toBe(true);
  });
  it('reports wifi and sets no nv cookie', async () => {
    const res = await flow('+40700000006');
    expect(res.headers.get('location')).toBe('/verify?nv=wifi');
    expect(cookiesOf(res).some((c) => c.startsWith('nv=') && c.length > 3)).toBe(false);
  });
  it('appends to an existing query string', async () => {
    const res = await flow('0700000001', '/viewing/abc?x=1');
    expect(res.headers.get('location')).toBe('/viewing/abc?x=1&nv=ok');
  });
  it('rejects external next URLs', async () => {
    for (const next of ['https://evil.com', '//evil.com']) {
      const res = await start(new Request(`http://localhost:3000/api/nv/start?phone=0700000001&next=${encodeURIComponent(next)}`));
      expect(res.status).toBe(400);
    }
  });
  it('rejects an invalid phone', async () => {
    const res = await start(new Request('http://localhost:3000/api/nv/start?phone=abc&next=/verify'));
    expect(res.status).toBe(400);
  });
  it('fails a callback whose state does not match', async () => {
    const s = await start(new Request('http://localhost:3000/api/nv/start?phone=0700000001&next=/verify'));
    const forged = s.headers.get('location')!.replace(/state=[^&]+/, 'state=forged');
    const res = await callback(new Request(forged, { headers: { cookie: cookiesOf(s).join('; ') } }));
    expect(res.headers.get('location')).toBe('/verify?nv=fail');
  });
});
