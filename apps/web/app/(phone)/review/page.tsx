import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getDb } from '@/lib/db';
import { holdList } from '@/lib/queries';
import { isReviewer } from '@/lib/review';
import { FrameBar } from '../components/FrameBar';
import { PageFallback } from '../components/PageFallback';
import s from '../phone.module.css';
import { ReviewList } from './ReviewList';

export const metadata: Metadata = { title: 'Review holds' };

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageFallback zone="Team review" />}>
      <Review />
    </Suspense>
  );
}

// Reads the session cookie, so it renders per request inside Suspense (cacheComponents).
async function Review() {
  if (!(await isReviewer())) notFound();
  const items = await holdList(getDb());
  return (
    <>
      <FrameBar zone="Team review" />
      <main className={s.main}>
        <h1 id="step-heading" className={s.h1}>Landlords on hold</h1>
        <p className={s.lead}>Verified viewers reported these landlords. A ban is for life and follows the person to any new number.</p>
        <ReviewList items={items} />
      </main>
    </>
  );
}
