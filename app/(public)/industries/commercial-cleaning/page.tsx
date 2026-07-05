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
  'IICRC CEC Accredited courses for commercial cleaning contractors in Australia. CRT, CCT, and OCT topics for carpet restoration, odour control, and insurance panel readiness.',
  [
    'commercial cleaning IICRC CEC training',
    'cleaning contractor training Australia',
    'CRT certification',
    'CCT commercial carpet',
    'OCT odour control training',
  ]
);

const ACCENT_COLOR = '#2490ed';

const disciplines = [
  { code: 'CRT', label: 'Carpet Restoration', color: '#2490ed' },
  { code: 'CCT', label: 'Commercial Carpet', color: '#1976d2' },
  { code: 'OCT', label: 'Odour Control', color: '#1565c0' },
];

const stats = [
  { value: '8,000+', label: 'Cleaning Companies' },
  { value: 'IICRC', label: 'Certification' },
  { value: 'CECs', label: 'Continuous Education' },
];

const faqs = [
  {
    question: 'How do cleaning companies add restoration services in Australia?',
    answer:
      'Commercial cleaning businesses expand into restoration by upskilling existing staff with IICRC CEC courses in the core disciplines. CRT (Carpet Restoration), WRT (Water Damage Restoration), and OCT (Odour Control) are the most common entry points. This continuing-education grounding helps cleaners offer restoration work alongside routine cleaning contracts, increasing revenue per client. CARSI delivers CEC courses, not IICRC certification — certification is obtained through IICRC-approved schools.',
  },
  {
    question: 'What IICRC certifications help win insurance restoration panels?',
    answer:
      'Major Australian insurers and loss adjusters require contractors on their restoration panels to hold current IICRC certifications. WRT (Water Damage Restoration) and FSRT (Fire & Smoke Restoration) are the most commonly requested. Maintaining current CECs (Continuing Education Credits) is essential to remain on approved contractor lists.',
  },
  {
    question: 'How does IICRC certification align with ISSA standards?',
    answer:
      'IICRC and ISSA (International Sanitary Supply Association) are complementary industry bodies. IICRC provides technician-level certifications in specific restoration disciplines, while ISSA focuses on cleaning management standards. Australian cleaning companies often hold credentials from both organisations to demonstrate comprehensive capability in tenders.',
  },
  {
    question: 'What is the cost of IICRC CEC training for cleaning staff in Australia?',
    answer:
      'CARSI offers IICRC CEC Accredited courses from $795 AUD per year per seat, which includes access to courses, verifiable CARSI digital credentials, and CEC tracking. Bulk team pricing is available for cleaning companies training multiple technicians. Courses are online and self-paced, eliminating travel and downtime costs.',
  },
  {
    question: 'How do cleaning contractors track IICRC CEC credits for their team?',
    answer:
      "CARSI provides a team dashboard where business owners and managers can monitor each technician's CEC progress, certification status, and expiry dates. Verifiable digital transcripts are issued for each completed course, suitable for tender submissions, insurance panel applications, and client proposals.",
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
      'IICRC credentials are recognised by major insurers. Trained technicians can work on insurance restoration jobs with confidence.',
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
        description="IICRC CEC Accredited courses for commercial cleaning contractors. Build CARSI credentials in carpet restoration, commercial carpet care, and odour control."
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
        disciplineList="CRT, CCT & OCT"
        disciplines={['CRT', 'CCT', 'OCT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="commercial-cleaning" />

      <IndustryFAQSection industryName="Commercial Cleaning" faqs={faqs} />

      <IndustryCTA
        subtitle="Cleaning professional training"
        title="Pro Cleaning Bundle"
        price={industryBundlePriceLabel('commercial-cleaning')}
        description="CRT Carpet Restoration + CCT Commercial Carpet + OCT Odour Control. Perfect for cleaning contractors seeking IICRC credentials."
        ctaText="View pricing"
        ctaHref="/pricing"
        secondaryHref="/courses"
        accentColor={ACCENT_COLOR}
      />

      <IndustryCrossLinks currentSlug="commercial-cleaning" />
    </IndustryPageLayout>
  );
}
