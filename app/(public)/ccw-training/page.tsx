import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwTrainingClient } from '@/components/ccw/CcwTrainingClient';

export const metadata: Metadata = {
  title: 'The Carpet Cleaning Workshop | CARSI',
  description:
    'CARSI · 2 days · hands-on — fibre, chemistry, methods, upholstery, hard floors, business, maintenance. Anchored in ANSI/IICRC S100 · S300 · S220. Participant resources (password).',
  robots: { index: false, follow: false },
};

function CcwTrainingFallback() {
  return (
    <div className="animate-pulse pt-12 pb-28 md:pt-16" aria-busy aria-label="Loading page">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-6 h-3 w-32 rounded-full bg-white/10" />
        <div className="mx-auto mb-4 h-10 max-w-lg rounded-lg bg-white/10 md:h-12" />
        <div className="mx-auto mb-3 h-px w-16 bg-white/10" />
        <div className="mx-auto h-4 max-w-2xl rounded bg-white/10" />
        <div className="mx-auto mt-2 h-4 max-w-xl rounded bg-white/10" />
        <div className="mx-auto mt-20 h-48 max-w-xl rounded-2xl bg-white/6" />
      </div>
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
