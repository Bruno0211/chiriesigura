import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { caseList } from '@/lib/cases';
import { getDb } from '@/lib/db';
import { isReviewer } from '@/lib/review';
import { FrameBar } from '../components/FrameBar';
import { PageFallback } from '../components/PageFallback';
import s from '../phone.module.css';
import { ReviewList } from './ReviewList';

export const metadata: Metadata = { title: 'Reports to review' };

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
  const items = await caseList(getDb());
  return (
    <>
      <FrameBar zone="Team review" />
      <main className={s.main}>
        <h1 id="step-heading" className={s.h1}>Reports to review</h1>
        <p className={s.lead}>
          Each problem report waits here. Ban for life blocks the landlord on every listing and follows the person to any new number; Dismiss and False report leave the landlord verified.
        </p>
        <ReviewList items={items} />
      </main>
    </>
  );
}
