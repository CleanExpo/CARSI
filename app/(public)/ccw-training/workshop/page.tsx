import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwWorkshopClient } from '@/components/ccw/CcwWorkshopClient';
import { carsiCoachingWorkshopPath } from '@/lib/marketing/carsi-coaching-monthly';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'The Carpet Cleaning Workshop',
  description:
    'CARSI · 2 days · hands-on — fibre, chemistry, methods, upholstery, hard floors, business, maintenance. Anchored in ANSI/IICRC S100 · S300 · S220. Participant resources (password).',
  alternates: { canonical: `${siteUrl}${carsiCoachingWorkshopPath}` },
  openGraph: {
    images: OG_IMAGES,
    title: 'The Carpet Cleaning Workshop | CARSI',
    description:
      'Hands-on CARSI carpet cleaning workshop — fibre, chemistry, upholstery, hard floors and business modules. Cohort resource pack for enrolled participants.',
    type: 'website',
    url: `${siteUrl}${carsiCoachingWorkshopPath}`,
  },
};

function CcwWorkshopFallback() {
  return (
    <div className="animate-pulse pt-12 pb-28 md:pt-16" aria-busy aria-label="Loading page">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-6 h-3 w-32 rounded-full bg-white/10" />
        <div className="mx-auto mb-4 h-10 max-w-lg rounded-lg bg-white/10 md:h-12" />
      </div>
    </div>
  );
}

export default function CcwWorkshopPage() {
  return (
    <Suspense fallback={<CcwWorkshopFallback />}>
      <CcwWorkshopClient />
    </Suspense>
  );
}
