import type { NvResult } from '@cs/shared';
import { network } from '@/lib/network';
import { clearCookie, issueNvCookie, readSigned } from '@/lib/nv-session';

const withNv = (next: string, r: NvResult) => `${next}${next.includes('?') ? '&' : '?'}nv=${r}`;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const st = readSigned<{ e164: string; next: string; state: string }>(req, 'nv_state');
  const next = st?.next ?? '/';

  let result: NvResult = 'fail';
  if (st && q.get('state') === st.state) {
    result = await network().numberVerificationFinish(st.e164, q.get('code') ?? '', st.state);
  }

  const res = new Response(null, { status: 302, headers: { Location: withNv(next, result) } });
  res.headers.append('Set-Cookie', clearCookie('nv_state'));
  if (result === 'ok' && st) res.headers.append('Set-Cookie', issueNvCookie(st.e164));
  return res;
}
