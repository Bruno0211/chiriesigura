import { REPORT_OK_TEXT, reportLine, type BadgeStatus, type CheckResponse } from '@cs/shared';
import css from './badge.css?inline';
import { icon, type IconName } from './icons';
import { qrSvg } from './qr';
import { askMessage, signInUrl, verifyUrl, viewingUrl } from './urls';

/**
 * The listing badge, drawn in the phone pages' world ("The Confirmation Screen"): an indigo frame bar,
 * a status cell that carries the only state colour, and ruled tab-headed modules in the panel below.
 */

export type BadgeMode = 'float' | 'popup';

export interface BadgeOptions {
  appUrl: string;
  /** The code read from the listing's description, if any. */
  code?: string | null;
  /** Whether a phone number was visible on the page (and so compared). */
  phoneShown?: boolean;
  /** 'float' pins a collapsible badge to the page; 'popup' fills the toolbar popup, always open. */
  mode?: BadgeMode;
}

type Tone = 'ok' | 'warn' | 'fail' | 'none';
type RowState = 'ok' | 'fail' | 'none';

const TONE: Record<BadgeStatus, Tone> = {
  green: 'ok',
  amber: 'warn',
  red_fake_code: 'fail',
  red_copied: 'fail',
  red_phone_mismatch: 'fail',
  red_banned: 'fail',
  grey_unverified: 'none',
  grey_cannot_confirm: 'none',
};
const MARK: Record<Tone, IconName> = { ok: 'check', warn: 'alert', fail: 'cross', none: 'ringDash' };
const PANEL_ID = 'cs-panel';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── DOM helpers ───────────────────────────────────────────────────────

type Child = Node | string | null | undefined | false;

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Record<string, string | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, v);
  for (const c of children) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

const day = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

// ── Shell: one shadow root per host, re-painted in place ──────────────

interface View {
  tone: Tone;
  label: string;
  busy?: boolean;
  panel: Child[];
}

function shadow(host: HTMLElement): ShadowRoot {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!root.querySelector('style')) {
    const doc = host.ownerDocument;
    root.append(el(doc, 'style', {}, css), el(doc, 'p', { class: 'sr', role: 'status' }));
  }
  return root;
}

/** "Verified landlord · near the address · 14 Nov 2026": the first part leads, the rest runs under it. */
function labelNode(doc: Document, label: string): HTMLElement {
  const [first = label, ...rest] = label.split(' · ');
  const node = el(doc, 'span', { class: 'label' }, el(doc, 'span', { class: 'lead' }, first));
  if (rest.length) {
    const more = el(doc, 'span', { class: 'rest' }, el(doc, 'span', { class: 'sep' }, ' · '));
    rest.forEach((part, i) => {
      if (i) more.append(' · ');
      more.append(/^\d/.test(part) ? el(doc, 'span', { class: 'num' }, part) : part);
    });
    node.append(more);
  }
  return node;
}

function setOpen(card: HTMLElement, head: HTMLButtonElement, panel: HTMLElement, open: boolean) {
  card.dataset.open = String(open);
  head.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
}

function paint(host: HTMLElement, view: View, opts: BadgeOptions) {
  const doc = host.ownerDocument;
  const mode = opts.mode ?? 'float';
  const root = shadow(host);
  host.dataset.mode = mode;

  const prev = root.querySelector<HTMLElement>('.cs');
  const open = mode === 'popup' || prev?.dataset.open === 'true';
  const fresh = prev?.dataset.label !== view.label;
  const hadFocus = Boolean(prev && root.activeElement && prev.querySelector('.head') === root.activeElement);

  const card = el(doc, 'section', {
    class: 'cs',
    'data-open': String(open),
    'data-label': view.label,
    'aria-label': 'ChirieSigură listing check',
  });
  const bar = el(
    doc,
    'span',
    { class: 'bar' },
    el(doc, 'span', { class: 'brand' }, 'ChirieSigură'),
    el(doc, 'span', { class: 'zone' }, 'Listing check'),
    mode === 'float' && icon(doc, 'chevron', 'chev'),
  );
  const status = el(
    doc,
    'span',
    { class: fresh ? 'status posted' : 'status', 'data-tone': view.tone },
    el(doc, 'span', { class: 'mark', 'data-tone': view.tone, 'data-busy': view.busy ? 'true' : undefined }, icon(doc, view.busy ? 'pending' : MARK[view.tone])),
    labelNode(doc, view.label),
  );
  const panel = el(doc, 'div', { class: 'panel', id: PANEL_ID }, ...view.panel);

  if (mode === 'float') {
    const head = el(doc, 'button', { type: 'button', class: 'head', 'aria-expanded': String(open), 'aria-controls': PANEL_ID }, bar, status);
    panel.hidden = !open;
    head.addEventListener('click', () => setOpen(card, head, panel, head.getAttribute('aria-expanded') !== 'true'));
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || card.dataset.open !== 'true') return;
      setOpen(card, head, panel, false);
      head.focus();
    });
    card.append(head, panel);
    prev?.replaceWith(card);
    if (!prev) root.append(card);
    if (hadFocus) head.focus();
  } else {
    card.append(el(doc, 'div', { class: 'head' }, bar, status), panel);
    prev?.replaceWith(card);
    if (!prev) root.append(card);
  }

  if (fresh) root.querySelector('.sr')!.textContent = view.label;
}

