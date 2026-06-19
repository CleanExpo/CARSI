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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mining Site IICRC CEC Restoration Training | CARSI',
  description:
    'WHS-compliant IICRC restoration training for Australian mining operations. WRT, AMRT, and ASD courses for water damage, mould, and structural drying on remote sites.',
  keywords: [
    'mining IICRC CEC training Australia',
    'WHS compliance restoration',
    'WRT water damage mining',
    'AMRT mould remediation mining',
    'ASD structural drying',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ed9d24';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#ed9d24' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#d4891e' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#c77b1a' },
];

const stats = [
  { value: '400+', label: 'Mining Operations' },
  { value: 'WHS', label: 'Act Compliance' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'WHS Compliance',
    description:
      'Mining operations have strict WHS obligations. IICRC CEC training demonstrates due diligence for water damage and mould hazard identification on site.',
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
        description="WHS-compliant restoration training for mining operations. IICRC credentials for water damage, mould remediation, and structural drying in remote site environments."
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
        disciplineList="WRT, AMRT & ASD"
        disciplines={['WRT', 'AMRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Mining Site Training"
        title="Mining Restoration Bundle"
        price="$245"
        description="WRT + AMRT + ASD training for mining site teams. Bulk licensing available for camp accommodation managers."
        ctaText="Train Your Site Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
