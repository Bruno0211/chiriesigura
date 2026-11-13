import type { CheckStepName, NvResult } from '@cs/shared';

/** The order checks run in, and the order every record lists them. */
export const CHECK_ORDER: readonly CheckStepName[] = ['number', 'kyc', 'simswap', 'location'];

/** Plain-words copy for each check: the record label, and what the consent screen says it does. */
export const CHECK_COPY: Record<CheckStepName, { label: string; how: string }> = {
  number: { label: 'Phone number', how: 'Your operator confirms this phone owns the number.' },
  kyc: { label: "ID matches this SIM's owner", how: 'Your operator answers yes or no. Your ID details are never saved.' },
  simswap: { label: 'No recent SIM change', how: 'Nobody moved this number to a new SIM in the last 7 days.' },
  location: { label: 'Phone near the apartment', how: 'Cell-level: near the address, never "inside the flat".' },
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

/** Reads `?nv=` set by /api/nv/callback and removes it, so a refresh doesn't replay the result. */
export function takeNvParam(): NvResult | null {
  const url = new URL(window.location.href);
  const v = url.searchParams.get('nv');
  if (v === null) return null;
  url.searchParams.delete('nv');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  return v === 'ok' || v === 'wifi' ? v : 'fail';
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
