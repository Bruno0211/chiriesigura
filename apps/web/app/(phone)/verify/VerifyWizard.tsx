'use client';

import type {
  CheckStep,
  CheckStepName,
  IdentityResponse,
  ListingRef,
  ListingsResponse,
  LocationResponse,
} from '@cs/shared';
import { use, useCallback, useEffect, useId, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { browser } from 'react-dom';
import s from '../phone.module.css';
import { ConsentScreen } from '../components/ConsentScreen';
import { FrameBar } from '../components/FrameBar';
import { NumberStep } from '../components/NumberStep';
import { StepList } from '../components/StepList';
import { ArrowIcon, CheckIcon } from '../components/Icons';
import {
  CHECK_COPY,
  CHECK_ERROR,
  clearState,
  clockTime,
  loadState,
  maskPhone,
  postJson,
  readNvParam,
  saveState,
  shortDate,
  stripNvParam,
} from '../components/flow';
import { useStepFocus } from '../components/hooks';
import { CodePlate } from './CodePlate';

const KEY = 'cs.verify';

type Stage = 'consent' | 'number' | 'identity' | 'checks' | 'listings' | 'done';
const STEP: Record<Stage, number> = { consent: 1, number: 2, identity: 3, checks: 4, listings: 5, done: 6 };
type Busy = null | 'identity' | 'location' | 'listings';
type Rejected = ListingsResponse['rejected'][number];

/** Everything that survives the operator redirect. The ID document number is deliberately not here. */
interface Saved {
  stage: Stage;
  /** Where to return after the number is confirmed again. */
  resume?: Stage;
  phone?: string;
  nvAt?: number;
  givenName: string;
  familyName: string;
  birthdate: string;
  address: string;
  verificationId?: string;
  steps: CheckStep[];
  location?: CheckStep;
  times: Partial<Record<CheckStepName, string>>;
  code?: string;
  pasteLine?: string;
  issuedAt?: number;
  accepted: ListingRef[];
  rejected: Rejected[];
}

const EMPTY: Saved = {
  stage: 'consent',
  givenName: '',
  familyName: '',
  birthdate: '',
  address: '',
  steps: [],
  times: {},
  accepted: [],
  rejected: [],
};

const NUMBER_STEP: CheckStep = { name: 'number', ok: true, message: 'Phone number confirmed' };
const EXPIRED = 'Your number check expired after 15 minutes. Confirm it again, it only takes a few seconds.';
const GONE = "We can't find this verification any more. Start over to verify again.";
const REJECT_TEXT: Record<Rejected['reason'], string> = {
  unparseable: "We can't read this link — paste the listing's full address",
  already_registered: 'Already registered — contact us',
  far_from_address: "This listing isn't near the address you verified. Verify at that apartment to register it.",
};
const SITE_NAME: Record<ListingRef['site'], string> = { olx: 'OLX', storia: 'Storia', imobiliare: 'imobiliare.ro', demo: 'Demo listing' };

const listingKey = (r: ListingRef) => `${r.site}:${r.listingId}`;

export function VerifyWizard() {
  use(browser('The verification wizard reads the operator result and its own progress from this browser.'));

  // The operator result is consumed once; a later trip back to the number step must not replay it.
  const [nv, setNv] = useState(readNvParam);
  const [st, setSt] = useState<Saved>(() => ({ ...EMPTY, ...loadState<Saved>(KEY) }));
  const [idDocument, setIdDocument] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    stripNvParam();
  }, []);
  useEffect(() => {
    saveState(KEY, st);
  }, [st]);
  useStepFocus(st.stage);

  const update = useCallback((patch: Partial<Saved>) => setSt((cur) => ({ ...cur, ...patch })), []);
  const go = (stage: Stage, patch: Partial<Saved> = {}) => {
    setError(null);
    update({ ...patch, stage });
  };
  const expired = (resume: Stage) => {
    setNv(null);
    setNotice(EXPIRED);
    go('number', { resume, nvAt: undefined });
  };
  const startOver = () => {
    clearState(KEY);
    setIdDocument('');
    setError(null);
    setNotice(null);
    setSt(EMPTY);
  };

  /** Each listings submission needs its own location pass, so going back to listings starts at "I'm at the apartment". */
  const recheckLocation = (): Partial<Saved> => ({ location: undefined, times: { ...st.times, location: undefined } });

  const onVerified = useCallback(() => {
    setNv(null);
    setNotice(null);
    setSt((cur) => ({
      ...cur,
      nvAt: Date.now(),
      stage: cur.resume ?? 'identity',
      resume: undefined,
      times: { ...cur.times, number: clockTime() },
    }));
  }, []);

  async function runChecks() {
    setBusy('identity');
    go('checks', { steps: [], location: undefined, verificationId: undefined });
    const r = await postJson<IdentityResponse>('/api/verify/identity', {
      consent: true,
      givenName: st.givenName.trim(),
      familyName: st.familyName.trim(),
      birthdate: st.birthdate,
      idDocument: idDocument.trim(),
      address: st.address.trim(),
    });
    setBusy(null);
    if (r.status === 401) return expired('identity');
    if (r.status !== 200 || !r.data) return setError(CHECK_ERROR);
    const at = clockTime();
    const times = { ...st.times };
    for (const step of r.data.steps) if (step.name !== 'number') times[step.name] = at;
    if (r.data.ok) setIdDocument(''); // passed through; nothing to keep it for
    update({ steps: r.data.steps, verificationId: r.data.verificationId, times });
  }

  async function checkLocation() {
    if (!st.verificationId) return;
    setBusy('location');
    setError(null);
    const r = await postJson<LocationResponse>('/api/verify/location', { verificationId: st.verificationId });
    setBusy(null);
    if (r.status === 401) return expired('checks');
    if (r.status === 404) return setError(GONE);
    if (r.status !== 200 || !r.data) return setError(CHECK_ERROR);
    update({ location: r.data.step, times: { ...st.times, location: clockTime() } });
  }

  async function registerListings(urls: string[]) {
    setBusy('listings');
    setError(null);
    const r = await postJson<ListingsResponse>('/api/verify/listings', { verificationId: st.verificationId, urls });
    setBusy(null);
    if (r.status === 401) return expired('listings');
    if (r.status === 404) return setError(GONE);
    if (r.status === 409) return go('checks', recheckLocation()); // the location pass expired or was used
    if (r.status !== 200 || !r.data) return setError(CHECK_ERROR);
    const seen = new Set(st.accepted.map(listingKey));
    const accepted = [...st.accepted, ...r.data.accepted.filter((a) => !seen.has(listingKey(a)))];
    if (r.data.code && r.data.pasteLine) {
      go('done', { code: r.data.code, pasteLine: r.data.pasteLine, issuedAt: st.issuedAt ?? Date.now(), accepted, rejected: r.data.rejected });
    } else {
      update({ accepted, rejected: r.data.rejected });
    }
  }

  const masked = st.phone ? maskPhone(st.phone) : undefined;
  const sessionShown = st.stage === 'identity' || st.stage === 'checks' || st.stage === 'listings';

  let screen;
  switch (st.stage) {
    case 'consent':
      screen = <ConsentScreen checks={['number', 'kyc', 'simswap', 'location']} onAccept={() => go('number')} />;
      break;
    case 'number':
      screen = (
        <NumberStep
          next="/verify"
          nvResult={nv}
          onVerified={onVerified}
          defaultPhone={st.phone}
          notice={notice ?? undefined}
          onSubmit={(e164) => {
            const next = { ...st, phone: e164 };
            saveState(KEY, next); // the page unloads straight after this
            setSt(next);
          }}
        />
      );
      break;
    case 'identity':
      screen = (
        <IdentityForm
          st={st}
          masked={masked}
          idDocument={idDocument}
          onIdDocument={setIdDocument}
          onChange={update}
          onSubmit={runChecks}
        />
      );
      break;
    case 'checks':
      screen = (
        <ChecksScreen
          st={st}
          masked={masked}
          busy={busy}
          error={error}
          canRetry={Boolean(idDocument)}
          onRetry={runChecks}
          onLocation={checkLocation}
          onContinue={() => go('listings', { rejected: [] })}
          onEdit={() => go('identity', { steps: [] })}
          onStartOver={startOver}
        />
      );
      break;
    case 'listings':
      screen = <ListingsForm st={st} busy={busy === 'listings'} error={error} onSubmit={registerListings} onStartOver={startOver} />;
      break;
    case 'done':
      screen = (
        <DoneScreen
          st={st}
          masked={masked}
          onAddMore={() => go('checks', { ...recheckLocation(), rejected: [] })}
          onStartOver={startOver}
        />
      );
      break;
  }

  return (
    <>
      <FrameBar step={{ n: STEP[st.stage], of: 6 }} sessionStartedAt={sessionShown ? st.nvAt : null} />
      <main className={s.main}>{screen}</main>
    </>
  );
}

