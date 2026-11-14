import type { Metadata } from 'next';
import { isSignedIn } from '@/lib/auth0';
import { FrameBar } from '../components/FrameBar';
import s from '../phone.module.css';
import { CheckForm } from './CheckForm';

export const metadata: Metadata = { title: 'Check a listing' };

export default async function CheckPage() {
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
