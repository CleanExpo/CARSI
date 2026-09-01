import type { Metadata } from 'next';
import { Droplets, Shield, Stethoscope, Wind } from 'lucide-react';
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
  healthcareRecommendedSlugs,
  healthcareSearchTopics,
} from '@/lib/marketing/industry-track1-topics';
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'healthcare',
  'Healthcare restoration training for Australian hospital crews',
  'IICRC CEC Accredited courses for restoration technicians and subcontractors working hospitals and clinics. Mould, indoor air quality and water damage training that fits around call-outs.',
  [
    'healthcare mould training Australia',
    'hospital restoration technician course',
    'infection control restoration training',
    'indoor air quality healthcare course',
    'NSQHS environmental services training',
  ]
);

const ACCENT_COLOR = '#009688';

const topics = [
  { label: 'Mould and IAQ', color: '#009688' },
  { label: 'Water damage', color: '#00796b' },
  { label: 'Infection control', color: '#00695c' },
  { label: 'Clinical buildings', color: '#004d40' },
];

const stats = [
  {
    value: '701',
    label: 'Public hospitals, 2023 to 2024',
    sourceHref:
      'https://www.aihw.gov.au/getmedia/46e5576a-068b-4887-8db4-b22e9209668d/australia-s-hospitals-at-a-glance-2023-24.pdf',
    sourceLabel: 'Source: AIHW',
  },
  { value: 'NSQHS', label: 'Standard 3 context' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const evidenceLinks = [
  {
    title: 'Australia’s hospitals at a glance 2023 to 2024',
    publisher: 'Australian Institute of Health and Welfare',
    context: 'Current public-hospital count and Australian hospital system context.',
    href: 'https://www.aihw.gov.au/getmedia/46e5576a-068b-4887-8db4-b22e9209668d/australia-s-hospitals-at-a-glance-2023-24.pdf',
  },
  {
    title: 'NSQHS Preventing and Controlling Infections, Action 3.13',
    publisher: 'Australian Commission on Safety and Quality in Health Care',
    context:
      'Environmental-cleaning training, policies, auditing and improvement responsibilities, including relevant contractors.',
    href: 'https://www.safetyandquality.gov.au/standards/nsqhs-standards/preventing-and-controlling-infections-standard/infection-prevention-and-control-systems/action-313',
  },
];

const faqs = [
  {
    question: 'Who is CARSI healthcare training for?',
    answer:
      'Restoration technicians, subcontractors and environmental services staff who work hospitals, clinics and clinical plant rooms. The pages and courses are written for crews who service those sites, not for doctors or nurses.',
  },
  {
    question: 'Does CARSI deliver IICRC certification for hospital work?',
    answer:
      'No. CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page and recorded in your learner dashboard when you pass. IICRC certification itself is obtained only through IICRC-approved schools and examinations.',
  },
  {
    question: 'What mould training applies to healthcare facilities in Australia?',
    answer:
      'Start with Introduction to IAQ and Mould: Understanding Airborne Spread and Containment, then Introduction to Applied Microbial Remediation. Both are IICRC CEC Accredited. Hours are shown on each course page.',
  },
  {
    question: 'How does this training sit next to NSQHS Standard 3?',
    answer:
      'NSQHS Standard 3 is about preventing and controlling infections in health service organisations. CARSI courses do not replace hospital infection-control policy. They give visiting restoration crews documented training in mould, moisture and indoor air quality that site managers can file beside their own competency records.',
  },
  {
    question: 'Can hospital and contractor crews complete training around shift work?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced, designed to fit around 24/7 hospital shift patterns and after-hours call-outs. Certificates and CEC records sit in the learner dashboard when you pass an approved course.',
  },
  {
    question: 'Which courses should a crew open first for a hospital water loss?',
    answer:
      'Open Introduction to Water Damage in Commercial Buildings, then Introduction to Safety Procedures for Water Damage Work and Introduction to Improving Indoor Air Quality After Water Damage. CEC hours appear only on IICRC CEC Accredited titles.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Site managers want records',
    description:
      'A CARSI certificate can contribute to training records alongside site induction, role-specific competency checks, policies and performance monitoring.',
    color: '#009688',
  },
  {
    icon: Droplets,
    title: 'Water in clinical fabric',
    description:
      'Pipe bursts and leaks in plant rooms, basements and ward blocks need commercial drying thinking, not a domestic flood playbook.',
    color: '#00796b',
  },
  {
    icon: Wind,
    title: 'Mould and indoor air quality',
    description:
      'Immunocompromised patients raise the stakes on containment and handover. Train on airborne spread, monitoring and clean-air close-out.',
    color: '#ed9d24',
  },
];

export default async function HealthcareIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Stethoscope}
        industryName="Healthcare Industry"
        accentColor={ACCENT_COLOR}
        headline="Train for the hospital"
        headlineAccent="jobs you already win"
        description="For restoration crews and facility teams who work Australian hospitals and clinics. IICRC CEC Accredited courses in mould, indoor air quality and water damage, studied around the roster."
        disciplines={topics}
        stats={stats}
      />

      <IndustryWhySection
        industryName="healthcare facilities"
        headline="Built for"
        headlineAccent="patient-site work"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustrySearchTopics
        eyebrow="What crews search"
        title="Four hospital-site problems, four live courses"
        body="Start with these IICRC CEC Accredited introductions for common hospital-site tasks. They supplement, but do not replace, facility induction, infection-control policy or role-specific competency assessment."
        topics={healthcareSearchTopics}
      />

      <IndustryRecommendedCourses
        industryName="Healthcare Industry"
        disciplineList="Mould, indoor air quality and water damage"
        courseSlugs={healthcareRecommendedSlugs}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="healthcare" />

      <IndustryCrossLinks currentSlug="healthcare" />

      <IndustryEvidenceLinks links={evidenceLinks} />

      <IndustryFAQSection industryName="Healthcare" faqs={faqs} />

      <IndustryCTA
        subtitle="Healthcare facility training"
        title="Train the crew that walks on site"
        price={industryBundlePriceLabel('healthcare')}
        description="Mould, indoor air quality and water damage courses for technicians servicing hospitals. Ask about team seats if you send more than one person."
        ctaText="Talk to CARSI"
        ctaHref="/contact"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
