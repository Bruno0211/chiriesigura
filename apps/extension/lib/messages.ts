import type { CheckResponse } from '@cs/shared';
import type { Extracted } from './extract';

/** Content script → background: ask /api/check about what the page shows. */
export interface CheckRequest {
  type: 'check';
  extracted: Extracted;
}

/** Content script → background: this page is no longer a listing, forget its verdict. */
export interface ClearRequest {
  type: 'clear';
}

export type ExtensionMessage = CheckRequest | ClearRequest;

export type CheckReply = { ok: true; data: CheckResponse } | { ok: false };

/** What the toolbar popup reads for a tab (browser.storage.session, key `tab:<id>`). */
export interface TabState {
  extracted: Extracted;
  reply: CheckReply;
}

export const tabKey = (tabId: number) => `tab:${tabId}`;

const STATUSES = new Set(['green', 'amber', 'red_fake_code', 'red_copied', 'red_phone_mismatch', 'grey_unverified', 'grey_cannot_confirm']);

/** Trust nothing from the network that the badge would render wrongly. */
export function isCheckResponse(v: unknown): v is CheckResponse {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.status === 'string' && STATUSES.has(r.status) && typeof r.label === 'string';
}
