import type { Metadata } from 'next';
import { Baby, Shield, Droplets } from 'lucide-react';
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
  title: 'Childcare IICRC Training | CARSI',
  description:
    'IICRC certification for childcare centre maintenance. AMRT and CRT training supporting NQF compliance across Australian early learning centres.',
  keywords: [
    'childcare IICRC training',
    'early learning centre cleaning',
    'NQF compliance training',
    'childcare mould remediation Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [crtRes, amrtRes, wrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(crtData.items ?? []),
      ...(amrtData.items ?? []),
      ...(wrtData.items ?? []),
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

const ACCENT_COLOR = '#e91e63';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#e91e63' },
  { code: 'CRT', label: 'Carpet Restoration', color: '#9c27b0' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#673ab7' },
];

const stats = [
  { value: '16,000+', label: 'Approved Centres' },
  { value: 'NQF', label: 'Quality Framework' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const whyCards = [
  {
    icon: Shield,
    title: 'NQF Quality Area 2',
    description:
      'IICRC training directly supports Health & Safety requirements under the National Quality Standard. Aim for "Exceeding" at your next ACECQA assessment.',
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
  const courses = await getIndustryCourses();

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

      <IndustryCourseSection
        industryName="Childcare"
        disciplineList="AMRT, CRT & WRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Childcare Compliance Training"
        title="Childcare Compliance Bundle"
        price="$195"
        description="AMRT Infection Control + CRT Carpet Basics + WRT Fundamentals. Minimal roster disruption — 2-4 hour self-paced modules."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
