import { findAdapter } from '@/lib/adapters';
import { renderBadge, renderState } from '@/lib/badge-ui';
import { APP_URL } from '@/lib/config';
import { extractFromDocument, isListingPage } from '@/lib/extract';
import { loadFonts } from '@/lib/fonts';
import type { CheckReply, CheckRequest, ClearRequest } from '@/lib/messages';

/**
 * Reads the listing the student is looking at and pins the badge to it.
 * The app's own demo listings (`<WXT_APP_URL host>/demo/listing/*`) are added to `matches` in wxt.config.ts.
 */
export default defineContentScript({
  matches: ['*://*.olx.ro/*', '*://*.storia.ro/*'],
  runAt: 'document_idle',
  main(ctx) {
    let host: HTMLElement | null = null;
    let last = '';
    let timer: number | undefined;

    async function run(force = false) {
      const adapter = findAdapter(location.href, APP_URL);
      if (!adapter) return;
      const extracted = extractFromDocument(document, location.href, adapter, APP_URL);
      const key = JSON.stringify(extracted);
      if (!force && key === last) return;
      last = key;

      if (!isListingPage(extracted)) {
        if (host) void browser.runtime.sendMessage<ClearRequest>({ type: 'clear' }).catch(() => undefined);
        host?.remove();
        host = null;
        return;
      }
      if (!host?.isConnected) {
        host = document.createElement('chiriesigura-badge');
        document.documentElement.append(host);
      }
      const opts = { appUrl: APP_URL, code: extracted.code, phoneShown: extracted.phone !== null };
      renderState(host, 'checking', opts);

      let reply: CheckReply;
      try {
        reply = await browser.runtime.sendMessage<CheckRequest, CheckReply>({ type: 'check', extracted });
      } catch {
        reply = { ok: false };
      }
      if (key !== last || !host || !ctx.isValid) return; // the page changed while we asked
      if (reply?.ok) renderBadge(host, reply.data, opts);
      else renderState(host, 'unavailable', { ...opts, onRetry: () => void run(true) });
    }

    void loadFonts();
    void run();

    // Single-page navigation, a description that renders late, or a phone number revealed on click.
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = ctx.setTimeout(() => void run(), 500);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    ctx.addEventListener(window, 'wxt:locationchange', () => void run());
    ctx.onInvalidated(() => {
      observer.disconnect();
      host?.remove();
    });
  },
});
