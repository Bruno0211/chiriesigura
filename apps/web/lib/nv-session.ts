import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => {
  const s = process.env.PHONE_PEPPER;
  if (!s) throw new Error('PHONE_PEPPER is not set');
  return s;
};
const sign = (payload: string) => createHmac('sha256', secret()).update(`cookie:${payload}`).digest('base64url');
const secure = () => ((process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https') ? '; Secure' : '');

/** Signed, expiring cookie value. The payload stays on the user's own device; nothing is stored server-side. */
export function signedCookie(name: string, data: object, maxAgeSec: number): string {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + maxAgeSec * 1000 })).toString('base64url');
  return `${name}=${payload}.${sign(payload)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure()}`;
}

export const clearCookie = (name: string) => `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure()}`;

export function readSigned<T>(req: Request, name: string): T | null {
  const raw = req.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

const NV_TTL_SEC = 15 * 60;

export const issueNvCookie = (e164: string): string => signedCookie('nv', { e164 }, NV_TTL_SEC);

export function readNv(req: Request): { e164: string } | null {
  const d = readSigned<{ e164: string }>(req, 'nv');
  return d ? { e164: d.e164 } : null;
}
