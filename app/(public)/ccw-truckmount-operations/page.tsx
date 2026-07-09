import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CcwCarsiTruckmountClient } from '@/components/ccw/CcwCarsiTruckmountClient';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'CCW-CARSI Truckmount Operations Course',
  description:
    'A specialised operator course for HydraMaster & Sapphire Scientific truck-mounts in Australian configuration — safe operation, storage, transport, road safety, maintenance, and competency sign-off. Standards-sourced.',
  alternates: { canonical: `${siteUrl}/ccw-truckmount-operations` },
  openGraph: {
    images: OG_IMAGES,
    title: 'CCW-CARSI Truckmount Operations Course | CARSI',
    description:
      'Specialised truck-mount operator course — Australian configuration, standards-sourced, with a safety certificate and competency sign-off. A CARSI × Carpet Cleaners Warehouse course.',
    type: 'website',
    url: `${siteUrl}/ccw-truckmount-operations`,
  },
};

function TruckmountFallback() {
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

export default function CcwCarsiTruckmountPage() {
  return (
    <Suspense fallback={<TruckmountFallback />}>
      <CcwCarsiTruckmountClient />
    </Suspense>
  );
}
