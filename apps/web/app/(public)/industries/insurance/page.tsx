import type { Metadata } from 'next';
import { FileCheck, Shield, TrendingDown } from 'lucide-react';
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
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, fsrtRes, amrtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=FSRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const fsrtData = fsrtRes.ok ? await fsrtRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(fsrtData.items ?? []),
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
  const courses = await getIndustryCourses();

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

      <IndustryCourseSection
        industryName="Insurance"
        disciplineList="WRT, FSRT, AMRT & ASD"
        courses={courses}
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