// ── Panel modules ─────────────────────────────────────────────────────

function module(doc: Document, title: string, aside: string, ...body: Child[]): HTMLElement {
  return el(
    doc,
    'section',
    { class: 'module' },
    el(doc, 'div', { class: 'tab' }, el(doc, 'h2', {}, title), el(doc, 'span', {}, aside)),
    ...body,
  );
}

interface Row {
  label: string;
  state: RowState;
  word: string;
  detail?: string | null;
  message?: string;
}

const WORD_ICON: Record<RowState, IconName> = { ok: 'check', fail: 'cross', none: 'ringDash' };

/** A confirmation record in the phone pages' grammar: one ruled, numbered line per check with its state cell. */
function record(doc: Document, title: string, aside: string, rows: Row[], foot?: Child[]): HTMLElement {
  const list = el(doc, 'ol', { class: 'rows' });
  rows.forEach((r, i) => {
    const more = (r.detail || r.message) && el(
      doc,
      'div',
      { class: 'rowMore' },
      r.detail && el(doc, 'p', { class: 'meta' }, r.detail),
      r.message && el(doc, 'p', { class: 'msg' }, r.message),
    );
    list.append(
      el(
        doc,
        'li',
        { class: 'row', 'data-row': r.state },
        el(doc, 'span', { class: 'idx' }, String(i + 1).padStart(2, '0')),
        el(doc, 'p', { class: 'what' }, r.label),
        el(doc, 'span', { class: 'state', 'data-state': r.state }, icon(doc, WORD_ICON[r.state]), r.word),
        more,
      ),
    );
  });
  return module(doc, title, aside, list, foot && el(doc, 'div', { class: 'foot' }, ...foot));
}

/** The listing's own record: the checks the badge ran on this page, in spec §6.2 order, the failed one named. */
const listingRecord = (doc: Document, rows: Row[]) => record(doc, 'This listing', 'Checked now', rows);

const CODE_FOUND = (code?: string | null): Row => ({ label: 'Code in the description', state: 'ok', word: 'Found', detail: code });
const PASSED = (label: string): Row => ({ label, state: 'ok', word: 'Passed' });
const FAILED = (label: string, message: string): Row => ({ label, state: 'fail', word: 'Failed', message });

function recordRows(status: BadgeStatus, opts: BadgeOptions): Row[] {
  const code = CODE_FOUND(opts.code);
  switch (status) {
    case 'grey_unverified':
      return [{ label: 'Code in the description', state: 'none', word: 'None', message: "The landlord hasn't verified this listing with ChirieSigură." }];
    case 'grey_cannot_confirm':
      return [code, FAILED('Listing ID readable from the link', "We couldn't read this listing's ID from its link, so we can't tell whose code this is.")];
    case 'red_fake_code':
      return [code, FAILED('Code issued by ChirieSigură', 'No landlord was ever given this code.')];
    case 'red_banned':
      return [code, PASSED('Code issued by ChirieSigură'), FAILED('Landlord in good standing', 'Our team banned this landlord after verified viewers reported them.')];
    case 'red_copied':
      return [
        code,
        PASSED('Code issued by ChirieSigură'),
        FAILED('Registered to this listing', "This code belongs to a verified landlord's other listing. Someone copied it."),
      ];
    default:
      return [
        code,
        PASSED('Code issued by ChirieSigură'),
        PASSED('Registered to this listing'),
        FAILED('Phone matches the verified one', "The number on this page isn't the one the landlord verified."),
      ];
  }
}

