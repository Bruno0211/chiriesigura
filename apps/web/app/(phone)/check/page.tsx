import type { Metadata } from 'next';
import { Suspense } from 'react';
import { isSignedIn } from '@/lib/auth0';
import { FrameBar } from '../components/FrameBar';
import { PageFallback } from '../components/PageFallback';
import s from '../phone.module.css';
import { CheckForm } from './CheckForm';

export const metadata: Metadata = { title: 'Check a listing' };

export default function CheckPage() {
  return (
    <Suspense fallback={<PageFallback zone="Check a listing" />}>
      <Check />
    </Suspense>
  );
}

// Reads the session cookie, so it renders per request inside Suspense (cacheComponents).
async function Check() {
  const signedIn = await isSignedIn();
  return (
    <>
      <FrameBar zone="Check a listing" />
      <main className={s.main}>
        <CheckForm signedIn={signedIn} />
      </main>
    </>
  );
}
