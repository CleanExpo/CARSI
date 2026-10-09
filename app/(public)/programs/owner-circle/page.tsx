import type { Metadata } from 'next';

import { BusinessCoachingContent } from '@/components/marketing/BusinessCoachingPage';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  businessCoachingPath,
  businessCoachingProductName,
} from '@/lib/marketing/business-coaching';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${businessCoachingPath}`;

export const metadata: Metadata = {
  title: `${businessCoachingProductName} — $22/seat monthly (not $495 Growth Days)`,
  description:
    'Monthly after-hours owner meetups at $22 per seat. Not the two-day CARSI × CCW Business Growth Days (~$495). Book on CARSI with Stripe.',
  alternates: { canonical },
  openGraph: {
    title: `${businessCoachingProductName} — $22/seat`,
    description:
      'Small-business monthly group sessions. Separate from the $495 two-day Growth Days.',
    url: canonical,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function OwnerCirclePage() {
  return <BusinessCoachingContent />;
}
