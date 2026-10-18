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
    'water damage course for plumbers',
    'water damage restoration plumber',
    'structural drying for trades',
    'IICRC CEC courses for plumbers online',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#0097a7';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#0097a7' },
  { code: 'ASD', label: 'Structural drying', color: '#00838f' },
  { code: 'AMRT', label: 'Mould remediation', color: '#006978' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
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
      'Every burst pipe, flexi-hose failure, or roof leak leaves wet structure behind. Drying training lets you scope the drying as well as the repair; check each insurer panel for the certifications it requires.',
    color: '#0097a7',
  },
  {
    icon: Shield,
    title: 'WHS & Insurer Credibility',
    description:
      'Water damage is a workplace hazard under Australian WHS legislation. Documented training shows due diligence; each insurer panel sets its own certification requirements.',
    color: '#00838f',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Per Job',
    description:
      'Drying the structure is usually a separate scope from fixing the leak. Trained plumbers can quote both instead of referring the drying out.',
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
        description="Burst pipes and leaks often leave wet structure behind after the repair. CARSI water damage restoration and structural drying courses give your trade business the continuing-education grounding to capture the full remediation scope. CARSI courses carry CARSI Southern Hemisphere Restoration Designations, not IICRC certification."
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
        description="water damage restoration and structural drying training for licensed plumbers and trade contractors. Complete online between jobs. CEC hours apply only to courses the IICRC has approved."
        ctaText="Add Restoration to Your Business"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
