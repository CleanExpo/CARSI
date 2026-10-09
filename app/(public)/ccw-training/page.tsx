import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwBusinessCoachingClient } from '@/components/ccw/CcwBusinessCoachingClient';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyTagline,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { isCarsiCoachingMonthlyEnabled } from '@/lib/server/carsi-coaching-monthly-flag';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: `${carsiCoachingProductName} — from $495/month`,
  description: carsiCoachingMonthlyTagline,
  alternates: { canonical: `${siteUrl}${carsiCoachingMonthlyPath}` },
  openGraph: {
    images: OG_IMAGES,
    title: `${carsiCoachingProductName} | CARSI`,
    description: carsiCoachingMonthlyTagline,
    type: 'website',
    url: `${siteUrl}${carsiCoachingMonthlyPath}`,
  },
};

function CcwCoachingFallback() {
  return (
    <div className="animate-pulse pt-12 pb-28 md:pt-16" aria-busy aria-label="Loading page">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-4 h-10 max-w-lg rounded-lg bg-slate-200/80 md:h-12" />
        <div className="mx-auto h-4 max-w-2xl rounded bg-slate-200/60" />
      </div>
    </div>
  );
}

export default function CcwTrainingPage() {
  const checkoutEnabled = isCarsiCoachingMonthlyEnabled();

  return (
    <Suspense fallback={<CcwCoachingFallback />}>
      <CcwBusinessCoachingClient checkoutEnabled={checkoutEnabled} />
    </Suspense>
  );
}
