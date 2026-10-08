import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';
import { formatAudFromCents, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived from the roadshow data module rather than restated. These strings were
// hardcoded and went stale by a month while the data module was the thing being
// corrected — the drift GP-545 was raised for. Reading the event makes that
// impossible to repeat.
const brisbane = getCcwRoadshowEvent('brisbane-2026-10-09');
const brisbaneDates = brisbane?.dates ?? '';
const brisbanePrice = brisbane?.unitAmountCents !== undefined
  ? `${formatAudFromCents(brisbane.unitAmountCents)} including GST; `
  : '';

export const metadata: Metadata = {
  title: `CARSI x CCW Brisbane | Carpet and Upholstery Training - ${brisbaneDates}`,
  description:
    `Carpet and upholstery training with Phill McGurk at Carpet Cleaners Warehouse Boondall, ${brisbaneDates}. ${brisbanePrice}book through CCW.`,
  alternates: { canonical: `${siteUrl}/ccw-brisbane` },
  openGraph: {
    title: 'CARSI x CCW Brisbane - Carpet and Upholstery Training',
    description: `Two practical training days with Phill McGurk at Carpet Cleaners Warehouse Boondall, ${brisbaneDates}.`,
    url: `${siteUrl}/ccw-brisbane`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwBrisbanePage() {
  return <CcwRoadshowContent focusSlug="brisbane-2026-10-09" />;
}
