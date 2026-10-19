import type { Metadata } from 'next';
import { Home, FileCheck, TrendingUp, Shield } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCTA,
  ContractorAddOns,
  IndustryFAQSection,
} from '@/components/industries';
import { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';
import { FAQSchema } from '@/components/seo/JsonLd';
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Restoration Training for Real Estate & Property Sales',
  description:
    'Vendor disclosure compliance and pre-sale remediation. CARSI water damage restoration, structural drying and mould remediation courses for real estate agents, property managers, and conveyancers. Online. CEC hours apply only to courses the IICRC has approved; not IICRC certification.',
  keywords: [
    'real estate restoration training Australia',
    'water damage disclosure property',
    'mould training real estate agent',
    'water damage training for real estate',
    'pre-sale remediation training',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ff7043';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#ff7043' },
  { code: 'ASD', label: 'Structural drying', color: '#f4511e' },
  { code: 'AMRT', label: 'Mould remediation', color: '#e64a19' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'ACL', label: 'Disclosure Required' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'Do real estate agents need water damage and mould training in Australia?',
    answer:
      'Real estate agents in Australia are not legally required to hold IICRC certification, but they have a statutory obligation under Australian Consumer Law and state-specific property acts to disclose known material defects — including water damage and mould — to prospective buyers. CARSI water damage restoration and mould remediation training equips agents to identify moisture damage and mould during property inspections, protecting them from non-disclosure liability and enabling them to advise vendors on required remediation before listing.',
  },
  {
    question:
      'What are vendor disclosure obligations for water damage in Australian property sales?',
    answer:
      "Each state has its own vendor disclosure requirements. In most jurisdictions, sellers must disclose material defects that would affect a reasonable buyer's decision, which can include known water penetration, mould and drying history. Trained agents can recognise these defects during pre-listing inspections, record them accurately in disclosure statements and refer vendors to qualified remediation contractors.",
  },
  {
    question: 'How does water damage and mould training help during property sales?',
    answer:
      'Agents trained in water damage and mould can better judge how serious water damage is, tell active from historic moisture, and understand moisture meter readings and thermal images. That helps them discuss remediation credibly, lowers the risk of a sale collapsing after a building inspection, and lets them point to documented remediation when it exists.',
  },
  {
    question: 'What is moisture mapping and why does it matter for real estate?',
    answer:
      'Moisture mapping is a systematic process of recording moisture readings across a property using calibrated meters and thermal imaging — producing a documented baseline of moisture conditions. In real estate, moisture maps are used to verify that remediation has been completed to IICRC standard before settlement, to resolve building inspection disputes, and to support insurance claims for storm or flood damage. CARSI water damage restoration and structural drying training includes moisture mapping methodology, making trained agents significantly more effective in complex property transactions.',
  },
];

const whyCards = [
  {
    icon: FileCheck,
    title: 'Vendor Disclosure Compliance',
    description:
      'Water damage and mould are material defects requiring disclosure under Australian Consumer Law. Restoration training equips agents to identify, document, and disclose these defects accurately — minimising post-settlement liability.',
    color: '#ff7043',
  },
  {
    icon: TrendingUp,
    title: 'Pre-Sale Remediation Value',
    description:
      'Remediation completed and documented before listing can reduce building inspection surprises. Trained agents can brief vendors on required work and check that it was documented.',
    color: '#f4511e',
  },
  {
    icon: Shield,
    title: 'Professional Indemnity Protection',
    description:
      'Non-disclosure of known defects can lead to real estate professional indemnity claims. IICRC CEC Accredited awareness courses demonstrates due diligence and supports a defensible inspection record.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function RealEstateIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Home}
        industryName="Real Estate & Property Sales"
        accentColor={ACCENT_COLOR}
        headline="Pre-Sale Remediation"
        headlineAccent="& Disclosure Compliance"
        description="Property sales can carry water damage and mould disclosure obligations. CARSI water damage restoration and mould remediation training gives real estate professionals the knowledge to identify, document, and advise on remediation — protecting vendors, buyers, and agents."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Real Estate Professionals"
        headline="Built for"
        headlineAccent="property confidence"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Real Estate & Property Sales"
        disciplineList="Water damage restoration, structural drying and mould remediation"
        disciplines={['WRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryFAQSection industryName="Real estate" faqs={faqs} />

      <IndustryCTA
        subtitle="Real Estate Training"
        title="Property Professional Bundle"
        price={industryBundlePriceLabel('real-estate')}
        description="water damage restoration and mould remediation awareness training for real estate agents, conveyancers, and property managers. Learn to identify water damage and mould during inspections."
        ctaText="Protect Your Practice"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
