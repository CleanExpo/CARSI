import type { Metadata } from 'next';
import { Pickaxe, Shield, Droplets, Wind } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mining Site IICRC Restoration Training | CARSI',
  description:
    'WHS-compliant IICRC restoration training for Australian mining operations. WRT, AMRT, and ASD courses for water damage, mould, and structural drying on remote sites.',
  keywords: [
    'mining IICRC training Australia',
    'WHS compliance restoration',
    'WRT water damage mining',
    'AMRT mould remediation mining',
    'ASD structural drying',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, amrtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(amrtData.items ?? []),
      ...(asdData.items ?? []),
    ]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        combined.push(c);
      }
    }
    return combined;
  } catch {
    return [];
  }
}

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
  { value: 'IICRC', label: 'CEC Approved' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'WHS Compliance',
    description:
      'Mining operations have strict WHS obligations. IICRC training demonstrates due diligence for water damage and mould hazard identification on site.',
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
  const courses = await getIndustryCourses();

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

      <IndustryCourseSection
        industryName="Mining"
        disciplineList="WRT, AMRT & ASD"
        courses={courses}
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
