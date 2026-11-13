import type { CheckStepName, NvResult } from '@cs/shared';

/** The order checks run in, and the order every record lists them. */
export const CHECK_ORDER: readonly CheckStepName[] = ['number', 'kyc', 'simswap', 'location'];

/** Plain-words copy for each check: the record label, and what the consent screen says it does. */
export const CHECK_COPY: Record<CheckStepName, { label: string; how: string }> = {
  number: { label: 'Phone number', how: 'Confirms this phone owns the number.' },
  kyc: { label: 'ID matches the SIM owner', how: 'A yes or no. Your ID is never saved.' },
  simswap: { label: 'No recent SIM change', how: 'No new SIM for this number in 7 days.' },
  location: { label: 'Phone near the apartment', how: 'Cell-level: near, never “inside”.' },
};

/** The Number Verification cookie lives 15 minutes (lib/nv-session.ts). */
export const SESSION_MS = 15 * 60 * 1000;

export const CHECK_ERROR = "We couldn't run this check. Please try again.";

export function maskPhone(e164: string): string {
  const ro = /^\+40(\d)\d{5}(\d{3})$/.exec(e164);
  if (ro) return `+40 ${ro[1]}•• ••• ${ro[2]}`;
  return `${e164.slice(0, 3)} ••• ${e164.slice(-3)}`;
}

export function clockTime(at: Date | number = Date.now()): string {
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** sessionStorage, tolerant of private mode and blocked storage. */
export function loadState<T>(key: string): Partial<T> | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveState(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the flow still works, it just can't survive the operator redirect */
  }
}

export function clearState(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** `?nv=` as set by /api/nv/callback; anything unexpected counts as a failure. */
export function readNvParam(): NvResult | null {
  const v = new URLSearchParams(window.location.search).get('nv');
  if (v === null) return null;
  return v === 'ok' || v === 'wifi' ? v : 'fail';
}

/** Drops `?nv=` from the address bar so a refresh doesn't replay the operator result. */
export function stripNvParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('nv')) return;
  url.searchParams.delete('nv');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function shortDate(at: number): string {
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface JsonReply<T> { status: number; data: T | null }

/** POST JSON; a network failure comes back as status 0 so callers show the retry state. */
export async function postJson<T>(url: string, body: unknown): Promise<JsonReply<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}
