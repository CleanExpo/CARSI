import type { Metadata } from 'next';
import { Activity, Wind, Users } from 'lucide-react';
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
  title: 'IICRC Mould & Odour Training for Gyms & Fitness Centres | CARSI',
  description:
    'Protect your members and your reputation. IICRC AMRT, OCT, and CRT training for Australian gyms, pools, and fitness facilities. Online, self-paced, CEC approved.',
  keywords: [
    'gym mould training Australia',
    'fitness centre IICRC certification',
    'AMRT gym remediation',
    'OCT odour control gym',
    'mould liability fitness centre',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [amrtRes, octRes, crtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=OCT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const octData = octRes.ok ? await octRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(octData.items ?? []),
      ...(crtData.items ?? []),
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

const ACCENT_COLOR = '#43a047';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#43a047' },
  { code: 'OCT', label: 'Odour Control Technician', color: '#388e3c' },
  { code: 'CRT', label: 'Carpet Cleaning Technician', color: '#2e7d32' },
];

const stats = [
  { value: '6,000+', label: 'Fitness Facilities (AUS)' },
  { value: '5M+', label: 'Active Members' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'Why do gyms and fitness centres need mould remediation training?',
    answer:
      'Australian gyms generate consistently high humidity from sweat, showers, pools, and air conditioning — creating ideal conditions for mould growth in changerooms, wet decks, locker areas, and ceiling cavities. IICRC AMRT (Applied Microbial Remediation Technician) training teaches maintenance staff to identify mould species, assess moisture sources, and remediate using protocols that eliminate regrowth. Without trained staff, gyms typically experience recurring mould complaints that damage Google reviews, trigger council inspections, and expose operators to liability under Australian Consumer Law.',
  },
  {
    question: 'What causes mould in Australian fitness centres and how can it be prevented?',
    answer:
      'The primary mould drivers in Australian gyms are inadequate ventilation in wet areas, condensation on cold surfaces in air-conditioned spaces, water ingress around pool surrounds and wet decks, and porous materials (grout, carpet, ceiling tiles) that retain moisture. IICRC AMRT training covers moisture mapping, relative humidity monitoring, and containment procedures that allow maintenance staff to identify and address these conditions systematically before mould becomes visible — preventing the costly remediation and member complaints that follow.',
  },
  {
    question: 'How does IICRC training reduce liability for gym operators?',
    answer:
      "Gym operators have a duty of care to members under Australian Consumer Law and WHS legislation. Documented IICRC training demonstrates that maintenance staff were competent to identify and respond to mould and moisture hazards. In the event of a member health complaint or personal injury claim linked to indoor air quality, evidence of IICRC-certified staff and documented inspection protocols significantly strengthens the operator's defence and can reduce insurance premiums for premises liability coverage.",
  },
  {
    question: 'What is OCT certification and how does it help fitness facilities?',
    answer:
      'OCT (Odour Control Technician) is an IICRC certification covering the science of odour identification, source elimination, and odour counteractant application. For gyms and fitness centres, OCT training is particularly valuable for persistent locker room odours, post-flooding musty smells, and gym mat odour management. Unlike masking agents, IICRC OCT protocols address the biological and chemical source of odours — resolving complaints that damage member retention and online reputation.',
  },
];

const whyCards = [
  {
    icon: Activity,
    title: 'High-Humidity Mould Risk',
    description:
      'Changerooms, pool decks, and wet areas generate constant humidity. IICRC AMRT training gives maintenance staff the protocols to identify, contain, and remediate mould before it affects members.',
    color: '#43a047',
  },
  {
    icon: Wind,
    title: 'Odour Control (OCT)',
    description:
      'Persistent gym odours damage reviews and drive churn. IICRC OCT certification covers source-based odour elimination — not just masking — for locker rooms, wet areas, and equipment zones.',
    color: '#388e3c',
  },
  {
    icon: Users,
    title: 'Member Retention & Reputation',
    description:
      'Mould complaints and Google reviews mentioning cleanliness are the leading non-price drivers of gym cancellations. Documented IICRC training protects your reputation and your renewal rate.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function GymsFitnessIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Activity}
        industryName="Gyms & Fitness Centres"
        accentColor={ACCENT_COLOR}
        headline="Protect Your Members"
        headlineAccent="and Your Reputation"
        description="Australian gyms face constant mould and odour risk from high-humidity environments. IICRC AMRT and OCT certification gives your maintenance team the protocols to keep facilities clean, compliant, and member-ready."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Gyms & Fitness Facilities"
        headline="Built for"
        headlineAccent="facility excellence"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Gyms & Fitness"
        disciplineList="AMRT, OCT & CRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Gym & Fitness Training"
        title="Fitness Facility Bundle"
        price="$225"
        description="AMRT + OCT training for gym maintenance staff. Covers mould identification, remediation, and odour control. Online, self-paced — fits around your facility's operating hours."
        ctaText="Train Your Maintenance Staff"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
