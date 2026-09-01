import type { Metadata } from 'next';
import { Droplets, Footprints, Hotel, Waves } from 'lucide-react';
import {
  ContractorAddOns,
  IndustryCTA,
  IndustryCrossLinks,
  IndustryEvidenceLinks,
  IndustryFAQSection,
  IndustryHero,
  IndustryPageLayout,
  IndustryRecommendedCourses,
  IndustrySearchTopics,
  IndustryWhySection,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';
import { buildIndustryMetadata } from '@/lib/marketing/industry-metadata';
import {
  hospitalityRecommendedSlugs,
  hospitalitySearchTopics,
} from '@/lib/marketing/industry-track1-topics';
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'hospitality',
  'Hotel restoration training for Australian technicians',
  'IICRC CEC Accredited courses for crews servicing hotels and resorts. Water damage, odour control, carpet care and structural drying trained around occupied rooms and tight turnaround.',
  [
    'hotel water damage training Australia',
    'hotel odour control training',
    'hospitality restoration technician course',
    'hotel carpet cleaning training',
    'IICRC CEC hotel training',
  ]
);

const ACCENT_COLOR = '#ed9d24';

const topics = [
  { label: 'Water damage', color: '#ed9d24' },
  { label: 'Carpet care', color: '#d48b1e' },
  { label: 'Structural drying', color: '#bb7918' },
  { label: 'Odour control', color: '#a36712' },
];

const stats = [
  {
    value: '340,662',
    label: 'Rooms in accommodation properties with 10 or more rooms',
    sourceHref: 'https://www.tra.gov.au/en/tourism-industry-analysis/annual-benchmark-report',
    sourceLabel: 'Source: Tourism Research Australia',
  },
  { value: 'Occupied', label: 'Guest areas stay live' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const evidenceLinks = [
  {
    title: 'Australian Accommodation Monitor annual benchmark',
    publisher: 'Tourism Research Australia',
    context:
      'National accommodation supply and performance context for establishments with ten or more rooms.',
    href: 'https://www.tra.gov.au/en/tourism-industry-analysis/annual-benchmark-report',
  },
];

const faqs = [
  {
    question: 'Who is CARSI hospitality training for?',
    answer:
      'Hotel maintenance teams and the restoration subcontractors they call after a leak, odour complaint or wet carpet. Training is for technicians, not for front-of-house staff.',
  },
  {
    question: 'How do hotels handle water damage in guest rooms?',
    answer:
      'Speed and documentation matter more than a long classroom course. Introduction to Water Damage Restoration is IICRC CEC Accredited. It covers assessment, extraction thinking and records you can hand the duty manager and the insurer.',
  },
  {
    question: 'What carpet training helps in lobbies and corridors?',
    answer:
      'Introduction to Basic Carpet Cleaning and Drying covers residential, commercial and institutional settings. It is IICRC CEC Accredited and provides a foundation for planning work around a hotel access schedule.',
  },
  {
    question: 'How do you train for odours in Australian hotel rooms?',
    answer:
      'Open Introduction to Odour Control and Removal Techniques. It is IICRC CEC Accredited and covers source identification and removal methods. CARSI does not sell IICRC certification; CECs apply only where the IICRC has approved the course.',
  },
  {
    question: 'Can hospitality crews complete IICRC CEC training online?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced, suited to rotating hotel rosters. Staff can complete modules between shifts. Certificates and CEC records sit in the learner dashboard when you pass an approved course.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Rooms have to come back tonight',
    description:
      'A leaking guest bathroom cannot wait on a weekday classroom. Train extraction and drying so inventory returns before reviews pile up.',
    color: '#ed9d24',
  },
  {
    icon: Footprints,
    title: 'Public carpet never rests',
    description:
      'Lobbies and corridors carry continuous guest traffic. Cleaning and drying those surfaces requires staged access and a clear handover.',
    color: '#d48b1e',
  },
  {
    icon: Waves,
    title: 'Pools, spas and wet walls',
    description:
      'Overflow events wet neighbouring rooms. Applied structural drying and odour control keep the rest of the floor sellable.',
    color: '#bb7918',
  },
];

export default async function HospitalityIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Hotel}
        industryName="Hospitality & Tourism"
        accentColor={ACCENT_COLOR}
        headline="Keep occupied hotels"
        headlineAccent="sellable after a loss"
        description="IICRC CEC Accredited courses for hotel maintenance teams and the restoration crews they subcontract. Water damage, carpet care, structural drying and odour control, studied around rotating rosters."
        disciplines={topics}
        stats={stats}
      />

      <IndustryWhySection
        industryName="hospitality teams"
        headline="Built for"
        headlineAccent="guest-first turnaround"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustrySearchTopics
        eyebrow="What crews search"
        title="Four hotel problems, four live courses"
        body="Start with these IICRC CEC Accredited introductions for common hotel-site tasks. Property procedures, site induction and role-specific competency checks still apply."
        topics={hospitalitySearchTopics}
      />

      <IndustryRecommendedCourses
        industryName="Hospitality & Tourism"
        disciplineList="Water damage, carpet care, drying and odour control"
        courseSlugs={hospitalityRecommendedSlugs}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="hospitality" />

      <IndustryCrossLinks currentSlug="hospitality" />

      <IndustryEvidenceLinks links={evidenceLinks} />

      <IndustryFAQSection industryName="Hotels & Resorts" faqs={faqs} />

      <IndustryCTA
        subtitle="Hospitality training"
        title="Train the crew that protects inventory"
        price={industryBundlePriceLabel('hospitality')}
        description="Water damage, carpet care and odour control courses for hotel maintenance teams and subcontractors. Bulk licensing available for multi-property groups."
        ctaText="Request team pricing"
        ctaHref="/contact"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
