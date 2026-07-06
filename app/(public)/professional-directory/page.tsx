import type { Metadata } from 'next';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { ProfessionalDirectoryComingSoon } from '@/components/marketing/professional-directory/ProfessionalDirectoryComingSoon';
import { ProfessionalDirectoryListing } from '@/components/marketing/professional-directory/ProfessionalDirectoryListing';
import { OG_IMAGES } from '@/lib/seo/og-image';
import {
  getProfessionalDirectoryStatus,
  getVerifiedProfessionals,
} from '@/lib/server/professional-directory';

/**
 * Professional Directory — honest gate until NRPG registry sync (GitHub #298 / GP-449).
 * Never renders fabricated member rows; listings only when getVerifiedProfessionals()
 * returns registry-backed data with PROFESSIONAL_DIRECTORY_LIVE=true.
 */

export const metadata: Metadata = {
  title: 'Professional Directory — Coming Soon | CARSI Industry Hub',
  description:
    'The CARSI professional directory is in development. Verified NRPG member profiles will appear here once registry integration is complete — no placeholder listings.',
  keywords: [
    'NRPG professionals Australia',
    'restoration professionals directory',
    'CARSI professional directory',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Professional Directory — Coming Soon | CARSI Industry Hub',
    description:
      'Verified NRPG professional listings are coming soon. CARSI does not display fabricated member data.',
    type: 'website',
    url: 'https://carsi.com.au/professional-directory',
  },
  alternates: { canonical: 'https://carsi.com.au/professional-directory' },
};

export default async function ProfessionalDirectoryPage() {
  const professionals = await getVerifiedProfessionals();
  const status = await getProfessionalDirectoryStatus();
  const showListings = status.live && professionals.length > 0;

  return (
    <MarketingPageShell id="main-content">
      {showListings ? (
        <ProfessionalDirectoryListing professionals={professionals} />
      ) : (
        <ProfessionalDirectoryComingSoon />
      )}
    </MarketingPageShell>
  );
}
