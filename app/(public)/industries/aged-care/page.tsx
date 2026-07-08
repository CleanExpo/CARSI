import type { Metadata } from 'next';
import { HeartPulse, Shield, Bug } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';
import { FAQSchema } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Aged Care IICRC CEC Training',
  description:
    'NQF-compliant IICRC CEC training for aged care facilities. RRT and AMRT courses for carpet restoration, mould remediation, and infection control.',
  keywords: [
    'aged care IICRC CEC training',
    'NQF compliance training',
    'residential care cleaning certification',
    'AMRT aged care',
    'RRT aged care Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#27ae60';

const disciplines = [
  { code: 'RRT', label: 'Carpet Restoration', color: '#26c4a0' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#27ae60' },
];

const stats = [
  { value: '15,000+', label: 'Aged Care Facilities' },
  { value: 'NQF', label: 'Compliance Requirement' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What IICRC certifications do aged care facilities need?',
    answer:
      'Australian aged care facilities typically require RRT (Carpet Restoration) for high-traffic flooring maintenance and AMRT (Applied Microbial Remediation) for mould and infection control. These certifications support National Quality Framework compliance and demonstrate competency to aged care auditors.',
  },
  {
    question: 'How does IICRC CEC training support Aged Care Quality Standards?',
    answer:
      "The Aged Care Quality Standards require facilities to demonstrate safe, clean environments for residents. CARSI's AMRT-aligned CEC training provides verifiable evidence that cleaning teams are trained in mould identification, remediation protocols, and infection prevention — directly relevant to Standard 3 (Personal Care and Clinical Care) compliance.",
  },
  {
    question: 'Can aged care staff complete IICRC CEC training around shift work?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced, designed to fit around 24/7 aged care operations. Staff can complete modules between shifts without leaving the facility. All courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'NQF Compliance',
    description:
      'Meet National Quality Framework infection control requirements with IICRC CEC Accredited courses for cleaning and maintenance teams.',
    color: '#27ae60',
  },
  {
    icon: Bug,
    title: 'Microbial Remediation',
    description:
      'Train staff to identify, assess, and remediate mould and microbial contamination in aged care environments.',
    color: '#26c4a0',
  },
  {
    icon: HeartPulse,
    title: 'Resident Wellbeing',
    description:
      'Proper carpet and upholstery hygiene directly impacts resident health. Earn CECs with verifiable transcripts for auditors.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function AgedCareIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={HeartPulse}
        industryName="Aged Care Industry"
        accentColor={ACCENT_COLOR}
        headline="Aged Care Infection"
        headlineAccent="Control Training"
        description="NQF-compliant hygiene and infection control for residential aged care facilities. Equip your cleaning and maintenance staff with IICRC-recognised credentials in carpet restoration and microbial remediation."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Aged Care Providers"
        headline="Built for"
        headlineAccent="resident safety"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Aged Care Industry"
        disciplineList="RRT & AMRT"
        disciplines={['RRT', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Aged Care Training"
        title="Certify Your Staff"
        price="Today"
        description="$795 AUD/year per seat. Bulk team pricing available."
        ctaText="Certify Your Staff Today"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
