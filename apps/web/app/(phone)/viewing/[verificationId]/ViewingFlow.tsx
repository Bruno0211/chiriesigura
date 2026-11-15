'use client';

import {
  REPORT_CATEGORIES,
  findCode,
  reportLine,
  type CheckStep,
  type CheckStepName,
  type ReportCategory,
  type ReportCounts,
  type ReportResponse,
} from '@cs/shared';
import { CONTACT } from '@/lib/contact';
import { use, useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { browser } from 'react-dom';
import s from '../../phone.module.css';
import { ConsentScreen, type DataUse } from '../../components/ConsentScreen';
import { FrameBar } from '../../components/FrameBar';
import { NumberStep } from '../../components/NumberStep';
import { StepList } from '../../components/StepList';
import { CheckIcon } from '../../components/Icons';
import { ReportLine } from '../../components/ReportLine';
import {
  CHECK_ERROR,
  clockTime,
  loadState,
  maskPhone,
  postJson,
  readNvParam,
  saveState,
  stripNvParam,
} from '../../components/flow';
import { useStepFocus } from '../../components/hooks';

type Stage = 'consent' | 'number' | 'report' | 'done';
const STEP: Record<Stage, number> = { consent: 1, number: 2, report: 3, done: 4 };

/** Labels are verbatim from the spec (§6.3). */
/** "All good" carries a drawn check beside it (no colour emoji); the words are the radio's accessible name. */
const GOOD: { value: ReportCategory; label: string } = { value: 'ok', label: 'All good' };
const PROBLEMS: { value: ReportCategory; label: string }[] = [
  { value: 'no_show', label: "Landlord didn't show up" },
  { value: 'mismatch', label: "Apartment doesn't match photos/description" },
  { value: 'money_upfront', label: 'Asked for money before the viewing' },
  { value: 'wrong_person', label: "Person at the viewing isn't the verified landlord" },
];
const LABEL = Object.fromEntries([GOOD, ...PROBLEMS].map((c) => [c.value, c.label])) as Record<ReportCategory, string>;

const STUDENT_COPY = {
  number: { label: 'Phone number', how: 'Your operator confirms this phone owns the number.' },
  simswap: { label: 'SIM not changed recently', how: "Your operator says whether this number's SIM changed in the last 30 days. It never blocks your report." },
  location: { label: 'Phone at the viewing address', how: 'Checked when you send. Cell-level: near the address, never "inside".' },
};
const STUDENT_DATA: DataUse = {
  kept: ['Your report, its time', 'Number hash (one-way)', 'Sign-in hash (one-way)', 'Whether your SIM changed recently (yes/no)'],
  neverKept: ['Phone number', 'Phone location', 'Any free text'],
};
const TALLY_LABEL: Record<ReportCategory, string> = { ...LABEL, ok: 'All good' };
const RECORD_LABELS = { location: STUDENT_COPY.location.label };

const NUMBER_STEP: CheckStep = { name: 'number', ok: true, message: 'Phone number confirmed' };
const AT_ADDRESS: CheckStep = { name: 'location', ok: true, message: 'Your phone was at the address' };
const NOT_AT_ADDRESS: CheckStep = { name: 'location', ok: false, message: "Your phone isn't near the viewing address" };
const EXPIRED = 'Your number check expired after 15 minutes. Confirm it again, it only takes a few seconds.';

type Problem = null | 'not_at_address' | 'signed_out' | 'barred' | 'own_listing' | 'not_found' | 'error';

/** Signing in returns to this page, with the listing code from the QR link when there is one. */
const signInHref = (verificationId: string, code?: string | null) =>
  `/auth/login?returnTo=${encodeURIComponent(`/viewing/${verificationId}${code ? `?code=${code}` : ''}`)}`;

interface Saved {
  stage: Stage;
  phone?: string;
  nvAt?: number;
  times: Partial<Record<CheckStepName, string>>;
  category?: ReportCategory;
  counts?: ReportCounts;
  /** 'already' when this phone had reported this viewing before. */
  outcome?: 'sent' | 'already';
}

const EMPTY: Saved = { stage: 'consent', times: {} };

export function ViewingFlow({
  verificationId,
  signedIn,
  code,
}: {
  verificationId: string;
  signedIn: boolean;
  code?: string | null;
}) {
  use(browser('The viewing report reads the operator result and its own progress from this browser.'));

  const key = `cs.viewing.${verificationId}`;
  const [listingCode] = useState(() => findCode(code ?? new URLSearchParams(window.location.search).get('code') ?? ''));
  const [nv, setNv] = useState(readNvParam);
  const [st, setSt] = useState<Saved>(() => ({ ...EMPTY, ...loadState<Saved>(key) }));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    stripNvParam();
  }, []);
  useEffect(() => {
    saveState(key, st);
  }, [key, st]);
  useStepFocus(st.stage);

  const update = useCallback((patch: Partial<Saved>) => setSt((cur) => ({ ...cur, ...patch })), []);

  const onVerified = useCallback(() => {
    setNv(null);
    setNotice(null);
    setSt((cur) => ({ ...cur, nvAt: Date.now(), stage: 'report', times: { ...cur.times, number: clockTime() } }));
  }, []);

  const masked = st.phone ? maskPhone(st.phone) : undefined;
  const here = typeof window === 'undefined' ? '' : window.location.pathname;
  const codeLine = listingCode && (
    <p className={s.confirmed}>
      <span>Listing</span>
      <span className={s.codeInline}>{listingCode}</span>
    </p>
  );

  if (!signedIn) {
    return (
      <>
        <FrameBar zone="Viewing report" step={{ n: 1, of: 4 }} />
        <main className={s.main}>
          <h1 id="step-heading" className={s.h1}>Sign in to report a viewing</h1>
          <p className={s.lead}>Reports are for signed-in students. Sign in, and you come straight back here.</p>
          <div className={s.actionsInline}>
            <a className={s.primary} href={signInHref(verificationId, listingCode)}>Sign in</a>
          </div>
        </main>
      </>
    );
  }

  let screen;
  switch (st.stage) {
    case 'consent':
      screen = (
        <ConsentScreen
          checks={['number', 'simswap', 'location']}
          onAccept={() => update({ stage: 'number' })}
          heading="Report a viewing"
          lead="For a verified landlord's listing. You need to be at the apartment, on mobile data."
          copy={STUDENT_COPY}
          data={STUDENT_DATA}
          acceptLabel="I agree — continue"
          terminus="Your report"
        >
          {codeLine}
        </ConsentScreen>
      );
      break;
    case 'number':
      screen = (
        <NumberStep
          next={here || `/viewing/${verificationId}`}
          nvResult={nv}
          onVerified={onVerified}
          defaultPhone={st.phone}
          notice={notice ?? undefined}
          onSubmit={(e164) => {
            const next = { ...st, phone: e164 };
            saveState(key, next); // the page unloads straight after this
            setSt(next);
          }}
        />
      );
      break;
    case 'report':
      screen = (
        <ReportForm
          verificationId={verificationId}
          st={st}
          masked={masked}
          codeLine={codeLine}
          signInUrl={signInHref(verificationId, listingCode)}
          onSent={(category, counts) =>
            update({ stage: 'done', outcome: 'sent', category, counts, times: { ...st.times, location: clockTime() } })
          }
          onAlready={(category) => update({ stage: 'done', outcome: 'already', category })}
          onExpired={() => {
            setNv(null);
            setNotice(EXPIRED);
            update({ stage: 'number', nvAt: undefined });
          }}
        />
      );
      break;
    case 'done':
      screen = <DoneScreen st={st} masked={masked} />;
      break;
  }

  return (
    <>
      <FrameBar zone="Viewing report" step={{ n: STEP[st.stage], of: 4 }} sessionStartedAt={st.stage === 'report' ? st.nvAt : null} />
      <main className={s.main}>{screen}</main>
    </>
  );
}

