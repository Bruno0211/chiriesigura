import './style.css';
import { renderBadge, renderEmpty, renderState } from '@/lib/badge-ui';
import { APP_URL } from '@/lib/config';
import { loadFonts } from '@/lib/fonts';
import type { Shown, StateRequest } from '@/lib/messages';

/** The toolbar popup: what the active tab's badge shows, open in full, or where the badge works. */
async function main() {
  const host = document.querySelector<HTMLElement>('#app')!;
  void loadFonts();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  // Ask the page itself; while it is still checking, ask again for a few seconds.
  for (let attempt = 0; attempt < 20; attempt++) {
    let shown: Shown | null = null;
    try {
      if (tab?.id !== undefined) shown = await browser.tabs.sendMessage<StateRequest, Shown | null>(tab.id, { type: 'state' });
    } catch {
      // No content script on this page.
    }
    if (!shown) return renderEmpty(host, { appUrl: APP_URL });

    const opts = { appUrl: APP_URL, code: shown.code, phoneShown: shown.phoneShown, mode: 'popup' as const };
    if (!shown.reply) renderState(host, 'checking', opts);
    else if (shown.reply.ok) return renderBadge(host, shown.reply.data, opts);
    else return renderState(host, shown.reply.reason === 'signed_out' ? 'signed_out' : 'unavailable', { ...opts, onRetry: () => tab?.id !== undefined && void browser.tabs.reload(tab.id) });
    await new Promise((r) => setTimeout(r, 300));
  }
}

void main();
