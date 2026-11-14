'use client';

import { useState } from 'react';
import { reportLine } from '@cs/shared';
import type { HoldItem } from '@/lib/queries';
import s from '../phone.module.css';

type Action = 'ban' | 'dismiss';
type CardState = { kind: 'open'; confirming: boolean; error: boolean; busy: boolean } | { kind: 'done'; action: Action };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** The team's hold queue: report counts and listing links only, never who the landlord is. */
export function ReviewList({ items }: { items: HoldItem[] }) {
  if (!items.length) return <p className={s.lead}>No landlords on hold.</p>;
  return (
    <>
      {items.map((item) => <HoldCard key={item.landlordId} item={item} />)}
    </>
  );
}

function HoldCard({ item }: { item: HoldItem }) {
  const [state, setState] = useState<CardState>({ kind: 'open', confirming: false, error: false, busy: false });
  const titleId = `hold-${item.landlordId}-title`;

  async function act(action: Action) {
    setState({ kind: 'open', confirming: false, error: false, busy: true });
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ landlordId: item.landlordId, action }),
    }).catch(() => null);
    setState(res?.ok ? { kind: 'done', action } : { kind: 'open', confirming: false, error: true, busy: false });
  }

  return (
    <section className={s.module} aria-labelledby={titleId} data-testid={`hold-${item.landlordId}`}>
      <div className={s.tab}>
        <h2 id={titleId}>On hold</h2>
        <span>Last report {day(item.lastReportAt)}</span>
      </div>
      <div className={s.moduleBody}>
        <p className={s.lead}>{reportLine(item.reports)}</p>
        <ul className={s.list}>
          {item.listings.map((l) => (
            <li key={l.url}>
              <a className={s.textLink} href={l.url} target="_blank" rel="noopener noreferrer">{l.site}/{l.listingId}</a>
            </li>
          ))}
        </ul>

        {state.kind === 'done' ? (
          <p className={s.alertTitle} role="status">{state.action === 'ban' ? 'Banned' : 'Dismissed'}</p>
        ) : (
          <>
            {state.error && (
              <div className={s.alert} data-tone="fail" role="alert">
                <p className={s.alertTitle}>That didn&apos;t go through. Try again.</p>
              </div>
            )}
            {state.confirming ? (
              <>
                <p className={s.lead}>Ban this person for life? Every listing and any new verification with the same ID is blocked.</p>
                <div className={s.actionsInline}>
                  <button type="button" className={s.primary} disabled={state.busy} onClick={() => void act('ban')}>Yes, ban for life</button>
                  <button type="button" className={s.secondary} onClick={() => setState({ ...state, confirming: false })}>Cancel</button>
                </div>
              </>
            ) : (
              <div className={s.actionsInline}>
                <button type="button" className={s.primary} disabled={state.busy} onClick={() => setState({ ...state, confirming: true, error: false })}>Confirm ban</button>
                <button type="button" className={s.secondary} disabled={state.busy} onClick={() => void act('dismiss')}>Dismiss</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
