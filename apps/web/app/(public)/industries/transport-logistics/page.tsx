import type { Metadata } from 'next';
import { Truck, Shield, Droplets, Wind } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Transport & Logistics IICRC Training | CARSI',
  description:
    'IICRC restoration training for Australian transport and logistics operations. WRT, CRT and OCT courses for vehicle interiors, warehouses, and loading dock maintenance.',
  keywords: [
    'transport IICRC training Australia',
    'logistics warehouse restoration',
    'WRT water damage warehouse',
    'CRT carpet cleaning vehicle interiors',
    'OCT odour control transport',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, crtRes, octRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=OCT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const octData = octRes.ok ? await octRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
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

const ACCENT_COLOR = '#1565C0';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#1565C0' },
  { code: 'CRT', label: 'Carpet & Upholstery Cleaning', color: '#0D47A1' },
  { code: 'OCT', label: 'Odour Control', color: '#1976D2' },
];

const stats = [
  { value: '50,000+', label: 'Transport Operators' },
  { value: 'Chain of', label: 'Responsibility' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'What IICRC training do Australian transport companies need?',
    answer:
      'Australian transport and logistics operators benefit from WRT (Water Damage Restoration) for warehouse flooding and roof leak response, CRT (Carpet & Upholstery Cleaning) for vehicle interior maintenance across fleets, and OCT (Odour Control) for managing contamination odours in enclosed cargo areas and passenger vehicles. These certifications support Chain of Responsibility compliance and fleet asset protection.',
  },
  {
    question: 'How does water damage training help warehouse operations?',
    answer:
      'Australian warehouses face water damage from storm events, roof failures, and sprinkler activations. IICRC WRT training equips logistics teams to respond immediately — extracting water, protecting inventory, and deploying drying equipment to minimise stock loss and downtime. Early response can reduce insurance claims and prevent secondary mould damage.',
  },
  {
    question: 'What is vehicle interior restoration training?',
    answer:
      'IICRC CRT (Carpet & Upholstery Cleaning) training covers fabric and surface restoration techniques for vehicle interiors including buses, coaches, trucks, and fleet cars. For transport operators, this means extending asset life, maintaining hygiene standards for passenger vehicles, and reducing outsourced detailing costs across large fleets.',
  },
  {
    question: 'Can transport and logistics staff train online around shift schedules?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and self-paced. Drivers and warehouse staff can complete modules during downtime, between shifts, or during scheduled stand-down periods. All courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Asset Protection',
    description:
      'Warehoused goods, fleet vehicles, and loading infrastructure represent significant capital. IICRC training ensures rapid, standards-based response to water damage and contamination events.',
    color: '#1565C0',
  },
  {
    icon: Droplets,
    title: 'Warehouse Flood Response',
    description:
      'Storm damage, sprinkler activations, and roof leaks can destroy warehoused inventory. WRT training equips your team to extract, dry, and restore — minimising stock loss.',
    color: '#0D47A1',
  },
  {
    icon: Wind,
    title: 'Fleet Interior Maintenance',
    description:
      'Vehicle interiors across bus, coach, and truck fleets require specialist cleaning. CRT and OCT certifications reduce outsourced costs and extend asset life.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function TransportLogisticsIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Truck}
        industryName="Transport & Logistics"
        accentColor={ACCENT_COLOR}
        headline="Transport & Logistics"
        headlineAccent="Restoration Training"
        description="IICRC restoration training for Australia's transport and logistics sector. Credentials for warehouse flood response, vehicle interior maintenance, and loading dock contamination control."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Transport & Logistics Operations"
        headline="Built for"
        headlineAccent="fleet and facility protection"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Transport & Logistics"
        disciplineList="WRT, CRT & OCT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Transport & Logistics Training"
        title="Logistics Restoration Bundle"
        price="$255"
        description="WRT + CRT + OCT training for transport and warehouse teams. Includes fleet maintenance and warehouse flood response protocols. Online, self-paced — fits around shift schedules."
        ctaText="Train Your Operations Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
