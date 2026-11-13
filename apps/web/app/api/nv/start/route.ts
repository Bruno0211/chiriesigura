import { randomBytes } from 'node:crypto';
import { normalizeRoPhone } from '@cs/shared';
import { network } from '@/lib/network';
import { signedCookie } from '@/lib/nv-session';

const isLocalPath = (p: string) => p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\');

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const e164 = normalizeRoPhone(q.get('phone') ?? '');
  const next = q.get('next') ?? '';
  if (!e164 || !isLocalPath(next)) return Response.json({ error: 'bad_request' }, { status: 400 });

  const state = randomBytes(16).toString('base64url');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const location = await network().numberVerificationStart(e164, `${appUrl}/api/nv/callback`, state);

  const res = new Response(null, { status: 302, headers: { Location: location } });
  res.headers.append('Set-Cookie', signedCookie('nv_state', { e164, next, state }, 10 * 60));
  return res;
}
