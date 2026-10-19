import type { Metadata } from 'next';
import { Pickaxe, Shield, Droplets, Wind } from 'lucide-react';
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
  title: 'Mining Site Restoration Training',
  description:
    'Restoration courses for Australian mining operations. Water damage restoration, mould remediation and structural drying courses for water damage, mould, and structural drying on remote sites.',
  keywords: [
    'mining restoration training Australia',
    'WHS compliance restoration',
    'water damage mining',
    'mould remediation mining',
    'structural drying mine sites',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ed9d24';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#ed9d24' },
  { code: 'AMRT', label: 'Mould remediation', color: '#d4891e' },
  { code: 'ASD', label: 'Structural drying', color: '#c77b1a' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'WHS', label: 'Hazard training' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'WHS Compliance',
    description:
      'Mining operations have strict WHS obligations. Restoration training demonstrates due diligence for water damage and mould hazard identification on site.',
    color: '#ed9d24',
  },
  {
    icon: Droplets,
    title: 'Wet Area Response',
    description:
      'Water ingress in accommodation blocks, wet mess areas, and underground operations requires immediate, standards-based response.',
    color: '#d4891e',
  },
  {
    icon: Wind,
    title: 'Remote Site Capability',
    description:
      'Online, self-paced training works for FIFO rosters. Staff can complete modules during swing-off or on-site downtime.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function MiningIndustryPage() {
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Pickaxe}
        industryName="Mining Industry"
        accentColor={ACCENT_COLOR}
        headline="Mining Site"
        headlineAccent="Restoration Training"
        description="Restoration training for mining site teams: water damage, mould remediation and structural drying in remote site environments."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Mining Operations"
        headline="Built for"
        headlineAccent="remote site safety"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Mining Industry"
        disciplineList="Water damage restoration, mould remediation and structural drying"
        disciplines={['WRT', 'AMRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Mining Site Training"
        title="Mining Restoration Bundle"
        price={industryBundlePriceLabel('mining')}
        description="water damage restoration, mould remediation and structural drying training for mining site teams. Paid courses can be bought as team seats at checkout."
        ctaText="Train Your Site Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
