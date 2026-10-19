import type { Metadata } from 'next';
import { GraduationCap, ShieldCheck, Building, Users } from 'lucide-react';
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
  title: 'Education Sector Restoration Training',
  description:
    'Restoration training for school and university maintenance teams. Water damage restoration, carpet cleaning, mould remediation and structural drying training for Australian education facilities.',
  keywords: [
    'education restoration training',
    'school restoration training',
    'university maintenance restoration training',
    'education mould remediation Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#2196f3';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#2196f3' },
  { code: 'WRT', label: 'Water damage', color: '#1976d2' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#1565c0' },
  { code: 'ASD', label: 'Structural drying', color: '#0d47a1' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'WHS', label: 'Compliance' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const whyCards = [
  {
    icon: ShieldCheck,
    title: 'Documented Training',
    description:
      'Mould in classrooms and staff areas needs prompt identification and correct remediation. Documented CARSI training shows what each maintenance team member has studied, and when.',
    color: '#2196f3',
  },
  {
    icon: Building,
    title: 'Heritage Buildings',
    description:
      'Many older school buildings require specialised structural drying techniques. Structural drying training helps teams preserve heritage fabric during water damage restoration.',
    color: '#1976d2',
  },
  {
    icon: Users,
    title: 'Parent Council Confidence',
    description:
      'Verifiable CARSI credentials document completed training for school board reporting.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EducationIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={GraduationCap}
        industryName="Education"
        accentColor={ACCENT_COLOR}
        headline="Education Facility"
        headlineAccent="Restoration Training"
        description="Mould remediation and water damage training for school, university and TAFE maintenance teams. Every completed course issues a verifiable CARSI credential."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Education Facilities"
        headline="Built for"
        headlineAccent="student safety"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Education"
        disciplineList="Mould remediation, water damage restoration, carpet cleaning and structural drying"
        disciplines={['AMRT', 'WRT', 'CRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Education Facility Training"
        title="Education Facility Bundle"
        price={industryBundlePriceLabel('education')}
        description="mould remediation and water damage restoration training for school maintenance teams. Paid courses can be bought as team seats at checkout."
        ctaText="Request Education Pricing"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
