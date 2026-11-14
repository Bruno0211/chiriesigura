import type { BadgeStatus } from '@cs/shared';
import { fetchCheck } from '@/lib/check';
import { APP_URL } from '@/lib/config';
import type { CheckReply, ExtensionMessage } from '@/lib/messages';
import { isSignedInPage } from '@/lib/urls';

/** The toolbar icon repeats the page's verdict, in the badge's state colours. */
const ACTION: Partial<Record<BadgeStatus, { text: string; color: string }>> = {
  green: { text: '✓', color: '#0f7a4a' },
  amber: { text: '!', color: '#8a5300' },
  red_fake_code: { text: '✕', color: '#b3261e' },
  red_copied: { text: '✕', color: '#b3261e' },
  red_phone_mismatch: { text: '✕', color: '#b3261e' },
};

async function setAction(tabId: number, status: BadgeStatus | null) {
  const a = status ? ACTION[status] : undefined;
  await Promise.all([
    browser.action.setBadgeText({ tabId, text: a?.text ?? '' }),
    a ? browser.action.setBadgeBackgroundColor({ tabId, color: a.color }) : Promise.resolve(),
  ]).catch(() => undefined);
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse: (r: CheckReply) => void) => {
    if (sender.id !== browser.runtime.id) return;
    // Only the content script decides what its page shows; this just mirrors it on the icon.
    if (msg?.type === 'show') {
      if (sender.tab?.id !== undefined) void setAction(sender.tab.id, msg.status);
      return;
    }
    if (msg?.type !== 'check') return;
    void fetchCheck(APP_URL, msg.extracted).then(sendResponse);
    return true; // answer asynchronously
  });

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    // A tab that loads another page drops the old verdict from its icon.
    if (info.status === 'loading') void setAction(tabId, null);
    // Signed in from a badge's "Sign in" tab: go back to the listing, which re-checks when it is shown again.
    // Without an opener (or without this extension) the student just stays on the signed-in page.
    if (info.url && tab.openerTabId !== undefined && isSignedInPage(APP_URL, info.url)) {
      const listingTab = tab.openerTabId;
      void browser.tabs
        .update(listingTab, { active: true })
        .then(() => browser.tabs.remove(tabId))
        .catch(() => undefined); // the listing tab was closed: stay on the signed-in page
    }
  });
});
