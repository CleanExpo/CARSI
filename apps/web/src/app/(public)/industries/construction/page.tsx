import type { Metadata } from 'next';
import { HardHat, Shield, Droplets } from 'lucide-react';
import { getBackendOrigin } from '@/lib/env/public-url';
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
  title: 'Construction IICRC Training | CARSI',
  description:
    'IICRC water damage and mould management training for Australian construction sites. WRT, ASD and AMRT courses supporting NCC compliance.',
  keywords: [
    'construction IICRC training',
    'building site mould management',
    'NCC compliance restoration',
    'construction water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [wrtRes, asdRes, amrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(asdData.items ?? []),
      ...(amrtData.items ?? []),
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
  const courses = await getIndustryCourses();

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

      <IndustryCourseSection
        industryName="Construction"
        disciplineList="WRT, ASD & AMRT"
        courses={courses}
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
