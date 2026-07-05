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
  title: 'Education Sector IICRC CEC Training',
  description:
    'IICRC CEC training for school and university maintenance teams. WRT, CRT, AMRT and ASD training for Australian education facilities.',
  keywords: [
    'education IICRC CEC training',
    'school restoration certification',
    'university maintenance IICRC',
    'education mould remediation Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#2196f3';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#2196f3' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#1976d2' },
  { code: 'CRT', label: 'Carpet Repair & Reinstallation', color: '#1565c0' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#0d47a1' },
];

const stats = [
  { value: '9,500+', label: 'Schools' },
  { value: 'WHS', label: 'Compliance' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const whyCards = [
  {
    icon: ShieldCheck,
    title: 'Duty of Care',
    description:
      'Schools must demonstrate competency in mould identification and remediation. IICRC CEC training provides documented evidence of due diligence for student and staff safety.',
    color: '#2196f3',
  },
  {
    icon: Building,
    title: 'Heritage Buildings',
    description:
      'Many older school buildings require specialised structural drying techniques. ASD certification ensures heritage fabric is preserved during water damage restoration.',
    color: '#1976d2',
  },
  {
    icon: Users,
    title: 'Parent Council Confidence',
    description:
      'IICRC credentials provide documented proof of competency that satisfies parent council scrutiny and school board reporting requirements.',
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
        description="WHS-compliant training for schools, universities, and TAFEs. IICRC credentials demonstrate duty of care for mould remediation and water damage response across education facilities."
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
        disciplineList="AMRT, WRT, CRT & ASD"
        disciplines={['AMRT', 'WRT', 'CRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Education Facility Training"
        title="Education Facility Bundle"
        price={industryBundlePriceLabel('education')}
        description="AMRT + WRT training for school maintenance teams. Bulk 10+ seat licensing available for education departments and school networks."
        ctaText="Request Education Pricing"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
