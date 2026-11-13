import { randomBytes } from 'node:crypto';
import { normalizeRoPhone } from '@cs/shared';
import { network } from '@/lib/network';
import { nvCallbackUrl, signedCookie } from '@/lib/nv-session';

/** Same-origin path + query only. Whitespace, control chars and backslashes are rejected because browsers strip/convert them into `//host`. */
function safeNext(raw: string): string | null {
  if (!raw.startsWith('/') || /[\u0000-\u001f\s\\]/.test(raw)) return null;
  const u = new URL(raw, 'http://local.invalid');
  return u.origin === 'http://local.invalid' ? u.pathname + u.search : null;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const e164 = normalizeRoPhone(q.get('phone') ?? '');
  const next = safeNext(q.get('next') ?? '');
  if (!e164 || !next) return Response.json({ error: 'bad_request' }, { status: 400 });

  const state = randomBytes(16).toString('base64url');
  const location = await network().numberVerificationStart(e164, nvCallbackUrl(req), state);

  const res = new Response(null, { status: 302, headers: { Location: location } });
  res.headers.append('Set-Cookie', signedCookie('nv_state', { e164, next, state }, 10 * 60));
  return res;
}
