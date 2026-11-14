import type { Extracted } from './extract';
import { isCheckResponse, type CheckReply } from './messages';
import { checkUrl } from './urls';

/** One /api/check round trip. Anything other than a well-formed answer is "no verdict", never a guess. */
export async function fetchCheck(appUrl: string, e: Extracted, f: typeof fetch = fetch): Promise<CheckReply> {
  try {
    const res = await f(checkUrl(appUrl, e), { cache: 'no-store', credentials: 'include', signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ok: false };
    const data: unknown = await res.json();
    return isCheckResponse(data) ? { ok: true, data } : { ok: false };
  } catch {
    return { ok: false };
  }
}