/* ── Step 3: identity ─────────────────────────────────────────────── */

function IdentityForm({
  st,
  masked,
  idDocument,
  onIdDocument,
  onChange,
  onSubmit,
}: {
  st: Saved;
  masked?: string;
  idDocument: string;
  onIdDocument: (v: string) => void;
  onChange: (patch: Partial<Saved>) => void;
  onSubmit: () => void;
}) {
  const id = useId();
  const [showErrors, setShowErrors] = useState(false);
  const values = { givenName: st.givenName, familyName: st.familyName, birthdate: st.birthdate, idDocument, address: st.address };
  const missing = (k: keyof typeof values) => showErrors && !values[k].trim();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const firstEmpty = (Object.keys(values) as (keyof typeof values)[]).find((k) => !values[k].trim());
    if (firstEmpty) {
      setShowErrors(true);
      document.getElementById(`${id}-${firstEmpty}`)?.focus();
      return;
    }
    onSubmit();
  }

  const field = (
    k: keyof typeof values,
    label: string,
    input: InputHTMLAttributes<HTMLInputElement>,
    note?: string,
  ) => (
    <div className={s.field}>
      <label htmlFor={`${id}-${k}`} className={s.label}>{label}</label>
      <input
        id={`${id}-${k}`}
        className={s.input}
        value={values[k]}
        onChange={(e) => (k === 'idDocument' ? onIdDocument(e.target.value) : onChange({ [k]: e.target.value }))}
        aria-invalid={missing(k) || undefined}
        aria-describedby={note || missing(k) ? `${id}-${k}-note` : undefined}
        {...input}
      />
      {missing(k) ? (
        <p id={`${id}-${k}-note`} className={s.fieldError}>Fill this in to continue.</p>
      ) : (
        note && <p id={`${id}-${k}-note`} className={s.note}>{note}</p>
      )}
    </div>
  );

  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>Your ID and the apartment</h1>
      <p className={s.lead}>Your operator compares these with the owner of this SIM. It answers yes or no.</p>
      {masked && (
        <p className={s.confirmed}>
          <CheckIcon />
          <span>Number confirmed · {masked}{st.times.number ? ` · ${st.times.number}` : ''}</span>
        </p>
      )}

      <form onSubmit={submit} noValidate>
        <section className={s.module} aria-labelledby={`${id}-idt`}>
          <div className={s.tab}>
            <h2 id={`${id}-idt`}>Your ID card</h2>
            <span>To operator · not saved</span>
          </div>
          <div className={s.fields}>
            {field('givenName', 'Given name', { autoComplete: 'given-name', autoCapitalize: 'words', spellCheck: false }, 'Exactly as on your ID card.')}
            {field('familyName', 'Family name', { autoComplete: 'family-name', autoCapitalize: 'words', spellCheck: false })}
            {field('birthdate', 'Date of birth', { type: 'date', autoComplete: 'bday', max: new Date().toISOString().slice(0, 10) })}
            {field(
              'idDocument',
              'ID card series and number',
              { autoComplete: 'off', autoCapitalize: 'characters', spellCheck: false, className: `${s.input} ${s.inputMono}` },
              'For example TM 123456. Sent once, then forgotten.',
            )}
          </div>
        </section>

        <section className={s.module} aria-labelledby={`${id}-apt`}>
          <div className={s.tab}>
            <h2 id={`${id}-apt`}>The apartment</h2>
            <span>Kept · location check</span>
          </div>
          <div className={s.fields}>
            {field(
              'address',
              'Apartment address',
              { autoComplete: 'street-address' },
              'Street, number, block, flat and city, as in your listing.',
            )}
          </div>
        </section>

        <div className={s.actionsInline}>
          <button type="submit" className={s.primary}>Run the checks</button>
        </div>
      </form>
    </>
  );
}

