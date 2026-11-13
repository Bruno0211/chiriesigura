import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '../components/PageFallback';
import { VerifyWizard } from './VerifyWizard';

export const metadata: Metadata = { title: 'Verify as a landlord' };

export default function VerifyPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <VerifyWizard />
    </Suspense>
  );
}