function ReportForm({
  verificationId,
  st,
  masked,
  codeLine,
  signInUrl,
  onSent,
  onAlready,
  onExpired,
}: {
  verificationId: string;
  st: Saved;
  masked?: string;
  codeLine: ReactNode;
  signInUrl: string;
  onSent: (category: ReportCategory, counts: ReportCounts) => void;
  onAlready: (category: ReportCategory) => void;
  onExpired: () => void;
}) {
  const id = useId();
  const [category, setCategory] = useState<ReportCategory | null>(st.category ?? null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const inFlight = useRef(false); // a second tap lands before React re-renders the disabled button

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!category || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setProblem(null);
    const r = await postJson<ReportResponse>('/api/viewing/report', { consent: true, verificationId, category });
    inFlight.current = false;
    setSending(false);
    if (r.status === 200 && r.data?.counts) return onSent(category, r.data.counts);
    if (r.status === 409) return onAlready(category);
    if (r.status === 401) return r.data?.reason === 'signed_out' ? setProblem('signed_out') : onExpired();
    if (r.status === 403) {
      const reason = r.data?.reason;
      return setProblem(reason === 'barred' || reason === 'own_listing' ? reason : 'not_at_address');
    }
    if (r.status === 404) return setProblem('not_found');
    setProblem('error');
  }

  const option = (c: { value: ReportCategory; label: string }) => (
    <label key={c.value} className={s.option}>
      <input
        type="radio"
        name={`${id}-category`}
        value={c.value}
        checked={category === c.value}
        onChange={() => setCategory(c.value)}
        disabled={sending}
      />
      <span>
        {c.value === 'ok' && <CheckIcon className={s.okMark} />}
        {c.label}
      </span>
    </label>
  );

  const location: CheckStep[] = problem === 'not_at_address' ? [NOT_AT_ADDRESS] : [];

  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>How did the viewing go?</h1>
      <p className={s.lead}>Pick one. Your phone has to be at the address when you send it, no-shows included.</p>
      {codeLine}
      {masked && (
        <p className={s.confirmed}>
          <CheckIcon />
          <span>Number confirmed · {masked}{st.times.number ? ` · ${st.times.number}` : ''}</span>
        </p>
      )}

      <form onSubmit={send} noValidate>
        <fieldset className={s.options}>
          <legend className={s.srOnly}>What happened at the viewing</legend>
          <div className={s.module}>
            <div className={s.tab}>
              <span>It went fine</span>
            </div>
            {option(GOOD)}
          </div>
          <div className={s.module}>
            <div className={s.tab}>
              <span>Something went wrong</span>
              <span>Categories only</span>
            </div>
            {PROBLEMS.map(option)}
          </div>
        </fieldset>

        <StepList
          steps={[NUMBER_STEP, ...location]}
          pending={sending ? ['location'] : []}
          waiting={sending || location.length ? [] : ['location']}
          times={st.times}
          details={masked ? { number: masked } : undefined}
          labels={RECORD_LABELS}
          title="Before it is sent"
          terminus="Your report"
        />

        {problem === 'not_at_address' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>You need to be at the apartment to report</p>
            <p className={s.alertBody}>Open this page at the address, with mobile data on, then send it again.</p>
          </div>
        )}
        {problem === 'signed_out' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>Sign in to report</p>
            <p className={s.alertBody}>
              Your sign-in has ended. <a className={s.textLink} href={signInUrl}>Sign in</a> and you come
              straight back here.
            </p>
          </div>
        )}
        {problem === 'barred' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>You can&apos;t report on ChirieSigură</p>
            <p className={s.alertBody}>
              If you think this is a mistake, email <a className={s.textLink} href={'mailto:' + CONTACT}>{CONTACT}</a>.
            </p>
          </div>
        )}
        {problem === 'own_listing' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>You can&apos;t report your own listing</p>
            <p className={s.alertBody}>Reports come from students who went to the viewing.</p>
          </div>
        )}
        {problem === 'not_found' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>We can&apos;t find this verification</p>
            <p className={s.alertBody}>The QR code may be from a listing that is no longer verified.</p>
          </div>
        )}
        {problem === 'error' && (
          <div className={s.alert} role="alert">
            <p className={s.alertTitle}>Report not sent</p>
            <p className={s.alertBody}>{CHECK_ERROR}</p>
          </div>
        )}

        <div className={s.actionsInline}>
          <button
            type="submit"
            className={s.primary}
            disabled={!category || sending || problem === 'not_found'}
            aria-busy={sending || undefined}
          >
            {sending ? "Checking you're at the address…" : "I'm at the viewing — send report"}
          </button>
          {!category && !sending && <p className={s.note}>Pick what happened first.</p>}
        </div>
      </form>
    </>
  );
}

