import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwTrainingClient } from '@/components/ccw/CcwTrainingClient';

export const metadata: Metadata = {
  title: 'CCW Workshop | CARSI',
  description:
    '2-Day Carpet Cleaning Workshop (CCW) — access participant resources with your cohort password.',
  robots: { index: false, follow: false },
};

function CcwTrainingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center pb-24 pt-14">
      <p className="text-sm text-white/40">Loading…</p>
    </div>
  );
}

export default function CcwTrainingPage() {
  return (
    <Suspense fallback={<CcwTrainingFallback />}>
      <CcwTrainingClient />
    </Suspense>
  );
}
