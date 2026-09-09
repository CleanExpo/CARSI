import type { Metadata } from 'next';
import { Briefcase, ClipboardCheck, Users, Shield } from 'lucide-react';
import {
  IndustryCTA,
  IndustryCrossLinks,
  IndustryEvidenceLinks,
  IndustryFAQSection,
  IndustryHero,
  IndustryPageLayout,
  IndustrySearchTopics,
  IndustryWhySection,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';
import { buildIndustryMetadata } from '@/lib/marketing/industry-metadata';
import {
  facilityManagementFaqs,
  facilityManagementSearchTopics,
} from '@/lib/marketing/industry-track2';
import { TEAM_TIERS } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'facility-management',
  'Facility management training for Australian hospital, aged-care and hotel crews',
  'Team seats, completion records and IICRC CEC Accredited courses for the crews who work healthcare, aged-care and hospitality contracts. For contract managers and technicians, not a named-client list.',
  [
    'facility management restoration training Australia',
    'hospital contractor training records',
    'aged care crew CEC tracking',
    'hotel restoration team seats',
  ]
);

const ACCENT_COLOR = '#0f5fa8';

const topics = [
  { label: 'Team records', color: '#0f5fa8' },
  { label: 'CEC tracking', color: '#146fc2' },
  { label: 'Hospital sites', color: '#009688' },
  { label: 'Hotel crews', color: '#8e44ad' },
];

const starter = TEAM_TIERS.find((tier) => tier.id === 'starter');

const stats = [
  {
    value: starter?.seatsIncluded != null ? String(starter.seatsIncluded) : '5',
    label: 'Seats in the published Starter team price',
  },
  { value: 'IICRC CEC', label: 'Hours only on approved courses' },
  { value: '3', label: 'Track 1 site pathways linked below' },
];

const evidenceLinks = [
  {
    title: 'Australia’s hospitals at a glance 2023 to 2024',
    publisher: 'Australian Institute of Health and Welfare',
    context: 'Australian public-hospital system context for contractor site work.',
    href: 'https://www.aihw.gov.au/getmedia/46e5576a-068b-4887-8db4-b22e9209668d/australia-s-hospitals-at-a-glance-2023-24.pdf',
  },
  {
    title: 'NSQHS Preventing and Controlling Infections, Action 3.13',
    publisher: 'Australian Commission on Safety and Quality in Health Care',
    context:
      'Environmental-cleaning training, policies, auditing and improvement, including relevant contractors.',
    href: 'https://www.safetyandquality.gov.au/standards/nsqhs-standards/preventing-and-controlling-infections-standard/infection-prevention-and-control-systems/action-313',
  },
  {
    title: 'Providers of aged care',
    publisher: 'Australian Institute of Health and Welfare GEN',
    context: 'Current counts for Australian residential aged-care services and providers.',
    href: 'https://www.gen-agedcaredata.gov.au/topics/providers-of-aged-care',
  },
];

const whyCards = [
  {
    icon: ClipboardCheck,
    title: 'Sites ask for records',
    description:
      'A CARSI completion can sit beside site induction. It does not replace NSQHS, aged-care or hotel policy.',
    color: '#0f5fa8',
  },
  {
    icon: Users,
    title: 'More than one learner',
    description:
      'Published team prices cover a set number of seats. Contact CARSI to start a crew rather than buying one course at a time.',
    color: '#146fc2',
  },
  {
    icon: Shield,
    title: 'CEC hours stay fail-closed',
    description:
      'The dashboard records IICRC CEC hours only for courses the IICRC has approved. Unapproved titles show no CEC claim.',
    color: '#009688',
  },
];

export default async function FacilityManagementIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={facilityManagementFaqs} />
      <IndustryHero
        icon={Briefcase}
        industryName="Facility management"
        accentColor={ACCENT_COLOR}
        headline="Train the crew"
        headlineAccent="your contract already uses"
        description="For operations leads and the technicians who walk onto Australian hospitals, aged-care homes and hotels. IICRC CEC Accredited courses, team records and proof you can file. We do not sell named global facility-management partnerships."
        disciplines={topics}
        stats={stats}
      />

      <IndustryWhySection
        industryName="facility contracts"
        headline="Built for"
        headlineAccent="the people on site"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustrySearchTopics
        eyebrow="What managers and crews need"
        title="Three site types, one training record"
        body="Start with the live Track 1 course paths, then collect completions. These courses supplement site induction. They do not replace it."
        topics={facilityManagementSearchTopics}
      />

      <IndustryCrossLinks currentSlug="healthcare" />

      <IndustryEvidenceLinks links={evidenceLinks} />

      <IndustryFAQSection industryName="Facility management" faqs={facilityManagementFaqs} />

      <IndustryCTA
        subtitle="Facility management training"
        title="Start the crew from published team prices"
        price={starter?.priceLabel ?? '$299 / year'}
        description="Starter, Growth and Full library prices are on the pricing page. Contact CARSI to start seats. Technicians can still buy a single IICRC CEC Accredited course."
        ctaText="Talk to CARSI"
        ctaHref="/contact"
        secondaryHref="/pricing"
        secondaryText="See team prices"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
