import type { Metadata } from 'next';
import { Building2, Shield, Flame } from 'lucide-react';
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
  'government-defence',
  'Government & Defence Restoration Training',
  'Restoration training for Australian councils, agencies and defence facilities. Mould remediation, water damage restoration, structural drying and fire & smoke restoration courses for council, agency and defence facility teams.',
  [
    'government restoration training',
    'defence facility restoration',
    'government tender evidence',
    'WHS mould training',
    'heritage building restoration',
  ]
);

const ACCENT_COLOR = '#2196f3';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#2196f3' },
  { code: 'WRT', label: 'Water damage', color: '#1976d2' },
  { code: 'ASD', label: 'Structural drying', color: '#1565c0' },
  { code: 'FSRT', label: 'Fire and smoke', color: '#0d47a1' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'WHS', label: 'Hazard training' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'Do government procurement panels require IICRC certification?',
    answer:
      'It depends on the tender. AusTender is where Commonwealth agencies publish their tenders, and each agency sets its own selection criteria, so read the requirements in each tender. Where a tender asks for IICRC certification, that is obtained only through IICRC-approved schools and examinations; CARSI courses add verifiable CARSI credentials to a tender submission.',
  },
  {
    question: 'What WHS obligations apply to mould in government buildings?',
    answer:
      'Under Australian WHS legislation, government employers have a duty of care to identify and manage mould and moisture hazards. CARSI mould remediation training covers mould assessment, containment and remediation records. Documented CARSI training shows what each team member has studied, and when.',
  },
  {
    question: 'How do you restore heritage-listed government buildings after water damage?',
    answer:
      'Heritage-listed buildings require specialised structural drying techniques that avoid damaging original materials. CARSI structural drying training trains government maintenance teams in low-impact drying methods, moisture monitoring, and documentation that support heritage conservation and WHS obligations.',
  },
  {
    question: 'Can government facility staff complete this training online?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced, suitable for council and agency staff across metropolitan and regional Australia. Courses issue verifiable digital credentials for audit and procurement records. Bulk seat licensing is available for departments and councils.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Documented Training',
    description:
      'Government employers have strict WHS duties. Documented CARSI training shows what each facility team member has studied, and when.',
    color: '#2196f3',
  },
  {
    icon: Building2,
    title: 'Tender Evidence',
    description:
      'Each agency sets its own tender criteria. Where a tender asks for IICRC certification, that comes only from IICRC-approved schools and examinations; CARSI training adds verifiable CARSI credentials to your evidence.',
    color: '#1976d2',
  },
  {
    icon: Flame,
    title: 'Heritage Buildings',
    description:
      'Applied structural drying for heritage-listed government buildings. Fire and smoke response training for emergency teams.',
    color: '#ed9d24',
  },
];

export default async function GovernmentDefenceIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Building2}
        industryName="Government & Defence"
        accentColor={ACCENT_COLOR}
        headline="Government Facility"
        headlineAccent="Restoration Training"
        description="Restoration training for council, state agency and defence facility teams. Every completed course issues a verifiable CARSI credential."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="government agencies"
        headline="Built for"
        headlineAccent="public accountability"
        accentColor={ACCENT_COLOR}
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Government & Defence"
        disciplineList="Mould remediation, water damage restoration, structural drying and fire & smoke restoration"
        disciplines={['AMRT', 'WRT', 'ASD', 'FSRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} variant="government-defence" />

      <IndustryFAQSection industryName="Government & Defence" faqs={faqs} />

      <IndustryCTA
        subtitle="Government facility training"
        title="Facility Restoration Bundle"
        price={industryBundlePriceLabel('government-defence')}
        description="water damage restoration, mould remediation and structural drying training for government facility teams. Paid courses can be bought as team seats at checkout."
        ctaText="Request bulk pricing"
        ctaHref="/contact"
        accentColor={ACCENT_COLOR}
      />

      <IndustryCrossLinks currentSlug="government-defence" />
    </IndustryPageLayout>
  );
}
