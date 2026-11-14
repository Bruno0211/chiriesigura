import { renderBadge, renderState } from './badge-ui';
import { isListingPage, type Extracted } from './extract';
import type { CheckReply, Shown } from './messages';

export interface WatcherDeps {
  appUrl: string;
  /** What the page shows now; null when no adapter handles this page. */
  read(): Extracted | null;
  /** One /api/check round trip (through the background worker). */
  ask(e: Extracted): Promise<CheckReply>;
  /** Creates the badge host and attaches it to the page. */
  mount(): HTMLElement;
  /** The badge now shows this (null: no badge). The toolbar icon mirrors it. */
  onShow(shown: Shown | null): void;
  debounceMs?: number;
  maxWaitMs?: number;
}

export interface Watcher {
  /** Re-reads the page and checks it if what it shows changed (or always, with force). */
  run(force?: boolean): Promise<void>;
  /** Debounced run for DOM and URL changes, with a max wait so a busy page still gets re-checked. */
  schedule(): void;
  /** What the badge shows right now, for the popup. */
  shown(): Shown | null;
  /** Checks again if the badge is waiting for sign-in: the student may have just signed in in another tab. */
  recheckIfSignedOut(): void;
  destroy(): void;
}

/**
 * Owns the badge for one page. Only the newest check may paint: a slower reply for what the page
 * showed earlier (no phone yet, the previous listing) is dropped, so no surface ever falls back to it.
 */
export function createWatcher(d: WatcherDeps): Watcher {
  const debounceMs = d.debounceMs ?? 500;
  const maxWaitMs = d.maxWaitMs ?? 1500;
  let host: HTMLElement | null = null;
  let lastKey: string | undefined;
  let current: Shown | null = null;
  let generation = 0;
  let dead = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let maxWait: ReturnType<typeof setTimeout> | undefined;

  function paint(s: Shown) {
    if (!host?.isConnected) host = d.mount();
    const opts = { appUrl: d.appUrl, code: s.code, phoneShown: s.phoneShown };
    if (!s.reply) renderState(host, 'checking', opts);
    else if (s.reply.ok) renderBadge(host, s.reply.data, opts);
    else renderState(host, s.reply.reason === 'signed_out' ? 'signed_out' : 'unavailable', { ...opts, onRetry: () => void run(true) });
  }

  function show(s: Shown | null) {
    current = s;
    d.onShow(s);
  }

  function clearTimers() {
    clearTimeout(debounce);
    clearTimeout(maxWait);
    debounce = maxWait = undefined;
  }

  async function run(force = false) {
    if (dead) return;
    clearTimers();
    const e = d.read();
    const key = JSON.stringify(e);
    if (!force && key === lastKey) {
      // Same page content: only make sure the page hasn't dropped the badge (a re-render can).
      if (current && !host?.isConnected) paint(current);
      return;
    }
    lastKey = key;
    const mine = ++generation;

    if (!e || !isListingPage(e)) {
      host?.remove();
      host = null;
      if (current) show(null);
      return;
    }

    const checking: Shown = { code: e.code, phoneShown: e.phone !== null, reply: null };
    paint(checking);
    show(checking);
    let reply: CheckReply;
    try {
      reply = await d.ask(e);
    } catch {
      reply = { ok: false };
    }
    if (dead || mine !== generation) return; // the page moved on while we asked
    const done = { ...checking, reply };
    paint(done);
    show(done);
  }

  function fire() {
    clearTimers();
    void run();
  }

  return {
    run,
    schedule() {
      if (dead) return;
      clearTimeout(debounce);
      debounce = setTimeout(fire, debounceMs);
      maxWait ??= setTimeout(fire, maxWaitMs);
    },
    shown: () => current,
    recheckIfSignedOut() {
      if (current?.reply && !current.reply.ok && current.reply.reason === 'signed_out') void run(true);
    },
    destroy() {
      dead = true;
      clearTimers();
      host?.remove();
      host = null;
    },
  };
}
