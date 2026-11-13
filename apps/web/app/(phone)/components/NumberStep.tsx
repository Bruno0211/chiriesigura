'use client';

import { normalizeRoPhone, type NvResult } from '@cs/shared';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import s from '../phone.module.css';

const NV_ERRORS = {
  wifi: {
    title: 'Switch to mobile data and try again',
    body: 'Your operator can only confirm the number over mobile data. Turn Wi-Fi off, keep mobile data on, then confirm again.',
  },
  fail: {
    title: "We couldn't confirm this phone number",
    body: 'Use the number of the SIM in this phone, then try again.',
  },
} as const;

interface Props {
  /** Path the operator check returns to, e.g. "/verify". */
  next: string;
  /** `?nv=` from the operator callback, or null before the first attempt. */
  nvResult: NvResult | null;
  onVerified: () => void;
  defaultPhone?: string;
  /** Called with the E.164 number just before leaving for the operator check. */
  onSubmit?: (e164: string) => void;
  navigate?: (url: string) => void;
  heading?: string;
  lead?: string;
  /** A one-line status above the form, e.g. why the number has to be confirmed again. */
  notice?: string;
}

/** Number Verification: a full navigation to the operator and back with `?nv=ok|fail|wifi`. */
export function NumberStep({
  next,
  nvResult,
  onVerified,
  defaultPhone = '',
  onSubmit,
  navigate = (url) => window.location.assign(url),
  heading = 'Confirm your number',
  lead = 'Your operator checks that this phone owns the number. No SMS code, nothing to type back.',
  notice,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [invalid, setInvalid] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const verified = useRef(false);
  const id = useId();

  useEffect(() => {
    if (nvResult === 'ok' && !verified.current) {
      verified.current = true;
      onVerified();
    }
  }, [nvResult, onVerified]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const e164 = normalizeRoPhone(phone);
    if (!e164) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setLeaving(true);
    onSubmit?.(e164);
    navigate(`/api/nv/start?phone=${encodeURIComponent(e164)}&next=${encodeURIComponent(next)}`);
  }

  const error = nvResult === 'wifi' || nvResult === 'fail' ? NV_ERRORS[nvResult] : null;

  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{heading}</h1>
      <p className={s.lead}>{lead}</p>
      {notice && <p className={s.notice} role="status">{notice}</p>}
      {error && !leaving && (
        <div className={s.alert} data-tone={nvResult === 'wifi' ? 'warn' : 'fail'} role="alert">
          <p className={s.alertTitle}>{error.title}</p>
          <p className={s.alertBody}>{error.body}</p>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <section className={s.module} aria-labelledby={`${id}-title`}>
          <div className={s.tab}>
            <h2 id={`${id}-title`}>Your number</h2>
            <span>Kept as a one-way hash</span>
          </div>
          <div className={s.fields}>
            <div className={s.field}>
              <label htmlFor={id} className={s.label}>Your phone number</label>
              <input
                id={id}
                className={`${s.input} ${s.inputMono}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={invalid || undefined}
                aria-describedby={`${id}-hint`}
              />
              {invalid ? (
                <p id={`${id}-hint`} className={s.fieldError} role="alert">
                  Enter a Romanian mobile number, like 0722 123 456
                </p>
              ) : (
                <p id={`${id}-hint`} className={s.note}>The number of the SIM in this phone.</p>
              )}
            </div>
          </div>
        </section>
        <div className={s.actionsInline}>
          <button type="submit" className={s.primary} disabled={leaving} aria-busy={leaving || undefined}>
            {leaving ? "Opening your operator's check…" : 'Confirm my number'}
          </button>
        </div>
      </form>
    </>
  );
}
