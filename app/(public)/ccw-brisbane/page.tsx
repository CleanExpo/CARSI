import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived from the roadshow data module rather than restated. These strings were
// hardcoded and went stale by a month while the data module was the thing being
// corrected — the drift GP-545 was raised for. Reading the event makes that
// impossible to repeat.
const brisbane = getCcwRoadshowEvent('brisbane');
const brisbaneDates = brisbane?.dates ?? '';

export const metadata: Metadata = {
  title: `CARSI x CCW Brisbane | Grow Your Cleaning Business — ${brisbaneDates}`,
  description:
    `Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Boondall (Brisbane), ${brisbaneDates}. Seats are booked through Carpet Cleaners Warehouse.`,
  alternates: { canonical: `${siteUrl}/ccw-brisbane` },
  openGraph: {
    title: 'CARSI x CCW Brisbane — Grow Your Cleaning Business',
    description: `Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Boondall, ${brisbaneDates}.`,
    url: `${siteUrl}/ccw-brisbane`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwBrisbanePage() {
  return <CcwRoadshowContent focusSlug="brisbane" />;
}
