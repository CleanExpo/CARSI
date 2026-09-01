import type { Metadata } from 'next';
import { Bug, HeartPulse, Shield } from 'lucide-react';
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
  agedCareRecommendedSlugs,
  agedCareSearchTopics,
} from '@/lib/marketing/industry-track1-topics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'aged-care',
  'Aged care restoration training for Australian technicians',
  'IICRC CEC Accredited courses for crews servicing residential aged care. Mould, indoor air quality, PPE and carpet hygiene training that fits around occupied wings and shift work.',
  [
    'aged care restoration technician course',
    'aged care mould training Australia',
    'aged care infection control cleaning',
    'carpet hygiene aged care training',
    'IICRC CEC aged care',
  ]
);

const ACCENT_COLOR = '#27ae60';

const topics = [
  { label: 'Mould and IAQ', color: '#27ae60' },
  { label: 'Carpet hygiene', color: '#26c4a0' },
  { label: 'PPE on site', color: '#1e8449' },
];

const stats = [
  {
    value: '2,590',
    label: 'Residential care services, June 2025',
    sourceHref: 'https://www.gen-agedcaredata.gov.au/topics/providers-of-aged-care',
    sourceLabel: 'Source: AIHW GEN',
  },
  { value: 'Occupied', label: 'Wings stay live' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const evidenceLinks = [
  {
    title: 'Providers of aged care',
    publisher: 'AIHW GEN Aged Care Data',
    context: 'Current counts for Australian residential aged-care services and providers.',
    href: 'https://www.gen-agedcaredata.gov.au/topics/providers-of-aged-care',
  },
  {
    title: 'Strengthened Quality Standard 4: The environment',
    publisher: 'Aged Care Quality and Safety Commission',
    context:
      'Current expectations for a safe, supportive service environment, including infection prevention controls.',
    href: 'https://www.agedcarequality.gov.au/strengthened-quality-standards/environment',
  },
  {
    title: 'Human resource management',
    publisher: 'Aged Care Quality and Safety Commission',
    context:
      'Training records sit alongside induction, role-specific competency assessment and ongoing performance monitoring.',
    href: 'https://www.agedcarequality.gov.au/strengthened-quality-standards/organisation/human-resource-management',
  },
];

const faqs = [
  {
    question: 'Who should take CARSI aged care training?',
    answer:
      'Restoration and cleaning technicians who service residential aged care, plus in-house cleaning and maintenance staff. The courses are not a nursing or personal-care qualification.',
  },
  {
    question: 'Does this replace Aged Care Quality Standards training?',
    answer:
      'No. Providers still need role-specific induction, competency assessment, policies and performance monitoring. A CARSI certificate can contribute to the provider training record, but it does not prove compliance by itself.',
  },
  {
    question: 'How do IICRC CECs work on these courses?',
    answer:
      'CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page and recorded in your learner dashboard when you pass. Unapproved titles show no CEC hours.',
  },
  {
    question: 'What should I study first for mould in a care home?',
    answer:
      'Open Introduction to IAQ and Mould: Understanding Airborne Spread and Containment, then Introduction to Monitoring Air Quality on the Job Site. Work around residents rather than treating the building as vacant. CEC hours are shown on each IICRC CEC Accredited course page.',
  },
  {
    question: 'Can staff complete training around 24/7 care rosters?',
    answer:
      'Yes. Courses are online and self-paced. Complete modules between shifts without taking a wing offline for a classroom day.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Residents stay in the building',
    description:
      'Containment, PPE and controlled disruption matter when residents remain nearby. Train for occupied care, not vacant houses.',
    color: '#27ae60',
  },
  {
    icon: Bug,
    title: 'Mould and indoor air quality',
    description:
      'Bathrooms, laundries and older fabric hold moisture. Crews need airborne-spread and monitoring skills they can document for the provider.',
    color: '#26c4a0',
  },
  {
    icon: HeartPulse,
    title: 'Carpet and soft furnishings',
    description:
      'Corridors and dining rooms take daily traffic. Cleaning and drying those surfaces is part of the same site visit as a water loss.',
    color: '#ed9d24',
  },
];

export default async function AgedCareIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={HeartPulse}
        industryName="Aged Care Industry"
        accentColor={ACCENT_COLOR}
        headline="Work aged care sites"
        headlineAccent="without guessing the rules"
        description="IICRC CEC Accredited courses for technicians who service residential aged care. Mould, indoor air quality, PPE and carpet hygiene, studied around occupied wings and shift work."
        disciplines={topics}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Aged Care Providers"
        headline="Built for"
        headlineAccent="resident-occupied work"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustrySearchTopics
        eyebrow="What crews search"
        title="Four aged-care problems, four live courses"
        body="Start with these IICRC CEC Accredited introductions for common care-site tasks. They supplement, but do not replace, provider induction, role-specific competency checks or infection-control procedures."
        topics={agedCareSearchTopics}
      />

      <IndustryRecommendedCourses
        industryName="Aged Care Industry"
        disciplineList="Mould, air quality, PPE and carpet hygiene"
        courseSlugs={agedCareRecommendedSlugs}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="aged-care" />

      <IndustryCrossLinks currentSlug="aged-care" />

      <IndustryEvidenceLinks links={evidenceLinks} />

      <IndustryFAQSection industryName="Aged care" faqs={faqs} />

      <IndustryCTA
        subtitle="Aged care training"
        title="Train the crew the home lets through the door"
        price="From $29"
        description="Mould, air quality and carpet courses for technicians servicing aged care. Ask about team seats if a contractor or provider is training more than one person."
        ctaText="Talk to CARSI"
        ctaHref="/contact"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
