import type { BadgeStatus } from '@cs/shared';
import { fetchCheck } from '@/lib/check';
import { APP_URL } from '@/lib/config';
import { tabKey, type CheckReply, type ExtensionMessage, type TabState } from '@/lib/messages';

/** The toolbar icon repeats the verdict, in the badge's state colours. */
const ACTION: Partial<Record<BadgeStatus, { text: string; color: string }>> = {
  green: { text: '✓', color: '#0f7a4a' },
  amber: { text: '!', color: '#8a5300' },
  red_fake_code: { text: '✕', color: '#b3261e' },
  red_copied: { text: '✕', color: '#b3261e' },
  red_phone_mismatch: { text: '✕', color: '#b3261e' },
};

async function forget(tabId: number) {
  await Promise.all([browser.storage.session.remove(tabKey(tabId)), browser.action.setBadgeText({ tabId, text: '' })]).catch(
    () => undefined,
  );
}

async function remember(tabId: number, state: TabState) {
  const a = state.reply.ok ? ACTION[state.reply.data.status] : undefined;
  await Promise.all([
    browser.storage.session.set({ [tabKey(tabId)]: state }),
    browser.action.setBadgeText({ tabId, text: a?.text ?? '' }),
    a ? browser.action.setBadgeBackgroundColor({ tabId, color: a.color }) : Promise.resolve(),
  ]).catch(() => undefined);
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse: (r: CheckReply) => void) => {
    if (sender.id !== browser.runtime.id) return;
    if (msg?.type === 'clear' && sender.tab?.id !== undefined) void forget(sender.tab.id);
    if (msg?.type !== 'check') return;
    void fetchCheck(APP_URL, msg.extracted).then((reply) => {
      sendResponse(reply);
      if (sender.tab?.id !== undefined) void remember(sender.tab.id, { extracted: msg.extracted, reply });
    });
    return true; // answer asynchronously
  });

  // A tab that loads another page must not keep the old verdict in the popup.
  browser.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') void forget(tabId);
  });
  browser.tabs.onRemoved.addListener((tabId) => void browser.storage.session.remove(tabKey(tabId)));
});
