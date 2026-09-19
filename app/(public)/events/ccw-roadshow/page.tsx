import type { Metadata } from 'next';

import { CcwRoadshowContent } from '@/components/marketing/CcwRoadshowPage';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${ccwRoadshowPath}`;

export const metadata: Metadata = {
  title: 'Grow Your Cleaning Business | CARSI x CCW Roadshow 2026',
  description:
    'Spend two practical days with Phill McGurk at CCW Melbourne, Sydney or Brisbane. Melbourne is free for past and current CCW customers; Sydney and Brisbane seats are booked through Carpet Cleaners Warehouse.',
  alternates: { canonical },
  keywords: [
    'carpet cleaning training Melbourne',
    'carpet cleaning training Sydney',
    'carpet cleaning training Brisbane',
    'rug cleaning training Australia',
    'stain removal training',
    'tile cleaning training',
    'carpet cleaning business growth',
    'CARSI CCW training',
  ],
  openGraph: {
    title: 'Grow Your Cleaning Business with CARSI x CCW',
    description:
      'Two practical business-growth days with Phill McGurk inside CCW Melbourne, Sydney and Brisbane locations.',
    url: canonical,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export { CcwRoadshowContent };

export default function CcwRoadshowPage() {
  return <CcwRoadshowContent />;
}