/* ── Step 4: the record, then the location check ──────────────────── */

function ChecksScreen({
  st,
  masked,
  busy,
  error,
  canRetry,
  onRetry,
  onLocation,
  onContinue,
  onEdit,
  onStartOver,
}: {
  st: Saved;
  masked?: string;
  busy: Busy;
  error: string | null;
  canRetry: boolean;
  onRetry: () => void;
  onLocation: () => void;
  onContinue: () => void;
  onEdit: () => void;
  onStartOver: () => void;
}) {
  const waitingForIdentity = st.steps.length === 0;
  const identityFailed = !waitingForIdentity && !st.verificationId;
  const failed = st.steps.filter((x) => !x.ok);
  const addressNotFound = failed.some((x) => x.name === 'location');
  const steps = waitingForIdentity ? [NUMBER_STEP] : [...st.steps, ...(st.location ? [st.location] : [])];
  const located = st.location?.ok === true;

  const pending: CheckStepName[] = [];
  const waiting: CheckStepName[] = [];
  if (waitingForIdentity) {
    if (busy === 'identity') pending.push('kyc', 'simswap');
    else waiting.push('kyc', 'simswap');
    waiting.push('location');
  } else if (!identityFailed && !located) {
    (busy === 'location' ? pending : waiting).push('location');
  }

  const heading = identityFailed
    ? "We couldn't verify you"
    : located
      ? 'All four checks passed'
      : waitingForIdentity
        ? 'Running the checks'
        : 'Now, at the apartment';

  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{heading}</h1>
      <p className={s.lead}>
        {identityFailed
          ? 'Nothing you typed was saved.'
          : located
            ? 'Last step: tell us which listings are yours.'
            : waitingForIdentity
              ? 'Your operator is answering. This takes a few seconds.'
              : 'Stand at the apartment with mobile data on, then tap the button.'}
      </p>

      <StepList
        steps={steps}
        pending={pending}
        waiting={waiting}
        times={st.times}
        details={masked ? { number: masked } : undefined}
        footer="via Nokia Network as Code · CAMARA"
      />

      {error && (
        <div className={s.alert} role="alert">
          <p className={s.alertTitle}>{error === GONE ? 'Verification not found' : 'Check interrupted'}</p>
          <p className={s.alertBody}>{error}</p>
        </div>
      )}

      {identityFailed && (
        <div className={s.alert} role="alert">
          <p className={s.alertTitle}>No code was issued</p>
          <p className={s.alertBody}>
            {failed.map((f) => CHECK_COPY[f.name].label).join(', ')} didn&apos;t pass.
          </p>
        </div>
      )}

      <div className={s.actionsInline}>
        {error === GONE ? (
          <button type="button" className={s.primary} onClick={onStartOver}>Start over</button>
        ) : waitingForIdentity && busy !== 'identity' ? (
          // Interrupted, or reloaded mid-check (the ID number is gone with the page).
          canRetry && error ? (
            <button type="button" className={s.primary} onClick={onRetry}>Try the checks again</button>
          ) : (
            <button type="button" className={s.primary} onClick={onEdit}>Back to your details</button>
          )
        ) : identityFailed ? (
          <>
            <button type="button" className={s.primary} onClick={onEdit}>
              {addressNotFound ? 'Edit the address' : 'Check my details again'}
            </button>
            <button type="button" className={`${s.textLink} ${s.textButton}`} onClick={onStartOver}>Start over</button>
          </>
        ) : located ? (
          <button type="button" className={s.primary} onClick={onContinue}>
            Add your listings <ArrowIcon />
          </button>
        ) : !waitingForIdentity ? (
          <>
            <p className={s.note}>
              Your operator confirms the phone is near the address. It is cell-level, so it never says you are inside.
            </p>
            <button
              type="button"
              className={s.primary}
              onClick={onLocation}
              disabled={busy === 'location'}
              aria-busy={busy === 'location' || undefined}
            >
              {busy === 'location' ? 'Checking where your phone is…' : "I'm at the apartment"}
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ── Step 5: listings ─────────────────────────────────────────────── */

function ListingsForm({
  st,
  busy,
  error,
  onSubmit,
  onStartOver,
}: {
  st: Saved;
  busy: boolean;
  error: string | null;
  onSubmit: (urls: string[]) => void;
  onStartOver: () => void;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [empty, setEmpty] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const urls = text.split(/\s+/).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    onSubmit(urls);
  }

  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>{st.accepted.length ? 'Add more listings' : 'Your listings'}</h1>
      <p className={s.lead}>Paste the link of every listing for this apartment. They all get the same code.</p>

      {error && (
        <div className={s.alert} role="alert">
          <p className={s.alertTitle}>{error === GONE ? 'Verification not found' : 'Check interrupted'}</p>
          <p className={s.alertBody}>{error}</p>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <section className={s.module} aria-labelledby={`${id}-t`}>
          <div className={s.tab}>
            <h2 id={`${id}-t`}>Listing links</h2>
            <span>Kept · one code for all</span>
          </div>
          <div className={s.fields}>
            <div className={s.field}>
              <label htmlFor={id} className={s.label}>Your listing links</label>
              <textarea
                id={id}
                className={s.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://www.olx.ro/d/oferta/…"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                aria-invalid={empty || undefined}
                aria-describedby={`${id}-note`}
              />
              {empty ? (
                <p id={`${id}-note`} className={s.fieldError} role="alert">Paste at least one listing link.</p>
              ) : (
                <p id={`${id}-note`} className={s.note}>One link per line. OLX, Storia or imobiliare.ro.</p>
              )}
            </div>
          </div>
        </section>

        {st.rejected.length > 0 && <RejectedList rejected={st.rejected} />}

        <div className={s.actionsInline}>
          <button type="submit" className={s.primary} disabled={busy} aria-busy={busy || undefined}>
            {busy ? 'Registering…' : 'Register these listings'}
          </button>
          {error === GONE && (
            <button type="button" className={`${s.textLink} ${s.textButton}`} onClick={onStartOver}>Start over</button>
          )}
        </div>
      </form>
    </>
  );
}

function RejectedList({ rejected }: { rejected: Rejected[] }) {
  return (
    <section className={s.module} aria-labelledby="rejected-title">
      <div className={s.tab}>
        <h2 id="rejected-title">Not registered</h2>
        <span>{rejected.length} {rejected.length === 1 ? 'link' : 'links'}</span>
      </div>
      <ul className={s.list}>
        {rejected.map((r) => (
          <li key={r.url} className={s.item}>
            <span className={s.state} data-state="fail">Rejected</span>
            <span className={s.url}>{r.url}</span>
            <span className={s.reason}>{REJECT_TEXT[r.reason]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Step 6: the code ─────────────────────────────────────────────── */

function DoneScreen({
  st,
  masked,
  onAddMore,
  onStartOver,
}: {
  st: Saved;
  masked?: string;
  onAddMore: () => void;
  onStartOver: () => void;
}) {
  const steps = [...st.steps, ...(st.location ? [st.location] : [])];
  return (
    <>
      <h1 id="step-heading" tabIndex={-1} className={s.h1}>You&apos;re verified</h1>
      <p className={s.lead}>Paste the line below into each listing.</p>

      <StepList
        steps={steps}
        times={st.times}
        compact
        footer={
          <>
            {masked}
            {masked && st.issuedAt ? ' · ' : ''}
            {st.issuedAt ? (
              <>
                issued <span className={s.nowrap}>{shortDate(st.issuedAt)}</span>, {clockTime(st.issuedAt).slice(0, 5)}
              </>
            ) : null}
          </>
        }
      />
      {st.code && st.pasteLine && <CodePlate code={st.code} pasteLine={st.pasteLine} />}

      <section className={s.module} aria-labelledby="listings-title">
        <div className={s.tab}>
          <h2 id="listings-title">Registered listings</h2>
          <span>{st.accepted.length} on this code</span>
        </div>
        <ul className={s.list}>
          {st.accepted.map((a) => (
            <li key={listingKey(a)} className={s.item}>
              <span className={s.state} data-state="ok">
                <CheckIcon />
                Linked
              </span>
              <span className={s.itemTitle}>{SITE_NAME[a.site]}</span>
              <span className={s.url}>ID {a.listingId}</span>
            </li>
          ))}
        </ul>
      </section>
      {st.rejected.length > 0 && <RejectedList rejected={st.rejected} />}

      <div className={s.actionsInline}>
        <button type="button" className={s.secondary} onClick={onAddMore}>Add a listing for this apartment</button>
        <p className={s.note}>You&apos;ll confirm you&apos;re at the apartment again first.</p>
        <button type="button" className={`${s.textLink} ${s.textButton}`} onClick={onStartOver}>Verify another apartment</button>
      </div>
    </>
  );
}