function DoneScreen({ st, masked }: { st: Saved; masked?: string }) {
  const already = st.outcome === 'already';
  const line = st.counts ? reportLine(st.counts) : null;
  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{already ? 'Already reported' : 'Report sent'}</h1>
      {already ? (
        <div className={s.alert} data-tone="warn" role="status">
          <p className={s.alertTitle}>You&apos;ve already reported this viewing</p>
          <p className={s.alertBody}>Each phone can report a viewing once, so the first report stands.</p>
        </div>
      ) : (
        <p className={s.lead}>
          {st.category === 'ok'
            ? "Your report shows on all of this landlord's listings."
            : 'Thank you. Our team checks every problem report. If it confirms a scam, the landlord is banned on all of their listings.'}
        </p>
      )}

      {!already && (
        <StepList
          steps={[NUMBER_STEP, AT_ADDRESS]}
          times={st.times}
          labels={RECORD_LABELS}
          compact
          footer={masked}
        />
      )}

      {st.category && (
        <section className={s.module} aria-labelledby="your-report">
          <div className={s.tab}>
            <h2 id="your-report">Your report</h2>
            <span>{already ? 'Not sent again' : 'Sent'}</span>
          </div>
          <p className={s.moduleBody}>
            {st.category === 'ok' && <CheckIcon className={s.okMark} />}
            {LABEL[st.category]}
          </p>
        </section>
      )}

      {st.counts && line && (
        <section className={s.module} aria-labelledby="landlord-reports">
          <div className={s.tab}>
            <h2 id="landlord-reports">This landlord so far</h2>
            <span>Verified only</span>
          </div>
          <ul className={s.list}>
            {REPORT_CATEGORIES.filter((k) => st.counts![k] > 0).map((k) => (
              <li key={k} className={s.tallyRow}>
                <span className={s.tallyNum}>{st.counts![k]}</span>
                <span>{TALLY_LABEL[k]}</span>
                {k === 'ok' ? <CheckIcon /> : <span />}
              </li>
            ))}
          </ul>
          <p className={s.footNote}>
            On the listing badge:{' '}
            <span>
              <ReportLine line={line} />
            </span>
          </p>
        </section>
      )}
    </>
  );
}
