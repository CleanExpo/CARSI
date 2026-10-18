import type { Metadata } from 'next';
import { Baby, Shield, Droplets } from 'lucide-react';
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
  title: 'Childcare IICRC CEC Training',
  description:
    'IICRC CEC training for childcare centre maintenance. Mould remediation and carpet cleaning training supporting NQF compliance across Australian early learning centres.',
  keywords: [
    'childcare IICRC CEC training',
    'early learning centre cleaning',
    'NQF compliance training',
    'childcare mould remediation Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#e91e63';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#e91e63' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#9c27b0' },
  { code: 'WRT', label: 'Water damage', color: '#673ab7' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'NQF', label: 'Quality Framework' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'NQF Quality Area 2',
    description:
      'IICRC CEC training directly supports Health & Safety requirements under the National Quality Standard. Aim for "Exceeding" at your next ACECQA assessment.',
    color: '#e91e63',
  },
  {
    icon: Baby,
    title: 'Play Area Safety',
    description:
      'Train staff to maintain carpet in indoor play areas, reading corners, and nap rooms. Proper hygiene directly impacts child health.',
    color: '#9c27b0',
  },
  {
    icon: Droplets,
    title: 'Water Play Response',
    description:
      'Water damage from bathrooms, wet rooms, and water play areas is common. Trained staff know the first steps to take.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ChildcareIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Baby}
        industryName="Childcare Industry"
        accentColor={ACCENT_COLOR}
        headline="Childcare Hygiene &"
        headlineAccent="Infection Control"
        description="Training for childcare centre cleaning and maintenance staff across Australia in carpet cleaning, microbial remediation and water damage response. Every completed course issues a verifiable CARSI credential."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Childcare Centres"
        headline="Built for"
        headlineAccent="child safety"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Childcare Industry"
        disciplineList="Mould remediation, carpet cleaning and water damage restoration"
        disciplines={['CRT', 'AMRT', 'WRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Childcare Compliance Training"
        title="Childcare Compliance Bundle"
        price={industryBundlePriceLabel('childcare')}
        description="Mould and microbial remediation, carpet cleaning and water damage restoration. Online and self-paced, so training fits around rosters."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
