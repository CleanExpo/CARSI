import type { Metadata } from 'next';
import { Tent, Droplets, Wind, Shield } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';
import { getBackendOrigin } from '@/lib/env/public-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC Mould & Restoration Training for Caravan Parks | CARSI Australia',
  description:
    'Protect guests and comply with state Fair Trading obligations. IICRC AMRT, CRT, and WRT training for Australian caravan parks and holiday accommodation. Online, CEC approved.',
  keywords: [
    'caravan park mould training Australia',
    'holiday park IICRC certification',
    'AMRT caravan park remediation',
    'cabin mould restoration training',
    'holiday accommodation hygiene compliance',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [amrtRes, crtRes, wrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(crtData.items ?? []),
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

const ACCENT_COLOR = '#26a69a';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#26a69a' },
  { code: 'CRT', label: 'Carpet Cleaning Technician', color: '#00897b' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#00796b' },
];

const stats = [
  { value: '2,800+', label: 'Caravan Parks (AUS)' },
  { value: '$8.6B', label: 'Industry Revenue' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'Why do caravan parks need mould remediation training?',
    answer:
      'Australian caravan parks face persistent mould risk due to seasonal occupancy patterns that leave cabins, ensuite blocks, and annexes unventilated for months. High humidity coastal and tropical locations, poor drainage around cabin pads, and ageing accommodation stock with limited vapour barriers compound the risk. IICRC AMRT (Applied Microbial Remediation Technician) training gives maintenance staff the ability to inspect cabins systematically before peak season, identify hidden mould in walls and subfloors, and remediate using protocols that prevent costly comeback situations and guest complaints.',
  },
  {
    question: 'What water damage risks do holiday parks face in Australia?',
    answer:
      'Caravan parks and holiday parks face water damage from cyclone and storm events in tropical regions, flooding in low-lying coastal and riverside parks, roof failures in ageing cabin stock, and plumbing failures in shared amenities blocks. IICRC WRT (Water Damage Restoration Technician) training equips park maintenance staff to respond immediately after these events — extracting water, placing drying equipment, and documenting damage for insurance claims — reducing the period of lost revenue from uninhabitable sites.',
  },
  {
    question: 'How does IICRC training protect caravan park guests and operators?',
    answer:
      'Caravan park operators owe guests a duty of care under Australian Consumer Law and state-specific tourism accommodation legislation. Providing accommodation with hidden mould or water damage exposes operators to Fair Trading complaints, negative TripAdvisor reviews, and potential personal injury claims if guests suffer health impacts. IICRC AMRT certification demonstrates that maintenance staff are competent to identify and remediate mould — providing a defensible record that standards-based inspections and remediation were performed, which is increasingly expected by park accreditation bodies.',
  },
  {
    question: 'What is CRT training and how does it help holiday accommodation?',
    answer:
      'CRT (Carpet Cleaning Technician) is an IICRC certification covering hot water extraction methodology, pre-treatment chemistry, soil removal, and moisture management in carpet systems. For caravan parks and holiday accommodation, CRT training enables in-house staff to maintain carpet in cabins and common areas to a standard that extends asset life and prevents odour complaints — avoiding the cost of outsourcing routine carpet maintenance to contractors. CRT certification also covers water damage response in carpeted areas, which is directly applicable to flood and plumbing failure events.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Seasonal Moisture & Mould',
    description:
      'Cabins left unoccupied during off-season develop mould in walls, subfloors, and ensuite blocks. IICRC AMRT training gives maintenance staff the protocols to inspect and remediate before peak season.',
    color: '#26a69a',
  },
  {
    icon: Wind,
    title: 'Storm & Flood Response',
    description:
      'Coastal and riverside parks face cyclone, storm surge, and flooding events. WRT training equips park staff to respond immediately, reducing uninhabitable site periods and expediting insurance claims.',
    color: '#00897b',
  },
  {
    icon: Shield,
    title: 'Guest Duty of Care',
    description:
      'Australian Consumer Law and state tourism accommodation legislation requires operators to provide habitable, hygienic accommodation. IICRC-certified staff demonstrate compliance and reduce Fair Trading liability.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function CaravanParksIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Tent}
        industryName="Caravan Parks & Holiday Accommodation"
        accentColor={ACCENT_COLOR}
        headline="Protect Guest Accommodation"
        headlineAccent="All Season Long"
        description="Australia's 2,800+ caravan parks face persistent mould, moisture, and storm damage risk. IICRC AMRT, CRT, and WRT certification gives park maintenance teams the protocols to inspect, remediate, and document — protecting guests, reputation, and revenue."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Caravan Parks & Holiday Parks"
        headline="Built for"
        headlineAccent="accommodation excellence"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Caravan Parks & Holiday Accommodation"
        disciplineList="AMRT, CRT & WRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Holiday Park Training"
        title="Holiday Park Bundle"
        price="$225"
        description="AMRT + CRT + WRT training for caravan park and holiday accommodation maintenance staff. Seasonal inspection protocols included. Online, self-paced."
        ctaText="Train Your Park Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
