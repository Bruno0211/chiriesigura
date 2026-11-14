import type { Metadata } from 'next';
import Link from 'next/link';
import { FrameBar } from '../components/FrameBar';
import s from '../phone.module.css';

export const metadata: Metadata = { title: "You're signed in" };

/** Where signing in from the extension lands: the listing tab re-checks by itself when the student returns. */
export default function SignedInPage() {
  return (
    <>
      <FrameBar zone="Signed in" />
      <main className={s.main}>
        <h1 id="step-heading" className={s.h1}>You&apos;re signed in</h1>
        <p className={s.lead}>Signed in from the ChirieSigură badge? Go back to your listing tab: it updates by itself.</p>
        <p className={s.lead}>
          No extension on this device? <Link className={s.textLink} href="/check">Check a listing here</Link>
        </p>
      </main>
    </>
  );
}
