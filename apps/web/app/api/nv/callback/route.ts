import type { NvResult } from '@cs/shared';
import { network } from '@/lib/network';
import { clearCookie, issueNvCookie, nvCallbackUrl, readSigned } from '@/lib/nv-session';

const withNv = (next: string, r: NvResult) => `${next}${next.includes('?') ? '&' : '?'}nv=${r}`;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const st = readSigned<{ e164: string; next: string; state: string }>(req, 'nv_state');
  const next = st?.next ?? '/';

  let result: NvResult = 'fail';
  // An `error` (e.g. access_denied) means the person declined; only a missing code without one is treated as Wi-Fi.
  if (st && q.get('state') === st.state && !q.has('error')) {
    result = await network().numberVerificationFinish(st.e164, q.get('code') ?? '', st.state, nvCallbackUrl(req));
  }

  const res = new Response(null, { status: 302, headers: { Location: withNv(next, result) } });
  res.headers.append('Set-Cookie', clearCookie('nv_state'));
  if (result === 'ok' && st) res.headers.append('Set-Cookie', issueNvCookie(st.e164));
  return res;
}
