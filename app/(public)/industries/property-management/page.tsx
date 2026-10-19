import type { Metadata } from 'next';
import { Building, Shield, Droplets, Scale } from 'lucide-react';
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
  title: 'Property Management Restoration Training',
  description:
    'Restoration courses for Australian property and strata managers. Mould, water damage and carpet credentials for RTA compliance.',
  keywords: [
    'property management restoration training',
    'strata manager restoration course',
    'RTA mould compliance',
    'property manager water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#673ab7';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#673ab7' },
  { code: 'WRT', label: 'Water damage', color: '#512da8' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#4527a0' },
  { code: 'ASD', label: 'Structural drying', color: '#311b92' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'RTA', label: 'Compliance' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const whyCards = [
  {
    icon: Scale,
    title: 'Tribunal Defence',
    description:
      'Verifiable assessment credentials provide defensible documentation in NCAT/VCAT hearings. Reduce mould and carpet disputes with standards-based evidence.',
    color: '#673ab7',
  },
  {
    icon: Shield,
    title: 'RTA Compliance',
    description:
      'Mould is a habitability issue under all state Residential Tenancies Acts. Trained managers avoid regulatory breaches and landlord liability.',
    color: '#512da8',
  },
  {
    icon: Droplets,
    title: 'Insurance Claims',
    description:
      'Defensible, standards-based documentation for water damage and mould insurance claims. Win management contracts with qualified credentials.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PropertyManagementIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Building}
        industryName="Property Management"
        accentColor={ACCENT_COLOR}
        headline="Property Management"
        headlineAccent="Restoration Training"
        description="Mould and water damage training for property and strata managers. Every completed course issues a verifiable CARSI credential."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Property Managers"
        headline="Built for"
        headlineAccent="tribunal defence"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Property Management"
        disciplineList="Mould remediation, water damage restoration, carpet cleaning and structural drying"
        disciplines={['AMRT', 'WRT', 'CRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Property Management Training"
        title="Property Bundle"
        price={industryBundlePriceLabel('property-management')}
        description="Mould remediation, water damage restoration and carpet cleaning for property managers. Paid courses can be bought as team seats at checkout."
        ctaText="Browse courses"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
