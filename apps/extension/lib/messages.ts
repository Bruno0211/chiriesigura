import type { BadgeStatus, CheckResponse } from '@cs/shared';
import type { Extracted } from './extract';

/** Content script → background: ask /api/check about what the page shows. */
export interface CheckRequest {
  type: 'check';
  extracted: Extracted;
}

/** reason 'signed_out': the student must sign in on the site; any other failure is "no verdict". */
export type CheckReply = { ok: true; data: CheckResponse } | { ok: false; reason?: 'signed_out' };

/**
 * What the page's badge shows right now (reply null: still checking). The content script owns it; the toolbar
 * and popup only mirror it, so they can never show a verdict the page has moved past. No phone number in it.
 */
export interface Shown {
  code: string | null;
  phoneShown: boolean;
  reply: CheckReply | null;
}

/** Content script → background: the badge now shows this status (null: no verdict), for the toolbar icon. */
export interface ShowRequest {
  type: 'show';
  status: BadgeStatus | null;
}

/** Popup → the tab's content script: what does your badge show? Answer: Shown | null. */
export interface StateRequest {
  type: 'state';
}

export type ExtensionMessage = CheckRequest | ShowRequest;

// A record, so adding a BadgeStatus without listing it here is a type error.
const KNOWN: Record<BadgeStatus, true> = {
  green: true, amber: true, red_fake_code: true, red_copied: true, red_phone_mismatch: true, red_banned: true, red_far_away: true,
  grey_unverified: true, grey_cannot_confirm: true,
};
const STATUSES = new Set(Object.keys(KNOWN));

/** Trust nothing from the network that the badge would render wrongly. */
export function isCheckResponse(v: unknown): v is CheckResponse {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.status === 'string' && STATUSES.has(r.status) && typeof r.label === 'string';
}
