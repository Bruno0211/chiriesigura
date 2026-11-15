'use client';

import { parseListingUrl, UNDER_REVIEW_TEXT, type CheckResponse } from '@cs/shared';
import { useId, useState, type FormEvent } from 'react';
import s from '../phone.module.css';

const SIGN_IN = '/auth/login?returnTo=/check';

/** The badge's colour, in the phone pages' alert tones. */
const tone = (status: CheckResponse['status']) =>
  status === 'green' ? 'ok' : status.startsWith('red') ? 'fail' : 'warn';

type Result = { kind: 'verdict'; data: CheckResponse } | { kind: 'error' } | null;

/** /check: the extension's verdict for students who can't run it (a phone, or a laptop without it). */
export function CheckForm({ signedIn }: { signedIn: boolean }) {
  const [signedOut, setSignedOut] = useState(!signedIn);
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    // Same parameters as the extension's checkUrl; the server decides the verdict, including "Can't confirm".
    const q = new URLSearchParams();
    // Apps share "title + link"; take the first link out of whatever was pasted.
    const url = link.match(/https?:\/\/\S+/)?.[0] ?? link.trim();
    const listing = parseListingUrl(url, window.location.origin);
    if (listing) {
      q.set('site', listing.site);
      q.set('listingId', listing.listingId);
    }
    if (code.trim()) q.set('code', code.trim());
    if (phone.trim()) q.set('phone', phone.trim());
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/check?${q}`, { cache: 'no-store' });
      if (res.status === 401) return setSignedOut(true);
      const data = (await res.json()) as CheckResponse;
      setResult(res.ok && typeof data?.label === 'string' ? { kind: 'verdict', data } : { kind: 'error' });
    } catch {
      setResult({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (signedOut) {
    return (
      <>
        <h1 id="step-heading" className={s.h1}>Sign in to check listings</h1>
        <p className={s.lead}>ChirieSigură checks are for signed-in students. Sign in, and you come straight back here.</p>
        <div className={s.actionsInline}>
          <a className={s.primary} href={SIGN_IN}>Sign in</a>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 id="step-heading" className={s.h1}>Check a listing</h1>
      <p className={s.lead}>Paste the listing&apos;s link and the ChirieSigură code from its description.</p>

      {result?.kind === 'verdict' && (
        <div className={s.alert} data-tone={tone(result.data.status)} data-status={result.data.status} role="status">
          <p className={s.alertTitle}>{result.data.label}</p>
        </div>
      )}
      {result?.kind === 'verdict' && result.data.underReview && (
        <div className={s.alert} data-tone="warn" role="note">
          <p className={s.alertTitle}>{UNDER_REVIEW_TEXT}</p>
        </div>
      )}
      {result?.kind === 'verdict' && result.data.verificationId && (
        // Phones can't run the extension, so this is how a student at the address reaches the report.
        <div className={s.actionsInline}>
          <a className={s.primary} href={`/viewing/${encodeURIComponent(result.data.verificationId)}`}>I&apos;m at the viewing · Report it</a>
        </div>
      )}
      {result?.kind === 'error' && (
        <div className={s.alert} data-tone="fail" role="alert">
          <p className={s.alertTitle}>Couldn&apos;t check this listing. Try again.</p>
        </div>
      )}

      <form onSubmit={submit}>
        <section className={s.module} aria-labelledby={`${id}-title`}>
          <div className={s.tab}>
            <h2 id={`${id}-title`}>The listing</h2>
            <span>Nothing here is stored</span>
          </div>
          <div className={s.fields}>
            <div className={s.field}>
              <label htmlFor={`${id}-link`} className={s.label}>Listing link</label>
              <input id={`${id}-link`} className={s.input} type="text" inputMode="url" autoComplete="off" required value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className={s.field}>
              <label htmlFor={`${id}-code`} className={s.label}>Code from the listing</label>
              <input id={`${id}-code`} className={`${s.input} ${s.inputMono}`} placeholder="VC-XXXX" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className={s.field}>
              <label htmlFor={`${id}-phone`} className={s.label}>Phone number shown on the listing (optional)</label>
              <input id={`${id}-phone`} className={`${s.input} ${s.inputMono}`} type="tel" inputMode="tel" placeholder="07xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </section>
        <div className={s.actionsInline}>
          <button type="submit" className={s.primary} disabled={busy} aria-busy={busy || undefined}>
            {busy ? 'Checking…' : 'Check listing'}
          </button>
          <a className={s.textLink} href="/auth/logout">Sign out</a>
        </div>
      </form>
    </>
  );
}
