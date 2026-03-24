import type { Metadata } from 'next';
import { Building2, ShieldCheck, Layers } from 'lucide-react';
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
  title: 'Strata & Body Corporate IICRC Training | CARSI',
  description:
    'IICRC certification for strata managers and building managers. Protect common property with WRT, AMRT and ASD restoration credentials.',
  keywords: [
    'strata IICRC training',
    'body corporate restoration',
    'building manager certification',
    'strata water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [wrtRes, crtRes, amrtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
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

const ACCENT_COLOR = '#7c3aed';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#7c3aed' },
  { code: 'CRT', label: 'Carpet Repair & Reinstallation', color: '#6d28d9' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#5b21b6' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#4c1d95' },
];

const stats = [
  { value: '2.5M+', label: 'Strata Units' },
  { value: '537', label: 'Councils' },
  { value: 'IICRC', label: 'Certified' },
];

const whyCards = [
  {
    icon: Building2,
    title: 'Common Property Protection',
    description:
      'Basement flooding, roof membrane failures, and lift lobby maintenance demand certified restoration skills. Protect common property assets with IICRC-trained technicians.',
    color: '#7c3aed',
  },
  {
    icon: ShieldCheck,
    title: 'Personal Liability',
    description:
      'IICRC credentials protect building managers under the Strata Schemes Management Act. Demonstrate due diligence with verifiable restoration qualifications.',
    color: '#6d28d9',
  },
  {
    icon: Layers,
    title: 'Multi-Storey Expertise',
    description:
      'Specialised structural drying for high-rise residential and commercial buildings. Multi-level water migration requires advanced ASD techniques unique to strata environments.',
    color: '#5b21b6',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function StrataIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Building2}
        industryName="Strata & Body Corporate"
        accentColor={ACCENT_COLOR}
        headline="Strata & Body Corporate"
        headlineAccent="Restoration Training"
        description="Certified restoration training for strata managers, building managers, and body corporate committees. Protect common property assets with IICRC-accredited credentials."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Strata Managers"
        headline="Built for"
        headlineAccent="building professionals"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Strata"
        disciplineList="WRT, CRT, AMRT & ASD"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Strata & Body Corporate Training"
        title="Building Manager Bundle"
        price="$295"
        description="WRT + AMRT training for strata maintenance teams. Equip your building managers with the credentials to handle water damage and mould remediation across common property."
        ctaText="Enquire Now"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
