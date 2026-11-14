import type { CheckResponse } from '@cs/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Extracted } from './extract';
import type { CheckReply, Shown } from './messages';
import { createWatcher } from './watcher';

const APP = 'http://localhost:3000';
const NO_PHONE: Extracted = { listing: { site: 'olx', listingId: 'a1' }, code: 'VC-7K3Q', phone: null };
const WITH_PHONE: Extracted = { ...NO_PHONE, phone: '0799 999 999' };
const NOT_A_LISTING: Extracted = { listing: null, code: null, phone: null };
const GREEN: CheckResponse = { status: 'green', label: 'Verified landlord · near the address · 14 Nov 2026', verificationId: 'v1' };
const MISMATCH: CheckResponse = { status: 'red_phone_mismatch', label: "Phone number doesn't match the verified landlord" };

/** A reply the test releases when it wants, to put replies out of order. */
function later() {
  let resolve!: (r: CheckReply) => void;
  const promise = new Promise<CheckReply>((r) => (resolve = r));
  return { promise, resolve };
}

let page: Extracted;
let replies: ReturnType<typeof later>[];
let onShow: ReturnType<typeof vi.fn<(s: Shown | null) => void>>;
let ask: ReturnType<typeof vi.fn<(e: Extracted) => Promise<CheckReply>>>;
let mount: ReturnType<typeof vi.fn<() => HTMLElement>>;

const badge = () => document.querySelector('chiriesigura-badge');
const label = () => badge()?.shadowRoot?.querySelector<HTMLElement>('.cs')?.dataset.label ?? null;
const statuses = () => onShow.mock.calls.map(([s]) => (s?.reply?.ok ? s.reply.data.status : null));

function watcher(opts: { debounceMs?: number; maxWaitMs?: number } = {}) {
  return createWatcher({ appUrl: APP, read: () => page, ask, mount, onShow, ...opts });
}

beforeEach(() => {
  page = NO_PHONE;
  replies = [];
  onShow = vi.fn();
  ask = vi.fn(() => {
    const r = later();
    replies.push(r);
    return r.promise;
  });
  mount = vi.fn(() => document.body.appendChild(document.createElement('chiriesigura-badge')));
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('createWatcher', () => {
  it('never lets a slower, older reply replace a newer verdict', async () => {
    const w = watcher();
    const first = w.run();
    page = WITH_PHONE; // the student revealed the phone
    const second = w.run();
    replies[1]!.resolve({ ok: true, data: MISMATCH });
    await second;
    replies[0]!.resolve({ ok: true, data: GREEN });
    await first;

    expect(label()).toBe(MISMATCH.label);
    expect(statuses()).not.toContain('green');
    expect(statuses().at(-1)).toBe('red_phone_mismatch');
    expect(w.shown()?.reply).toEqual({ ok: true, data: MISMATCH });
  });

  it('shows nothing for a check still in flight when the page stops being a listing', async () => {
    const w = watcher();
    const first = w.run();
    page = NOT_A_LISTING;
    await w.run();
    replies[0]!.resolve({ ok: true, data: GREEN });
    await first;

    expect(badge()).toBeNull();
    expect(w.shown()).toBeNull();
    expect(onShow).toHaveBeenLastCalledWith(null);
    expect(statuses()).not.toContain('green');
  });

  it('redraws the verdict if the page removes the badge, without asking again', async () => {
    const w = watcher();
    const run = w.run();
    replies[0]!.resolve({ ok: true, data: MISMATCH });
    await run;
    badge()!.remove();

    await w.run();
    expect(label()).toBe(MISMATCH.label);
    expect(ask).toHaveBeenCalledOnce();
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it('re-checks within the max wait even on a page whose DOM never stops changing', () => {
    vi.useFakeTimers();
    const read = vi.fn(() => page);
    const w = createWatcher({ appUrl: APP, read, ask, mount, onShow, debounceMs: 500, maxWaitMs: 1500 });
    for (let t = 0; t < 1500; t += 200) {
      w.schedule();
      vi.advanceTimersByTime(200);
    }
    expect(read).toHaveBeenCalledOnce();
  });

  it('shows that it could not check, and Try again asks again', async () => {
    const w = watcher();
    const run = w.run();
    replies[0]!.resolve({ ok: false });
    await run;
    expect(label()).toBe("Couldn't check this listing");

    const root = badge()!.shadowRoot!;
    root.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Try again')!.click();
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('asks a signed-out student to sign in, not that it could not check', async () => {
    const w = watcher();
    const run = w.run();
    replies[0]!.resolve({ ok: false, reason: 'signed_out' });
    await run;
    expect(label()).toBe('Sign in to check listings');
  });

  it('checks again when a signed-out student comes back to the tab', async () => {
    const w = watcher();
    const run = w.run();
    replies[0]!.resolve({ ok: false, reason: 'signed_out' });
    await run;
    w.recheckIfSignedOut();
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('does not check again on return when the badge already has a verdict', async () => {
    const w = watcher();
    const run = w.run();
    replies[0]!.resolve({ ok: true, data: GREEN });
    await run;
    w.recheckIfSignedOut();
    expect(ask).toHaveBeenCalledOnce();
  });

  it('stays silent on pages that are not listings', async () => {
    page = NOT_A_LISTING;
    await watcher().run();
    expect(badge()).toBeNull();
    expect(onShow).not.toHaveBeenCalled();
  });
});
