import type { Metadata } from 'next';
import { HardHat, Shield, Droplets } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Construction Restoration Training',
  description:
    'Water damage and mould management training for Australian construction sites. Water damage restoration, structural drying and mould remediation courses supporting NCC compliance.',
  keywords: [
    'construction restoration training',
    'building site mould management',
    'NCC compliance restoration',
    'construction water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ff9800';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#ff9800' },
  { code: 'ASD', label: 'Structural drying', color: '#f57c00' },
  { code: 'AMRT', label: 'Mould remediation', color: '#e65100' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'NCC', label: 'Compliance Support' },
  { value: 'CARSI', label: 'Verifiable credentials' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'NCC Compliance',
    description:
      'Training supports National Construction Code obligations for moisture and mould management. Satisfy WHS Act requirements for hazard identification.',
    color: '#ff9800',
  },
  {
    icon: Droplets,
    title: 'Moisture and Mould Control',
    description:
      'Training covers moisture management and mould control during construction.',
    color: '#f57c00',
  },
  {
    icon: HardHat,
    title: 'Verifiable Records',
    description:
      'Every completed course issues a verifiable CARSI credential. Builders set their own panel requirements, so check what each one asks for.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ConstructionIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={HardHat}
        industryName="Construction Industry"
        accentColor={ACCENT_COLOR}
        headline="Construction Site"
        headlineAccent="Restoration Training"
        description="Moisture and mould management training for site managers, project managers and WHS officers. Documented CARSI training shows what each team member has studied, and when."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Construction Companies"
        headline="Built for"
        headlineAccent="defect prevention"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Construction Industry"
        disciplineList="Water damage restoration, structural drying and mould remediation"
        disciplines={['WRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Construction Restoration Training"
        title="Site Restoration Bundle"
        price={industryBundlePriceLabel('construction')}
        description="Water damage restoration, structural drying and mould remediation for construction crews. Paid courses can be bought as team seats at checkout."
        ctaText="Train Your Site Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
