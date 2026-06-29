import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'CARSI x CCW Sydney | Grow Your Cleaning Business — 30-31 July 2026',
  description:
    'Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Sydney (Seven Hills), 30-31 July 2026. Claim your free entry token.',
  alternates: { canonical: `${siteUrl}/ccw-sydney` },
  openGraph: {
    title: 'CARSI x CCW Sydney — Grow Your Cleaning Business',
    description:
      'Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Sydney, 30-31 July 2026.',
    url: `${siteUrl}/ccw-sydney`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwSydneyPage() {
  return <CcwRoadshowContent focusSlug="sydney" />;
}
