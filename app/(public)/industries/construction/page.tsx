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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Construction IICRC CEC Training',
  description:
    'IICRC water damage and mould management training for Australian construction sites. WRT, ASD and AMRT courses supporting NCC compliance.',
  keywords: [
    'construction IICRC CEC training',
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
  { code: 'WRT', label: 'Water Damage Restoration', color: '#ff9800' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#f57c00' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#e65100' },
];

const stats = [
  { value: '376,000+', label: 'Builders & Trades' },
  { value: 'NCC', label: 'Compliance Support' },
  { value: '30%+', label: 'QLD Homes w/ Mould' },
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
    title: 'Defect Liability',
    description:
      'Trained site staff reduce mould and water damage defect claims during the liability period. 30%+ of new QLD homes have mould within 2 years.',
    color: '#f57c00',
  },
  {
    icon: HardHat,
    title: 'Pre-Qualification',
    description:
      'Verifiable digital credentials for pre-qualification panels at tier-1 builders like CIMIC, Lendlease, John Holland, and Multiplex.',
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
        description="NCC-compliant moisture and mould management training for site managers, project managers, and WHS officers. Reduce defect liability claims with IICRC-certified restoration knowledge."
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
        disciplineList="WRT, ASD & AMRT"
        disciplines={['WRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Construction Restoration Training"
        title="Site Restoration Bundle"
        price="$245"
        description="WRT Water Damage + ASD Structural Drying + AMRT Mould Assessment + Moisture Detection bonus module. Bulk team pricing available."
        ctaText="Train Your Site Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
