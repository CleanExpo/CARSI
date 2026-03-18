import type { Metadata } from 'next';
import { Server, Shield, Droplets, Flame } from 'lucide-react';
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
  title: 'Data Centre IICRC Training | CARSI',
  description:
    'IICRC restoration training for Australian data centres. WRT, ASD and FSRT courses for water damage prevention, climate control recovery, and fire suppression system response.',
  keywords: [
    'data centre IICRC training Australia',
    'water damage prevention data centre',
    'WRT restoration data centre',
    'ASD structural drying server room',
    'FSRT fire suppression data centre',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, asdRes, fsrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=FSRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };
    const fsrtData = fsrtRes.ok ? await fsrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
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

const ACCENT_COLOR = '#6A1B9A';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#6A1B9A' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#4A148C' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#7B1FA2' },
];

const stats = [
  { value: '300+', label: 'Data Centres' },
  { value: 'Uptime', label: 'Institute Tier III+' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'What IICRC certifications do Australian data centres need?',
    answer:
      'Australian data centres benefit from WRT (Water Damage Restoration) for CRAC unit leaks, pipe bursts, and cooling system failures, ASD (Applied Structural Drying) for rapid moisture removal to protect server infrastructure, and FSRT (Fire & Smoke Restoration) for post-suppression system cleanup. These certifications support Uptime Institute tier compliance and business continuity planning.',
  },
  {
    question: 'How does water damage training protect data centre infrastructure?',
    answer:
      'Water is the leading cause of unplanned data centre outages after power failures. IICRC WRT training equips facility teams to respond within minutes to CRAC unit leaks, overhead pipe bursts, or cooling system failures — containing water spread, protecting rack infrastructure, and deploying extraction equipment before corrosion or short circuits occur.',
  },
  {
    question: 'What happens after a fire suppression system activates in a data centre?',
    answer:
      'After clean agent or water mist suppression activation, residue and moisture must be professionally removed to prevent corrosion and equipment failure. IICRC FSRT training covers post-suppression assessment, residue cleanup, and air quality restoration. Combined with ASD for moisture management, this ensures rapid return to operational status.',
  },
  {
    question: 'Can data centre operations staff complete IICRC training without downtime?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and self-paced. NOC and facility staff can complete modules during scheduled maintenance windows or between shifts. All courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Uptime Protection',
    description:
      'Every minute of downtime costs thousands. IICRC training ensures your facility team can respond to water and fire events within minutes, protecting SLA commitments and Uptime Institute tier compliance.',
    color: '#6A1B9A',
  },
  {
    icon: Droplets,
    title: 'Water Damage Prevention',
    description:
      'CRAC unit leaks, overhead pipe bursts, and cooling failures are the leading non-power cause of data centre outages. WRT and ASD training equips teams to contain and dry before equipment damage occurs.',
    color: '#4A148C',
  },
  {
    icon: Flame,
    title: 'Fire Suppression Recovery',
    description:
      'Post-suppression cleanup requires specialist knowledge. FSRT certification covers residue removal, air quality restoration, and equipment assessment after clean agent or water mist activation.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function DataCentresIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Server}
        industryName="Data Centres"
        accentColor={ACCENT_COLOR}
        headline="Data Centre"
        headlineAccent="Protection Training"
        description="IICRC restoration training for Australia's 300+ data centres. Credentials for water damage prevention, climate control recovery, and fire suppression system response — protecting uptime SLAs and infrastructure investment."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Data Centre Operations"
        headline="Built for"
        headlineAccent="uptime protection"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Data Centres"
        disciplineList="WRT, ASD & FSRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Data Centre Training"
        title="Data Centre Protection Bundle"
        price="$285"
        description="WRT + ASD + FSRT training for data centre facility teams. Includes cooling system failure response and post-suppression cleanup protocols. Online, self-paced — fits around maintenance windows."
        ctaText="Protect Your Infrastructure"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
