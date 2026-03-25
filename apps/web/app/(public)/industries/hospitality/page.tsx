import type { Metadata } from 'next';
import { Hotel, Droplets, Footprints, Waves } from 'lucide-react';
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
  title: 'Hospitality IICRC Training | CARSI',
  description:
    'IICRC-certified training for Australian hotels and resorts. WRT, CRT, ASD and OCT courses for water damage, carpet care, structural drying and odour control.',
  keywords: [
    'hospitality IICRC training',
    'hotel restoration training',
    'hotel water damage',
    'carpet repair certification',
    'odour control training',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, crtRes, asdRes, octRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=OCT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };
    const octData = octRes.ok ? await octRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
      ...(asdData.items ?? []),
      ...(octData.items ?? []),
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
  { code: 'CRT', label: 'Carpet Repair & Reinstallation', color: '#d48b1e' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#bb7918' },
  { code: 'OCT', label: 'Odour Control', color: '#a36712' },
];

const stats = [
  { value: '10,000+', label: 'Hotels' },
  { value: '24/7', label: 'Response' },
  { value: 'IICRC', label: 'Certified' },
];

const faqs = [
  {
    question: 'How do hotels handle water damage in guest rooms?',
    answer:
      'Hotels require rapid water damage response to minimise room downtime and protect guest reviews. IICRC WRT (Water Damage Restoration) training teaches maintenance teams to assess damage categories, deploy extraction equipment, and document the restoration process for insurance claims — all within the tight turnaround hospitality demands.',
  },
  {
    question: 'What carpet maintenance training do hotel staff need?',
    answer:
      'Hotel maintenance teams benefit from IICRC CRT (Carpet Repair & Reinstallation) certification for lobbies, corridors, and conference rooms that see thousands of daily footfalls. Training covers spot dyeing, re-stretching, seam repair, and pattern matching — skills that extend carpet lifespan and reduce replacement costs across large properties.',
  },
  {
    question: 'How do you remove odours from hotel rooms in Australia?',
    answer:
      'IICRC OCT (Odour Control) certification trains hotel staff in source identification, thermal fogging, ozone treatment, and hydroxyl generation for smoke, pet, and biological odours. Proper odour remediation prevents negative guest reviews and avoids taking rooms offline unnecessarily.',
  },
  {
    question: 'Can hospitality teams complete IICRC training online?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and self-paced, ideal for hotel teams working rotating rosters. Staff can complete modules between shifts. Courses issue verifiable digital credentials and count toward IICRC Continuing Education Credits.',
  },
  {
    question: 'What is structural drying training for hotel pool and spa areas?',
    answer:
      'IICRC ASD (Applied Structural Drying) training covers moisture mapping, psychrometric calculations, and equipment placement for pool overflow and spa water incidents. For hospitality properties, this prevents secondary damage to surrounding guest rooms, change rooms, and below-grade structures.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Guest Experience',
    description:
      'Rapid water damage response minimises room downtime and protects guest satisfaction. IICRC-trained teams restore affected areas before reviews are impacted.',
    color: '#ed9d24',
  },
  {
    icon: Footprints,
    title: 'High-Traffic Areas',
    description:
      'Professional carpet maintenance for lobbies, corridors, and conference rooms. CRT-certified technicians extend carpet lifespan in areas with thousands of daily footfalls.',
    color: '#d48b1e',
  },
  {
    icon: Waves,
    title: 'Pool & Spa Areas',
    description:
      'ASD training for pool overflow and spa water incidents. OCT certification for odour control in enclosed wet areas, change rooms, and guest bathrooms.',
    color: '#bb7918',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function HospitalityIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Hotel}
        industryName="Hospitality & Tourism"
        accentColor={ACCENT_COLOR}
        headline="Hospitality"
        headlineAccent="Restoration Training"
        description="Keep guests comfortable and properties protected. IICRC-certified training for hotel maintenance teams covering water damage, carpet care, structural drying, and odour control."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Hospitality Teams"
        headline="Built for"
        headlineAccent="guest-first operations"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Hospitality"
        disciplineList="WRT, CRT, ASD & OCT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Hospitality Training Bundle"
        title="Hotel Maintenance Bundle"
        price="$295"
        description="WRT + CRT + OCT training for hotel maintenance teams. Bulk licensing available for hotel chains and resort groups."
        ctaText="Request Bundle Pricing"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
