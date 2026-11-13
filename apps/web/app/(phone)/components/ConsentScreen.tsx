'use client';

import type { CheckStepName } from '@cs/shared';
import type { ReactNode } from 'react';
import s from '../phone.module.css';
import { CHECK_COPY, CHECK_ORDER } from './flow';
import { PendingIcon } from './Icons';

export interface DataUse { kept: string[]; neverKept: string[] }

export const LANDLORD_DATA: DataUse = {
  kept: ['Check results and times', 'A one-way hash of your number', 'The apartment address', 'Your listing links'],
  neverKept: ['Your ID number', 'Your name and birthdate', "Your phone's location", 'Your phone number itself'],
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
  /** Context shown between the lead and the record, e.g. which listing is being reported. */
  children?: ReactNode;
}

/** Names every check before any network call runs. Accepting is the only way forward. */
export function ConsentScreen({
  checks,
  onAccept,
  heading = 'Verify as a landlord',
  lead = 'Do this at the apartment, on mobile data. About 3 minutes.',
  copy = {},
  data = LANDLORD_DATA,
  acceptLabel = 'I agree — start the checks',
  children,
}: Props) {
  const ordered = CHECK_ORDER.filter((c) => checks.includes(c));
  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{heading}</h1>
      <p className={s.lead}>{lead}</p>
      {children}

      <section className={s.module} aria-labelledby="consent-checks">
        <div className={s.tab}>
          <h2 id="consent-checks">What will be checked</h2>
          <span>By your mobile operator</span>
        </div>
        <ol className={s.rows} aria-labelledby="consent-checks">
          {ordered.map((name, i) => {
            const c = copy[name] ?? CHECK_COPY[name];
            return (
              <li key={name} className={s.row}>
                <span className={s.idx}>{String(i + 1).padStart(2, '0')}</span>
                <div className={s.rowBody}>
                  <p className={s.what}>{c.label}</p>
                  <p className={s.how}>{c.how}</p>
                </div>
                <span className={s.state} data-state="waiting">
                  <PendingIcon />
                  Pending
                </span>
              </li>
            );
          })}
        </ol>
        <p className={s.foot}>via Nokia Network as Code · CAMARA</p>
      </section>

      <section className={s.module} aria-labelledby="consent-data">
        <div className={s.tab}>
          <h2 id="consent-data">Your data</h2>
          <span>GDPR · your consent</span>
        </div>
        <div className={s.split}>
          <div>
            <h3>Kept</h3>
            <ul>{data.kept.map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
          <div>
            <h3>Never kept</h3>
            <ul>{data.neverKept.map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        </div>
      </section>

      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={onAccept}>
          {acceptLabel}
        </button>
        <a className={s.centerLink} href="/privacy">Read the privacy notice</a>
      </div>
    </>
  );
}
