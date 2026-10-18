import type { Metadata } from 'next';
import { Wrench, DollarSign, Shield, TrendingUp } from 'lucide-react';
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
  title: 'IICRC CEC Training for Plumbers & Trades | CARSI Australia',
  description:
    'Turn water damage call-outs into drying contracts. CARSI water damage restoration and applied structural drying CEC courses for Australian plumbers and trade contractors — online, self-paced, CEC Accredited. These are continuing education (CEC) courses, not IICRC certification.',
  keywords: [
    'IICRC CEC training plumbers Australia',
    'WRT CEC course plumbing',
    'water damage restoration plumber',
    'ASD structural drying trade',
    'IICRC CEC courses for plumbers online',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#0097a7';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#0097a7' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#00838f' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#006978' },
];

const stats = [
  { value: '85,000+', label: 'Licensed Plumbers (AUS)' },
  { value: 'WHS', label: 'Act Compliant' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'Do plumbers need IICRC certification in Australia?',
    answer:
      'No. IICRC certification is not a legal requirement for plumbers in Australia. Insurer panels set their own requirements, so check each panel; the certification itself is obtained only through IICRC-approved schools and examinations. CARSI courses train plumbers in water damage restoration and drying, and where the IICRC has approved a course, its CEC hours are shown on the course page.',
  },
  {
    question: 'What water damage training helps a plumbing business?',
    answer:
      'Training in moisture behaviour, psychrometry, drying-equipment placement and documentation lets a plumbing contractor find hidden moisture behind walls, set up drying and give the insurer a clear drying record. Start with Introduction to Water Damage Restoration, then Introduction to Psychrometry Science and Calculations and Introduction to Applied Structural Drying.',
  },
  {
    question: 'How does restoration training add work to a plumbing call-out?',
    answer:
      'Burst pipes, flexi-hose failures and roof leaks often leave wet structural materials behind. With drying training, a plumber can scope the drying as well as fix the source, instead of handing the rest of the job to a separate restoration contractor.',
  },
  {
    question: 'Can I complete CARSI training online while running a plumbing business?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and fully self-paced. There are no fixed class times, so modules fit between jobs, in the evening or on weekends. Every completed course issues a verifiable CARSI credential, and CEC hours are recorded only for courses the IICRC has approved.',
  },
];

const whyCards = [
  {
    icon: DollarSign,
    title: 'Turn Call-Outs Into Contracts',
    description:
      'Every burst pipe, flexi-hose failure, or roof leak leaves wet structure behind. IICRC certification lets you legally perform and invoice for the full drying scope — not just the repair.',
    color: '#0097a7',
  },
  {
    icon: Shield,
    title: 'WHS & Insurer Credibility',
    description:
      'Water damage is a notifiable hazard under Australian WHS legislation. IICRC credentials demonstrate due diligence and are specified by leading insurers for remediation scopes.',
    color: '#00838f',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Per Job',
    description:
      'Australian water damage restoration averages $2,500–$15,000 per job. Certified plumbers capture this revenue directly rather than referring out.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PlumbingTradesIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Wrench}
        industryName="Plumbing & Trades"
        accentColor={ACCENT_COLOR}
        headline="Turn Call-Outs Into"
        headlineAccent="Drying Contracts"
        description="85,000+ licensed Australian plumbers leave water damage behind every day. CARSI water damage restoration and applied structural drying CEC courses give your trade business the continuing-education grounding to capture the full remediation scope — and the revenue that comes with it. CARSI courses carry CARSI Southern Hemisphere Restoration Designations, not IICRC certification."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Plumbing & Trade Contractors"
        headline="Built for"
        headlineAccent="trade businesses"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Plumbing & Trades"
        disciplineList="Water damage restoration, structural drying and mould remediation"
        disciplines={['WRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Plumbing & Trades Training"
        title="Trades Restoration Bundle"
        price={industryBundlePriceLabel('plumbing-trades')}
        description="water damage restoration and structural drying training for licensed plumbers and trade contractors. Complete online between jobs. IICRC CEC Accredited."
        ctaText="Add Restoration to Your Business"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
