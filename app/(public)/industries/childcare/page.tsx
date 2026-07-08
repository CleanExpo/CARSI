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
    'IICRC CEC training for childcare centre maintenance. AMRT and RRT training supporting NQF compliance across Australian early learning centres.',
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
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#e91e63' },
  { code: 'RRT', label: 'Carpet Restoration', color: '#9c27b0' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#673ab7' },
];

const stats = [
  { value: '16,000+', label: 'Approved Centres' },
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
      'Water damage from bathrooms, wet rooms, and water play areas is common. IICRC-certified staff respond correctly the first time.',
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
        description="NQF-compliant training for childcare centres across Australia. Equip your cleaning and maintenance staff with IICRC-recognised credentials in carpet restoration, microbial remediation, and water damage response."
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
        disciplineList="AMRT, RRT & WRT"
        disciplines={['RRT', 'AMRT', 'WRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Childcare Compliance Training"
        title="Childcare Compliance Bundle"
        price={industryBundlePriceLabel('childcare')}
        description="AMRT Infection Control + RRT Carpet Basics + WRT Fundamentals. Minimal roster disruption — 2-4 hour self-paced modules."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
