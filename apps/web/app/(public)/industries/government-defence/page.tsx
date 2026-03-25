import type { Metadata } from 'next';
import { Building2, Shield, Flame } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Government & Defence IICRC Training | CARSI',
  description:
    'WHS-compliant IICRC training for Australian councils, agencies and defence facilities. AMRT, WRT, ASD and FSRT courses for AusTender compliance.',
  keywords: [
    'government IICRC training',
    'defence facility restoration',
    'AusTender compliance',
    'WHS mould training',
    'heritage building restoration',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [amrtRes, wrtRes, asdRes, fsrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=FSRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };
    const fsrtData = fsrtRes.ok ? await fsrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(wrtData.items ?? []),
      ...(asdData.items ?? []),
      ...(fsrtData.items ?? []),
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

const ACCENT_COLOR = '#2196f3';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#2196f3' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#1976d2' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#1565c0' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#0d47a1' },
];

const stats = [
  { value: '537', label: 'Local Councils' },
  { value: 'WHS', label: 'Act Compliance' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'Is IICRC certification required for AusTender procurement panels?',
    answer:
      'While not universally mandated, many Commonwealth and state government procurement panels list IICRC certification as a pre-qualification criterion for restoration and remediation contracts. Verifiable IICRC credentials satisfy audit requirements and demonstrate technical competency in tender submissions through AusTender and state equivalents.',
  },
  {
    question: 'What WHS obligations apply to mould in government buildings?',
    answer:
      'Under Australian WHS legislation, government employers have a duty of care to identify and manage mould and moisture hazards. IICRC AMRT (Applied Microbial Remediation) training provides facility teams with the skills to conduct mould assessments, implement containment protocols, and document remediation — demonstrating WHS due diligence to regulators.',
  },
  {
    question: 'How do you restore heritage-listed government buildings after water damage?',
    answer:
      'Heritage-listed buildings require specialised structural drying techniques that avoid damaging original materials. IICRC ASD (Applied Structural Drying) certification trains government maintenance teams in low-impact drying methods, moisture monitoring, and documentation protocols that satisfy both heritage conservation requirements and WHS compliance.',
  },
  {
    question: 'Can government facility staff complete IICRC training online?',
    answer:
      'Yes. CARSI delivers IICRC CEC-approved courses online and self-paced, suitable for council and agency staff across metropolitan and regional Australia. Courses issue verifiable digital credentials that satisfy audit and procurement compliance requirements. Bulk seat licensing is available for departments and councils.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'WHS Due Diligence',
    description:
      'Government employers have strict WHS duties. IICRC training demonstrates due diligence for mould and water hazard identification.',
    color: '#2196f3',
  },
  {
    icon: Building2,
    title: 'AusTender Compliance',
    description:
      'IICRC certification as a pre-qualification criterion for government procurement panels. Verifiable credentials satisfy Commonwealth audit requirements.',
    color: '#1976d2',
  },
  {
    icon: Flame,
    title: 'Heritage Buildings',
    description:
      'Applied structural drying for heritage-listed government buildings. Fire and smoke response training for emergency teams.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function GovernmentDefenceIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Building2}
        industryName="Government & Defence"
        accentColor={ACCENT_COLOR}
        headline="Government Facility"
        headlineAccent="Restoration Training"
        description="WHS-compliant training for councils, state agencies, and defence facilities. IICRC credentials satisfy AusTender pre-qualification and Commonwealth audit requirements."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Government Agencies"
        headline="Built for"
        headlineAccent="public accountability"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Government"
        disciplineList="AMRT, WRT, ASD & FSRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Government Facility Training"
        title="Facility Restoration Bundle"
        price="$295"
        description="WRT + AMRT + ASD training for government facility teams. Bulk 10+ seat licensing available for councils and departments."
        ctaText="Request Bulk Pricing"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