/**
 * What the landlord's operator confirmed when they verified: every issued code passed all four.
 * Same labels and order as the landlord's own record on the phone (apps/web flow.ts CHECK_COPY).
 */
function landlordChecks(doc: Document, res: CheckResponse, opts: BadgeOptions): HTMLElement {
  const rows = ['Phone number', 'ID matches the SIM owner', 'No recent SIM change', 'Phone near the apartment'].map(PASSED);
  const issued = [opts.code, res.verifiedAt && `verified ${day(res.verifiedAt)}`].filter(Boolean).join(' · ');
  return record(doc, "Landlord's checks", 'By their operator', rows, [
    issued && el(doc, 'span', { class: 'footLine' }, issued),
    el(doc, 'span', { class: 'footLine' }, 'via Nokia Network as Code · CAMARA'),
  ]);
}

/**
 * The report line in whole phrases ("4 verified viewings:", "3 ✓ all good", "1 didn't show up"): only the gaps between
 * them wrap. The badge's own drawn check sits beside the "all good" words, which carry the meaning.
 */
function reportText(doc: Document, line: string): Child[] {
  const at = line.indexOf(': ');
  if (at === -1) return [line];
  const phrase = (part: string) => {
    const span = el(doc, 'span', { class: 'phrase' });
    const ok = part.indexOf(REPORT_OK_TEXT);
    if (ok === -1) span.append(part);
    else span.append(part.slice(0, ok), icon(doc, 'check', 'okMark'), part.slice(ok));
    return span;
  };
  const parts = line.slice(at + 2).split(' · ');
  return [phrase(line.slice(0, at + 1)), ' ', ...parts.flatMap((p, i) => (i ? [' · ', phrase(p)] : [phrase(p)]))];
}

function reports(doc: Document, line: string, warn: boolean): HTMLElement {
  return module(
    doc,
    'Viewing reports',
    'From the address',
    el(doc, 'p', { class: warn ? 'reportLine reportWarn' : 'reportLine' }, ...reportText(doc, line)),
    el(doc, 'p', { class: 'note' }, 'Each report came from a phone its operator placed at the address.'),
  );
}

