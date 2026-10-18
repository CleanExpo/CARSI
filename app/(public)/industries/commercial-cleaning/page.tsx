import type { Metadata } from 'next';
import { Sparkles, Shield, Award, Users } from 'lucide-react';
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
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildIndustryMetadata(
  'commercial-cleaning',
  'Commercial Cleaning IICRC CEC Training',
  'IICRC CEC Accredited courses for commercial cleaning contractors in Australia. Carpet cleaning, water damage and odour control topics for commercial cleaning teams and insurance panel readiness.',
  [
    'commercial cleaning IICRC CEC training',
    'cleaning contractor training Australia',
    'carpet cleaning training',
    'commercial carpet care',
    'odour control training',
  ]
);

const ACCENT_COLOR = '#2490ed';

const disciplines = [
  { code: 'CRT', label: 'Carpet cleaning', color: '#2490ed' },
  { code: 'CCT', label: 'Commercial carpet care', color: '#1976d2' },
  { code: 'OCT', label: 'Odour control', color: '#1565c0' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'IICRC CEC', label: 'On approved courses' },
  { value: 'CECs', label: 'Continuous Education' },
];

const faqs = [
  {
    question: 'How do cleaning companies add restoration services in Australia?',
    answer:
      'Most start by upskilling existing staff in water damage restoration, carpet cleaning and odour control, then add structural drying and mould remediation. CARSI courses in those subjects are online and self-paced, and every completed course issues a verifiable CARSI credential. CARSI is an IICRC CEC Accredited provider: where the IICRC has approved a course, its CEC hours are shown on the course page. CARSI does not deliver IICRC certification, which is obtained only through IICRC-approved schools and examinations.',
  },
  {
    question: 'What IICRC certifications help win insurance restoration panels?',
    answer:
      'Insurers and loss adjusters set their own panel requirements, so ask each panel which IICRC certifications it expects. IICRC certification is obtained only through IICRC-approved schools and examinations, and holders keep it current with Continuing Education Credits (CECs). Where the IICRC has approved a CARSI course, its CEC hours are shown on the course page.',
  },
  {
    question: 'How does IICRC certification align with ISSA standards?',
    answer:
      'IICRC and ISSA (International Sanitary Supply Association) are complementary industry bodies. IICRC provides technician-level certifications in specific restoration disciplines, while ISSA focuses on cleaning management standards. Australian cleaning companies often hold credentials from both organisations to demonstrate comprehensive capability in tenders.',
  },
  {
    question: 'What does CARSI training cost for cleaning staff?',
    answer:
      'Each course is priced in AUD on its own page, and paid courses can be bought as team seats at checkout. Some courses are free. Yearly membership and team plans are listed on the pricing page.',
  },
  {
    question: 'How do cleaning contractors track training for their team?',
    answer:
      'Every completed course issues a verifiable CARSI credential, and each learner can download or share their training record from the CARSI dashboard for tenders, insurance panel applications and client proposals. CEC hours are recorded only for courses the IICRC has approved.',
  },
];

const whyCards = [
  {
    icon: Award,
    title: 'IICRC CEC Training',
    description:
      'Build IICRC CEC records and CARSI credentials that differentiate your cleaning business. Stand out in tender submissions and client proposals.',
    color: '#2490ed',
  },
  {
    icon: Shield,
    title: 'Insurance Recognition',
    description:
      'Restoration training helps technicians take on insurance restoration jobs with confidence. Each insurer panel sets its own certification requirements.',
    color: '#1976d2',
  },
  {
    icon: Users,
    title: 'Team Development',
    description:
      'Build a skilled workforce with verifiable credentials. Track team CEC progress and maintain certification status across your organisation.',
    color: '#ed9d24',
  },
];

export default async function CommercialCleaningIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Sparkles}
        industryName="Commercial Cleaning"
        accentColor={ACCENT_COLOR}
        headline="Commercial Cleaning"
        headlineAccent="Professional CEC Training"
        description="IICRC CEC Accredited courses for commercial cleaning contractors. Build CARSI credentials in carpet cleaning, commercial carpet care and odour control."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="cleaning contractors"
        headline="Built for"
        headlineAccent="professional growth"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Commercial Cleaning"
        disciplineList="Carpet cleaning and odour control"
        disciplines={['CRT', 'CCT', 'OCT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="commercial-cleaning" />

      <IndustryFAQSection industryName="Commercial Cleaning" faqs={faqs} />

      <IndustryCTA
        subtitle="Cleaning professional training"
        title="Pro Cleaning Bundle"
        price={industryBundlePriceLabel('commercial-cleaning')}
        description="Carpet cleaning, commercial carpet care and odour control for cleaning contractors. Every completed course issues a verifiable CARSI credential."
        ctaText="View pricing"
        ctaHref="/pricing"
        secondaryHref="/courses"
        accentColor={ACCENT_COLOR}
      />

      <IndustryCrossLinks currentSlug="commercial-cleaning" />
    </IndustryPageLayout>
  );
}
