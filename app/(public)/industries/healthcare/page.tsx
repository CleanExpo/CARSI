import type { Metadata } from 'next';
import { Stethoscope, Shield, Droplets, Flame } from 'lucide-react';
import {
  ContractorAddOns,
  IndustryCTA,
  IndustryCrossLinks,
  IndustryFAQSection,
  IndustryHero,
  IndustryPageLayout,
  IndustryRecommendedCourses,
  IndustryWhySection,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';
import { buildIndustryMetadata } from '@/lib/marketing/industry-metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'healthcare',
  'Healthcare IICRC CEC Training | CARSI',
  'NSQHS-aligned IICRC CEC training for Australian hospitals. AMRT, WRT, FSRT and ASD courses supporting Standard 3 compliance and JCI accreditation.',
  [
    'healthcare IICRC CEC training',
    'hospital restoration training',
    'NSQHS Standard 3',
    'AMRT certification',
    'medical facility cleaning',
  ]
);

const ACCENT_COLOR = '#009688';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#009688' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#00796b' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#00695c' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#004d40' },
];

const stats = [
  { value: '2,050+', label: 'Hospitals' },
  { value: 'NSQHS', label: 'Standard 3' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What IICRC certifications do Australian hospitals need?',
    answer:
      'Australian healthcare facilities typically require AMRT (Applied Microbial Remediation) for mould and infection control, WRT (Water Damage Restoration) for pipe bursts and flooding in clinical areas, and FSRT (Fire & Smoke Restoration) for emergency response. These certifications support NSQHS Standard 3 compliance and JCI accreditation audits.',
  },
  {
    question: 'How does IICRC CEC training support NSQHS Standard 3 compliance?',
    answer:
      'NSQHS Standard 3 (Preventing and Controlling Infections) requires healthcare facilities to demonstrate staff competency in infection prevention. IICRC AMRT certification provides verifiable evidence that environmental services teams are trained in mould identification, remediation protocols, and contamination prevention — all directly relevant to Standard 3 audit requirements.',
  },
  {
    question: 'Can hospital maintenance staff complete IICRC CEC training online?',
    answer:
      'Yes. CARSI offers IICRC CEC accredited courses online and self-paced, designed to fit around 24/7 hospital shift patterns. Staff can complete modules between shifts without leaving the facility. Eligible courses count toward IICRC Continuing Education Credits (CECs) and issue verifiable digital credentials on completion.',
  },
  {
    question: 'What is mould remediation training for healthcare facilities?',
    answer:
      'IICRC AMRT (Applied Microbial Remediation) training covers mould identification, moisture assessment, containment procedures, and remediation protocols specific to clinical environments. In Australian hospitals, this is critical for plant rooms, basement services, and water-damaged areas where microbial growth poses infection risks to immunocompromised patients.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'NSQHS Alignment',
    description:
      'Training supports National Safety & Quality Health Service Standards compliance, particularly Standard 3 (Preventing and Controlling Infections).',
    color: '#009688',
  },
  {
    icon: Droplets,
    title: 'Water Damage Response',
    description:
      'Water damage in clinical areas, plant rooms, and basement services requires immediate, standards-based response. Train your environmental services team.',
    color: '#00796b',
  },
  {
    icon: Flame,
    title: 'Fire & Smoke',
    description:
      'Fire & smoke response in clinical environments and equipment rooms. IICRC credentials provide verifiable evidence for JCI accreditation audits.',
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
        headline="Healthcare Facility"
        headlineAccent="Restoration Training"
        description="NSQHS-aligned training for Australia's 2,050+ public and private hospitals. IICRC credentials support Standard 3 (Preventing and Controlling Infections) compliance and JCI accreditation audits."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="healthcare facilities"
        headline="Built for"
        headlineAccent="patient safety"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Healthcare Industry"
        disciplineList="AMRT, WRT, FSRT & ASD"
        disciplines={['AMRT', 'WRT', 'FSRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="healthcare" />

      <IndustryFAQSection industryName="Healthcare" faqs={faqs} />

      <IndustryCTA
        subtitle="Healthcare facility training"
        title="Healthcare Bundle"
        price="$295"
        description="WRT + AMRT + FSRT training + Healthcare-Specific Mould Risk Assessment bonus module. Online, self-paced — fits around 24/7 hospital shift patterns."
        ctaText="Train your team"
        ctaHref="/contact"
        accentColor={ACCENT_COLOR}
      />

      <IndustryCrossLinks currentSlug="healthcare" />
    </IndustryPageLayout>
  );
}
