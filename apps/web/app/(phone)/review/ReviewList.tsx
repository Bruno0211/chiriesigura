'use client';

import { useState } from 'react';
import { REPORT_CATEGORY_TEXT, type ReviewAction, type ReviewRequest } from '@cs/shared';
import type { CaseItem, CaseStatus, WarningSign } from '@/lib/cases';
import s from '../phone.module.css';

/** The two actions that can't be undone in practice ask once before they post. */
type Confirmable = 'ban' | 'false_report';
type CardError = 'failed' | 'not_ready';
type CardState =
  | { kind: 'open'; confirming: Confirmable | null; error: CardError | null; busy: boolean }
  | { kind: 'done'; action: ReviewAction }
  | { kind: 'lost'; status: CaseStatus | null };

const SIGN_TEXT: Record<WarningSign, string> = {
  burst: 'Burst: other reports on this landlord within 2 hours',
  sim_changed: "Reporter's SIM changed in the last 30 days",
  reporter_many_landlords: 'Reporter reported 3 or more landlords in 90 days',
  reporter_dismissed_before: 'Reporter had a report dismissed before',
  reporter_barred: 'Reporter is barred for a false report',
};

const LOCATION_TEXT: Record<string, string> = {
  TRUE: "Reporter's phone was at the address",
  PARTIAL: "Reporter's phone was near the address (partial match)",
};

const ASK: Record<Confirmable, { question: string; yes: string }> = {
  ban: { question: 'Ban this person for life? Every listing and any new verification with the same ID is blocked.', yes: 'Yes, ban for life' },
  false_report: { question: "Mark this report false? The reporter can't report again for 2 years.", yes: 'Yes, mark it false' },
};

const DONE: Record<ReviewAction, string> = {
  uphold: 'Warning confirmed',
  ban: 'Banned',
  dismiss: 'Dismissed',
  false_report: 'Marked false',
};

/** How a case someone else already decided reads to the reviewer who lost the race. */
const OUTCOME: Partial<Record<CaseStatus, string>> = {
  upheld: 'Warning confirmed',
  dismissed: 'Dismissed',
  false_report: 'Marked false',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The team's queue: one card per report, with its warning signs and listing links, never who the landlord is. */
export function ReviewList({ items }: { items: CaseItem[] }) {
  if (!items.length) return <p className={s.lead}>No reports waiting.</p>;
  return (
    <>
      {items.map((item) => <CaseCard key={item.caseId} item={item} />)}
    </>
  );
}

function CaseCard({ item }: { item: CaseItem }) {
  const [state, setState] = useState<CardState>({ kind: 'open', confirming: null, error: null, busy: false });
  const titleId = `case-${item.caseId}-title`;
  const confirming = state.kind === 'open' ? state.confirming : null;

  async function act(action: ReviewAction) {
    setState({ kind: 'open', confirming: null, error: null, busy: true });
    const body: ReviewRequest = { caseId: item.caseId, action };
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) return setState({ kind: 'done', action });
    if (res?.status === 409) {
      const reply = (await res.json().catch(() => null)) as { error?: string; status?: CaseStatus } | null;
      if (reply?.error === 'already_decided') return setState({ kind: 'lost', status: reply.status ?? null });
      if (reply?.error === 'not_ready') return setState({ kind: 'open', confirming: null, error: 'not_ready', busy: false });
    }
    setState({ kind: 'open', confirming: null, error: 'failed', busy: false });
  }

  return (
    <section className={s.module} aria-labelledby={titleId} data-testid={`case-${item.caseId}`}>
      <div className={s.tab}>
        <h2 id={titleId}>{capitalise(REPORT_CATEGORY_TEXT[item.category])}</h2>
        <time dateTime={item.createdAt}>{day(item.createdAt)}</time>
      </div>
      <div className={s.moduleBody}>
        {item.signs.length > 0 && (
          <div className={s.alert} data-tone="warn">
            <p className={s.alertTitle}>Warning signs</p>
            <ul className={s.list}>
              {item.signs.map((sign) => <li key={sign} className={s.alertBody}>{SIGN_TEXT[sign]}</li>)}
            </ul>
          </div>
        )}
        <p className={s.lead}>{LOCATION_TEXT[item.locationResult] ?? `Location check: ${item.locationResult}`}</p>
        <ul className={s.list}>
          {item.listings.map((l) => (
            <li key={l.url}>
              <a className={s.textLink} href={l.url} target="_blank" rel="noopener noreferrer">{l.site}/{l.listingId}</a>
            </li>
          ))}
        </ul>

        {state.kind === 'done' ? (
          <p className={s.alertTitle} role="status">{DONE[state.action]}</p>
        ) : state.kind === 'lost' ? (
          <div className={s.alert} data-tone="warn" role="alert">
            <p className={s.alertTitle}>
              {state.status && OUTCOME[state.status]
                ? `Someone already decided this report: ${OUTCOME[state.status]}`
                : 'Someone already decided this report.'}
            </p>
          </div>
        ) : (
          <>
            {state.error && (
              <div className={s.alert} data-tone="fail" role="alert">
                <p className={s.alertTitle}>
                  {state.error === 'not_ready' ? "This report is waiting for the landlord's answer." : "That didn't go through. Try again."}
                </p>
              </div>
            )}
            {confirming ? (
              <>
                <p className={s.lead}>{ASK[confirming].question}</p>
                <div className={s.actionsInline}>
                  <button type="button" className={s.primary} disabled={state.busy} onClick={() => void act(confirming)}>
                    {ASK[confirming].yes}
                  </button>
                  <button type="button" className={s.secondary} onClick={() => setState({ ...state, confirming: null })}>Cancel</button>
                </div>
              </>
            ) : (
              <div className={s.actionsInline}>
                <button type="button" className={s.primary} disabled={state.busy} onClick={() => void act('uphold')}>Confirm warning</button>
                <button type="button" className={s.secondary} disabled={state.busy} onClick={() => setState({ ...state, confirming: 'ban', error: null })}>Ban for life</button>
                <button type="button" className={s.secondary} disabled={state.busy} onClick={() => void act('dismiss')}>Dismiss</button>
                <button type="button" className={s.secondary} disabled={state.busy} onClick={() => setState({ ...state, confirming: 'false_report', error: null })}>False report</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
