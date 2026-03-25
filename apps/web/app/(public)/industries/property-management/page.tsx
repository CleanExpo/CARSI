import type { Metadata } from 'next';
import { Building, Shield, Droplets, Scale } from 'lucide-react';
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
  title: 'Property Management IICRC Training | CARSI',
  description:
    'IICRC restoration training for Australian property and strata managers. Mould, water damage and carpet credentials for RTA compliance.',
  keywords: [
    'property management IICRC training',
    'strata manager restoration course',
    'RTA mould compliance',
    'property manager water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [amrtRes, wrtRes, crtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
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

const ACCENT_COLOR = '#673ab7';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#673ab7' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#512da8' },
  { code: 'CRT', label: 'Carpet Repair Technology', color: '#4527a0' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#311b92' },
];

const stats = [
  { value: '12,000+', label: 'Property Agencies' },
  { value: 'RTA', label: 'Compliance' },
  { value: 'IICRC', label: 'CEC Approved' },
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
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Building}
        industryName="Property Management"
        accentColor={ACCENT_COLOR}
        headline="Property Management"
        headlineAccent="Restoration Training"
        description="Residential Tenancies Act compliance training for property managers and strata managers. IICRC credentials reduce tribunal disputes and differentiate your agency in competitive markets."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Property Managers"
        headline="Built for"
        headlineAccent="tribunal defence"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Property Management"
        disciplineList="AMRT, WRT, CRT & ASD"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Property Management Training"
        title="Property Bundle"
        price="$195"
        description="AMRT Mould Basics + WRT Water Damage + CRT Carpet Assessment. Agency bulk pricing available for 10+ property managers."
        ctaText="Get Certified"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
