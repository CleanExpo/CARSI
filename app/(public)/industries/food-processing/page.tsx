import type { Metadata } from 'next';
import { Factory, Shield, Droplets, SprayCan } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';
import { FAQSchema } from '@/components/seo/JsonLd';
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Food Processing Facility IICRC CEC Training',
  description:
    'HACCP-aligned IICRC CEC training for Australian food processing facilities. Mould remediation, odour control and carpet cleaning courses supporting hygiene compliance, cold storage maintenance, and contamination prevention.',
  keywords: [
    'food processing IICRC CEC training Australia',
    'HACCP compliance restoration',
    'AMRT mould remediation food facility',
    'OCT odour control food processing',
    'CCT carpet cleaning food factory',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#2E7D32';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#2E7D32' },
  { code: 'OCT', label: 'Odour Control', color: '#1B5E20' },
  { code: 'CCT', label: 'Carpet Cleaning', color: '#388E3C' },
];

const stats = [
  { value: '6,000+', label: 'Food Facilities' },
  { value: 'HACCP', label: 'Aligned' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What restoration training suits Australian food processing facilities?',
    answer:
      'Microbial remediation for mould and bacterial contamination in cold stores and processing areas, odour control for organic odours, and carpet cleaning for office and visitor areas. Relevant CARSI courses include Introduction to Applied Microbial Remediation, Introduction to Odour Control and Removal Techniques and Introduction to Basic Carpet Cleaning and Drying. This training sits alongside, and does not replace, HACCP and FSANZ food safety requirements.',
  },
  {
    question: 'How does mould training support HACCP programs in food facilities?',
    answer:
      'HACCP plans depend on staff who can prevent contamination. Mould remediation training gives maintenance teams documented training in identifying and remediating mould, bacteria and biofilms in cold rooms, processing lines and drains. It supports, and does not replace, the facility\'s own HACCP plan and verification.',
  },
  {
    question: 'What is mould remediation training for cold storage facilities?',
    answer:
      'It covers identifying and remediating mould and microbial growth in temperature-controlled areas such as cold rooms, blast chillers, loading docks and drainage channels, where condensation creates conditions for contamination. CARSI covers this in Introduction to Applied Microbial Remediation and the Level 1 to Level 3 Mould Remediation courses.',
  },
  {
    question: 'Can food processing staff complete IICRC CEC training while maintaining shift patterns?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced. Staff can complete modules around production schedules and shift rotations. Courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'HACCP Compliance',
    description:
      'IICRC CEC training supports HACCP critical control points for microbial contamination prevention. Demonstrate staff competency during food safety audits.',
    color: '#2E7D32',
  },
  {
    icon: Droplets,
    title: 'Cold Storage Hygiene',
    description:
      'Condensation, drainage issues, and temperature fluctuations in cold rooms create ideal conditions for mould. Microbial remediation training equips teams to prevent and remediate contamination.',
    color: '#1B5E20',
  },
  {
    icon: SprayCan,
    title: 'Odour & Surface Control',
    description:
      'Organic odours and surface contamination in processing areas require specialist remediation. Odour control and carpet cleaning certifications provide standards-based approaches.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function FoodProcessingIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Factory}
        industryName="Food Processing Industry"
        accentColor={ACCENT_COLOR}
        headline="Food Processing"
        headlineAccent="Hygiene Training"
        description="HACCP-aligned restoration training for Australia's 6,000+ food processing facilities. IICRC credentials for microbial remediation, odour control, and hygiene compliance in production environments."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Food Processing Facilities"
        headline="Built for"
        headlineAccent="food safety compliance"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Food Processing Industry"
        disciplineList="Mould remediation, odour control and carpet cleaning"
        disciplines={['AMRT', 'OCT', 'CCT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Food Processing Training"
        title="Food Safety Bundle"
        price={industryBundlePriceLabel('food-processing')}
        description="mould remediation, odour control and carpet cleaning training for food processing teams. Includes cold storage mould prevention protocols. Online, self-paced — fits around production schedules."
        ctaText="Train Your Facility Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
