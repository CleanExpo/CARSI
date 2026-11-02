import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwBusinessCoachingClient } from '@/components/ccw/CcwBusinessCoachingClient';
import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';
import { BusinessOffersCompare } from '@/components/marketing/BusinessOffersCompare';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyTagline,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import { CcwFreeTools } from '@/components/marketing/CcwFreeTools';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { getBusinessOffers } from '@/lib/marketing/business-offers';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { isCarsiCoachingMonthlyEnabled } from '@/lib/server/carsi-coaching-monthly-flag';

// The business-offers comparison shows a date-dependent Growth Days price (free, paid or TBA by
// sitting), so refresh hourly rather than freezing it at build time.
export const revalidate = 3600;

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
    <>
      <Suspense fallback={<CcwCoachingFallback />}>
        <CcwBusinessCoachingClient checkoutEnabled={checkoutEnabled} />
      </Suspense>
      <div className="border-t border-slate-200/70 bg-white py-12 md:py-16">
        <BusinessOffersCompare
          offers={getBusinessOffers()}
          currentId="business-coaching"
          className={PUBLIC_SHELL_INNER_CLASS}
        />
      </div>
      <CcwFreeTools />
    </>
  );
}
