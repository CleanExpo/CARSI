import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: 'CARSI x CCW Melbourne | Grow Your Cleaning Business — 22-23 July 2026',
  description:
    'Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Melbourne (Bayswater North), 22-23 July 2026. Claim your free entry token.',
  alternates: { canonical: `${siteUrl}/ccw-melbourne` },
  openGraph: {
    title: 'CARSI x CCW Melbourne — Grow Your Cleaning Business',
    description:
      'Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Melbourne, 22-23 July 2026.',
    url: `${siteUrl}/ccw-melbourne`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwMelbournePage() {
  return <CcwRoadshowContent focusSlug="melbourne" />;
}
