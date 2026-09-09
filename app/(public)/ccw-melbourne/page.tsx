import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived, not restated - same drift class as the Sydney and Brisbane vanity pages.
// Melbourne is still on the free-entry rail, so its free copy stays true.
const melbourneDates = getCcwRoadshowEvent('melbourne')?.dates ?? '';

export const metadata: Metadata = {
  title: `CARSI x CCW Melbourne | Grow Your Cleaning Business — ${melbourneDates}`,
  description: `Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Melbourne (Bayswater North), ${melbourneDates}. Claim your free entry token.`,
  alternates: { canonical: `${siteUrl}/ccw-melbourne` },
  openGraph: {
    title: 'CARSI x CCW Melbourne — Grow Your Cleaning Business',
    description: `Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Melbourne, ${melbourneDates}.`,
    url: `${siteUrl}/ccw-melbourne`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwMelbournePage() {
  return <CcwRoadshowContent focusSlug="melbourne" />;
}
