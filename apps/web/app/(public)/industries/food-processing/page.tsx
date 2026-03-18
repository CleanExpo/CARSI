import type { Metadata } from 'next';
import { Factory, Shield, Droplets, SprayCan } from 'lucide-react';
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
  title: 'Food Processing Facility IICRC Training | CARSI',
  description:
    'HACCP-aligned IICRC training for Australian food processing facilities. AMRT, OCT and CCT courses supporting hygiene compliance, cold storage maintenance, and contamination prevention.',
  keywords: [
    'food processing IICRC training Australia',
    'HACCP compliance restoration',
    'AMRT mould remediation food facility',
    'OCT odour control food processing',
    'CCT carpet cleaning food factory',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [amrtRes, octRes, cctRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=OCT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CCT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const octData = octRes.ok ? await octRes.json() : { items: [] };
    const cctData = cctRes.ok ? await cctRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(octData.items ?? []),
      ...(cctData.items ?? []),
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

const ACCENT_COLOR = '#2E7D32';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#2E7D32' },
  { code: 'OCT', label: 'Odour Control', color: '#1B5E20' },
  { code: 'CCT', label: 'Carpet Cleaning', color: '#388E3C' },
];

const stats = [
  { value: '6,000+', label: 'Food Facilities' },
  { value: 'HACCP', label: 'Aligned' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'What IICRC certifications do Australian food processing facilities need?',
    answer:
      'Australian food processing facilities benefit from AMRT (Applied Microbial Remediation) for mould and bacterial contamination control in cold stores and processing areas, OCT (Odour Control) for managing organic odours in production environments, and CCT (Carpet Cleaning) for maintaining hygiene in administrative and visitor areas. These certifications complement HACCP and FSANZ food safety requirements.',
  },
  {
    question: 'How does IICRC training support HACCP compliance in food facilities?',
    answer:
      'HACCP plans require demonstrated competency in contamination prevention. IICRC AMRT certification provides verifiable evidence that maintenance teams can identify and remediate microbial hazards including mould, bacteria, and biofilms in cold storage rooms, processing lines, and drainage systems — all critical control points in a HACCP plan.',
  },
  {
    question: 'What is mould remediation training for cold storage facilities?',
    answer:
      'IICRC AMRT training covers identification and remediation of mould and microbial growth in temperature-controlled environments. For Australian food facilities, this is critical in cold rooms, blast chillers, loading docks, and drainage channels where condensation creates ideal conditions for microbial contamination that can affect product safety.',
  },
  {
    question: 'Can food processing staff complete IICRC training while maintaining shift patterns?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and self-paced. Staff can complete modules around production schedules and shift rotations. All courses count toward IICRC Continuing Education Credits (CECs) and issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'HACCP Compliance',
    description:
      'IICRC training supports HACCP critical control points for microbial contamination prevention. Demonstrate staff competency during food safety audits.',
    color: '#2E7D32',
  },
  {
    icon: Droplets,
    title: 'Cold Storage Hygiene',
    description:
      'Condensation, drainage issues, and temperature fluctuations in cold rooms create ideal conditions for mould. AMRT training equips teams to prevent and remediate contamination.',
    color: '#1B5E20',
  },
  {
    icon: SprayCan,
    title: 'Odour & Surface Control',
    description:
      'Organic odours and surface contamination in processing areas require specialist remediation. OCT and CCT certifications provide standards-based approaches.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function FoodProcessingIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Factory}
        industryName="Food Processing Industry"
        accentColor={ACCENT_COLOR}
        headline="Food Processing"
        headlineAccent="Hygiene Training"
        description="HACCP-aligned restoration training for Australia's 6,000+ food processing facilities. IICRC credentials for microbial remediation, odour control, and hygiene compliance in production environments."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Food Processing Facilities"
        headline="Built for"
        headlineAccent="food safety compliance"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Food Processing"
        disciplineList="AMRT, OCT & CCT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Food Processing Training"
        title="Food Safety Bundle"
        price="$275"
        description="AMRT + OCT + CCT training for food processing teams. Includes cold storage mould prevention protocols. Online, self-paced — fits around production schedules."
        ctaText="Train Your Facility Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
