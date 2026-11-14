import { findAdapter } from '@/lib/adapters';
import { APP_URL } from '@/lib/config';
import { extractFromDocument } from '@/lib/extract';
import { loadFonts } from '@/lib/fonts';
import type { CheckReply, CheckRequest, ShowRequest, StateRequest } from '@/lib/messages';
import { createWatcher } from '@/lib/watcher';

/**
 * Reads the listing the student is looking at and pins the badge to it.
 * The app's own demo listings (`<WXT_APP_URL host>/demo/listing/*`) are added to `matches` in wxt.config.ts.
 */
export default defineContentScript({
  matches: ['*://*.olx.ro/*', '*://*.storia.ro/*'],
  runAt: 'document_idle',
  main(ctx) {
    const watcher = createWatcher({
      appUrl: APP_URL,
      read() {
        const adapter = findAdapter(location.href, APP_URL);
        return adapter ? extractFromDocument(document, location.href, adapter, APP_URL) : null;
      },
      async ask(extracted) {
        return browser.runtime.sendMessage<CheckRequest, CheckReply>({ type: 'check', extracted });
      },
      mount() {
        void loadFonts();
        const host = document.createElement('chiriesigura-badge');
        document.documentElement.append(host);
        return host;
      },
      onShow(shown) {
        const status = shown?.reply?.ok ? shown.reply.data.status : null;
        void browser.runtime.sendMessage<ShowRequest>({ type: 'show', status }).catch(() => undefined);
      },
    });

    // The popup asks the page what its badge shows, so the two can never disagree.
    browser.runtime.onMessage.addListener((msg: StateRequest, _sender, sendResponse) => {
      if (msg?.type !== 'state') return;
      sendResponse(watcher.shown());
    });

    void watcher.run();

    // Single-page navigation, a description that renders late, a phone revealed on click, or the page
    // re-rendering away the badge (it lives on <html>, hence the second observe).
    const observer = new MutationObserver(() => watcher.schedule());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    observer.observe(document.documentElement, { childList: true });
    // Fires before the URL commits, so read the page on the next scheduled run, not now.
    ctx.addEventListener(window, 'wxt:locationchange', () => watcher.schedule());
    // Back from signing in on the site (another tab or window): the badge updates without "Try again".
    ctx.addEventListener(document, 'visibilitychange', () => document.visibilityState === 'visible' && watcher.recheckIfSignedOut());
    ctx.addEventListener(window, 'focus', () => watcher.recheckIfSignedOut());
    ctx.onInvalidated(() => {
      observer.disconnect();
      watcher.destroy();
    });
  },
});
