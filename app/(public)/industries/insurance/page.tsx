import type { Metadata } from 'next';
import { FileCheck, Shield, TrendingDown } from 'lucide-react';
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
  title: 'Insurance Professional IICRC Training | CARSI',
  description:
    'IICRC training for loss adjusters and claims assessors. Scope restoration claims accurately with WRT, FSRT and AMRT certification.',
  keywords: [
    'insurance IICRC training',
    'loss adjuster certification',
    'claims assessor restoration training',
    'insurance restoration Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#1976d2';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#1976d2' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#1565c0' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#0d47a1' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#0b3d91' },
];

const stats = [
  { value: '$4.5B', label: 'Claims/year' },
  { value: 'IICRC', label: 'Standards' },
  { value: '24/7', label: 'Online' },
];

const whyCards = [
  {
    icon: FileCheck,
    title: 'Accurate Scoping',
    description:
      'Understand IICRC standards to approve appropriate restoration scope. Reduce under- and over-scoped claims with evidence-based assessment knowledge.',
    color: '#1976d2',
  },
  {
    icon: Shield,
    title: 'Fraud Prevention',
    description:
      'Identify over-scoped or unnecessary remediation work. IICRC training equips adjusters to challenge inflated quotes with technical authority.',
    color: '#1565c0',
  },
  {
    icon: TrendingDown,
    title: 'Claims Efficiency',
    description:
      'Faster claim resolution when adjusters understand restoration processes. Reduce back-and-forth between assessors and contractors on scope of works.',
    color: '#0d47a1',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function InsuranceIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={FileCheck}
        industryName="Insurance"
        accentColor={ACCENT_COLOR}
        headline="Insurance Professional"
        headlineAccent="Restoration Training"
        description="IICRC training for loss adjusters, claims assessors, building consultants, and forensic accountants. Understand restoration standards to scope claims accurately and reduce fraud."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Insurance Professionals"
        headline="Built for"
        headlineAccent="claims accuracy"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Insurance"
        disciplineList="WRT, FSRT, AMRT & ASD"
        disciplines={['WRT', 'FSRT', 'AMRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Insurance Professional Training"
        title="Insurance Professional Bundle"
        price="$295"
        description="WRT + FSRT training for claims teams. Equip loss adjusters and assessors with the restoration knowledge to scope accurately and settle faster."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
