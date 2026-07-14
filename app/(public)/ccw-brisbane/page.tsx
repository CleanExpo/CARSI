import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'CARSI x CCW Brisbane | Grow Your Cleaning Business — 11-12 August 2026',
  description:
    'Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Boondall (Brisbane), 11-12 August 2026. Claim your free entry token.',
  alternates: { canonical: `${siteUrl}/ccw-brisbane` },
  openGraph: {
    title: 'CARSI x CCW Brisbane — Grow Your Cleaning Business',
    description:
      'Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Boondall, 11-12 August 2026.',
    url: `${siteUrl}/ccw-brisbane`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwBrisbanePage() {
  return <CcwRoadshowContent focusSlug="brisbane" />;
}
