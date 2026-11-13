import './style.css';
import { renderBadge, renderEmpty, renderState } from '@/lib/badge-ui';
import { APP_URL } from '@/lib/config';
import { loadFonts } from '@/lib/fonts';
import { tabKey, type TabState } from '@/lib/messages';

/** The toolbar popup: the verdict for the listing in the active tab, open in full, or where the badge works. */
async function main() {
  const host = document.querySelector<HTMLElement>('#app')!;
  void loadFonts();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const key = tab?.id === undefined ? null : tabKey(tab.id);
  const state = key ? ((await browser.storage.session.get(key))[key] as TabState | undefined) : undefined;

  if (!state) return renderEmpty(host, { appUrl: APP_URL });
  const opts = { appUrl: APP_URL, code: state.extracted.code, phoneShown: state.extracted.phone !== null, mode: 'popup' as const };
  if (state.reply.ok) renderBadge(host, state.reply.data, opts);
  else renderState(host, 'unavailable', { ...opts, onRetry: () => tab?.id !== undefined && void browser.tabs.reload(tab.id) });
}

void main();
