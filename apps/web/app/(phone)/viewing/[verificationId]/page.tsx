import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '../../components/PageFallback';
import { ViewingFlow } from './ViewingFlow';

export const metadata: Metadata = { title: 'Report a viewing' };

type Params = Promise<{ verificationId: string }>;

export default function ViewingPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageFallback zone="Viewing report" />}>
      <Flow params={params} />
    </Suspense>
  );
}

async function Flow({ params }: { params: Params }) {
  const { verificationId } = await params;
  return <ViewingFlow verificationId={verificationId} />;
}