function viewingQr(doc: Document, verificationId: string, opts: BadgeOptions): HTMLElement {
  const url = viewingUrl(opts.appUrl, verificationId, opts.code ?? null);
  const qr = el(doc, 'div', { class: 'qr' });
  qr.append(qrSvg(doc, url, 'QR code: report a viewing'));
  return module(
    doc,
    'Report a viewing',
    'On your phone',
    el(
      doc,
      'div',
      { class: 'qrBody' },
      qr,
      el(
        doc,
        'div',
        { class: 'qrText' },
        el(doc, 'p', { class: 'qrLead' }, 'Went to a viewing? Scan this at the address, on mobile data.'),
        el(doc, 'p', {}, 'Your operator confirms you were there, then you pick what happened.'),
        el(doc, 'a', { class: 'link', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the report page', icon(doc, 'arrow')),
      ),
    ),
  );
}

async function copyText(text: string, line: HTMLElement): Promise<'copied' | 'selected'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Clipboard blocked by the site: select the message so Ctrl+C takes it.
    const sel = line.ownerDocument.getSelection();
    if (sel) {
      const range = line.ownerDocument.createRange();
      range.selectNodeContents(line);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return 'selected';
  }
}

function ask(doc: Document, opts: BadgeOptions): HTMLElement {
  const text = askMessage(opts.appUrl);
  const line = el(doc, 'p', { class: 'message' }, text);
  const word = el(doc, 'span', {}, 'Ask the landlord to verify');
  const button = el(doc, 'button', { type: 'button', class: 'primary' }, icon(doc, 'copy'), word);
  const hint = el(doc, 'p', { class: 'hint', 'aria-live': 'polite' }, 'Copies this message for you to send.');
  let reset: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener('click', async () => {
    const how = await copyText(text, line);
    clearTimeout(reset);
    if (how === 'copied') {
      word.textContent = 'Copied';
      hint.textContent = 'Copied. Paste it into your message to the landlord.';
      reset = setTimeout(() => {
        word.textContent = 'Ask the landlord to verify';
        hint.textContent = 'Copies this message for you to send.';
      }, 2500);
    } else {
      hint.textContent = 'Copying was blocked here, so the message is selected: press Ctrl+C.';
    }
  });
  return module(doc, 'Ask the landlord', 'Before you visit', el(doc, 'div', { class: 'askBody' }, line, button, hint));
}

function dontPay(doc: Document): HTMLElement {
  return el(doc, 'p', { class: 'alert' }, icon(doc, 'alert'), "Don't send a deposit or ID details to this advertiser.");
}

function panelFor(doc: Document, res: CheckResponse, opts: BadgeOptions): Child[] {
  const line = res.reports ? reportLine(res.reports) : null;
  switch (res.status) {
    case 'green':
    case 'amber':
      return [
        landlordChecks(doc, res, opts),
        line && reports(doc, line, res.status === 'amber'),
        res.verificationId && viewingQr(doc, res.verificationId, opts),
      ];
    case 'grey_unverified':
      return [listingRecord(doc, recordRows(res.status, opts)), ask(doc, opts)];
    case 'grey_cannot_confirm':
      return [listingRecord(doc, recordRows(res.status, opts))];
    default:
      return [listingRecord(doc, recordRows(res.status, opts)), dontPay(doc)];
  }
}

// ── Public API ────────────────────────────────────────────────────────

/** Renders (or re-renders in place) the badge for a /api/check answer into `host`'s shadow root. */
export function renderBadge(host: HTMLElement, res: CheckResponse, opts: BadgeOptions): void {
  const doc = host.ownerDocument;
  paint(host, { tone: TONE[res.status], label: res.label, panel: panelFor(doc, res, opts) }, opts);
}

/** The toolbar popup on a page that isn't a listing: where the badge works, and the way in for landlords. */
export function renderEmpty(host: HTMLElement, opts: { appUrl: string }): void {
  const doc = host.ownerDocument;
  const sites = el(doc, 'ul', { class: 'sites' });
  for (const s of ['OLX.ro listings', 'ChirieSigură demo listings']) sites.append(el(doc, 'li', {}, s));
  paint(
    host,
    {
      tone: 'none',
      label: 'No listing on this page',
      panel: [
        el(doc, 'p', { class: 'plain' }, "Open a rental listing and the badge shows whether its landlord was verified by their mobile operator."),
        module(doc, 'Where it works', 'Listing pages', sites),
        module(
          doc,
          'Renting out a flat?',
          'Landlords',
          el(
            doc,
            'div',
            { class: 'askBody' },
            el(doc, 'p', { class: 'hint' }, 'Verify once on your phone, at the apartment, on mobile data. You get a code to paste into each listing.'),
            el(doc, 'a', { class: 'primary', href: verifyUrl(opts.appUrl), target: '_blank', rel: 'noopener noreferrer' }, 'Verify as a landlord', icon(doc, 'arrow')),
          ),
        ),
      ],
    },
    { appUrl: opts.appUrl, mode: 'popup' },
  );
}

/** The moments without an answer: the request in flight, the student signed out, and the server out of reach. */
export function renderState(
  host: HTMLElement,
  state: 'checking' | 'unavailable' | 'signed_out',
  opts: BadgeOptions & { onRetry?: () => void },
): void {
  const doc = host.ownerDocument;
  if (state === 'checking') {
    paint(
      host,
      { tone: 'none', busy: true, label: 'Checking this listing…', panel: [el(doc, 'p', { class: 'plain' }, 'Asking ChirieSigură whether this landlord is verified.')] },
      opts,
    );
    return;
  }
  const retry = el(doc, 'button', { type: 'button', class: 'secondary' }, icon(doc, 'retry'), 'Try again');
  if (opts.onRetry) retry.addEventListener('click', opts.onRetry);
  if (state === 'signed_out') {
    paint(
      host,
      {
        tone: 'none',
        label: 'Sign in to check listings',
        panel: [
          el(doc, 'p', { class: 'plain' }, 'ChirieSigură checks are for signed-in students. Sign in on the website, then try again.'),
          el(doc, 'a', { class: 'primary', href: signInUrl(opts.appUrl), target: '_blank', rel: 'noopener noreferrer' }, 'Sign in', icon(doc, 'arrow')),
          retry,
        ],
      },
      opts,
    );
    return;
  }
  paint(
    host,
    {
      tone: 'none',
      label: "Couldn't check this listing",
      panel: [el(doc, 'p', { class: 'plain' }, "ChirieSigură didn't answer, so this listing has no verdict yet."), retry],
    },
    opts,
  );
}
