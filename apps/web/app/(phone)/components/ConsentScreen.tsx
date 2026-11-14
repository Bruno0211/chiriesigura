'use client';

import type { CheckStepName } from '@cs/shared';
import type { ReactNode } from 'react';
import s from '../phone.module.css';
import { CHECK_COPY, CHECK_ORDER } from './flow';

export interface DataUse { kept: string[]; neverKept: string[] }

export const LANDLORD_DATA: DataUse = {
  kept: ['Check results, times', 'Number hash (one-way)', 'ID fingerprints (one-way)', 'Apartment address', 'Listing links'],
  neverKept: ['ID card number', 'Name, birthdate', 'Phone location', 'Phone number'],
};

interface Props {
  checks: CheckStepName[];
  onAccept: () => void;
  heading?: string;
  lead?: ReactNode;
  /** Per-check copy overrides, e.g. the student's location check. */
  copy?: Partial<Record<CheckStepName, { label: string; how: string }>>;
  data?: DataUse;
  acceptLabel?: string;
  /** The route's last stop: what the ride ends in. */
  terminus?: string;
  /** Context shown between the lead and the route, e.g. which listing is being reported. */
  children?: ReactNode;
}

/** Names every check before any network call runs, as the route the ride will take. Accepting is the only way forward. */
export function ConsentScreen({
  checks,
  onAccept,
  heading = 'Verify as a landlord',
  lead = 'At the apartment, on mobile data. About 3 minutes.',
  copy = {},
  data = LANDLORD_DATA,
  acceptLabel = 'I agree — start the checks',
  terminus = 'Your code',
  children,
}: Props) {
  const ordered = CHECK_ORDER.filter((c) => checks.includes(c));
  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{heading}</h1>
      <p className={s.lead}>{lead}</p>
      {children}

      <section className={s.record} aria-labelledby="consent-checks">
        <h2 id="consent-checks" className={s.srOnly}>What will be checked</h2>
        <ol className={s.route} aria-labelledby="consent-checks">
          {ordered.map((name, i) => {
            const c = copy[name] ?? CHECK_COPY[name];
            return (
              <li key={name} className={s.stop} data-state="planned" data-seg="planned">
                <span className={s.disc} aria-hidden="true" />
                <div className={s.stopHead}>
                  <p className={s.what}>{c.label}</p>
                  {i === 0 && <span className={s.word}>Next</span>}
                </div>
                <p className={s.how}>{c.how}</p>
              </li>
            );
          })}
        </ol>
        <div className={s.terminus} data-state="planned">
          <span className={s.terminusMark} aria-hidden="true" />
          <p>{terminus}</p>
        </div>
      </section>

      <section className={s.data} aria-labelledby="consent-data">
        <h2 id="consent-data" className={s.srOnly}>Your data</h2>
        <div>
          <h3>We keep</h3>
          <ul>{data.kept.map((k) => <li key={k}>{k}</li>)}</ul>
        </div>
        <div>
          <h3>Never kept</h3>
          <ul>{data.neverKept.map((k) => <li key={k}>{k}</li>)}</ul>
        </div>
      </section>
      <p className={s.via}>Checked by your operator via Nokia Network as Code</p>

      <div className={s.actionsSpacer} aria-hidden="true" />
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={onAccept}>
          {acceptLabel}
        </button>
        <a className={s.centerLink} href="/privacy">Read the privacy notice</a>
      </div>
    </>
  );
}
