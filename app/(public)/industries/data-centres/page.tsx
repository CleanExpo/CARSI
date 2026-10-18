import type { Metadata } from 'next';
import { Server, Shield, Droplets, Flame } from 'lucide-react';
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
  title: 'Data Centre IICRC CEC Training',
  description:
    'IICRC CEC Accredited restoration courses for Australian data centres. Water damage restoration, structural drying and fire & smoke restoration courses for water damage prevention, climate control recovery, and fire suppression system response.',
  keywords: [
    'data centre IICRC CEC training Australia',
    'water damage prevention data centre',
    'data centre water damage restoration',
    'server room structural drying',
    'data centre fire suppression clean-up',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#6A1B9A';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#6A1B9A' },
  { code: 'ASD', label: 'Structural drying', color: '#4A148C' },
  { code: 'FSRT', label: 'Fire and smoke', color: '#7B1FA2' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'CARSI', label: 'Verifiable credentials' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What restoration training suits Australian data centres?',
    answer:
      'Water damage response for cooling-unit leaks and pipe bursts, structural drying for fast moisture removal, and smoke and residue clean-up after a suppression event. Relevant CARSI courses include Introduction to Water Damage in Commercial Buildings, Introduction to Applied Structural Drying and Introduction to Smoke and Soot Damage Restoration. Where the IICRC has approved a course, its CEC hours are shown on the course page.',
  },
  {
    question: 'How does water damage training protect data centre infrastructure?',
    answer:
      'Training helps facility teams respond quickly to cooling-unit leaks, overhead pipe bursts or cooling-system failures: contain the water, protect rack infrastructure and start extraction before corrosion or short circuits occur. Introduction to Water Extraction Methods and Introduction to Safety Procedures for Water Damage Work cover those first steps.',
  },
  {
    question: 'What happens after a fire suppression system activates in a data centre?',
    answer:
      'After a clean-agent or water-mist discharge, residue and moisture have to be removed to prevent corrosion and equipment failure. Introduction to Smoke and Soot Damage Restoration covers residue assessment and clean-up, and Introduction to Applied Structural Drying covers moisture control.',
  },
  {
    question: 'Can data centre operations staff complete IICRC CEC training without downtime?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced. NOC and facility staff can complete modules during scheduled maintenance windows or between shifts. All courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Uptime Protection',
    description:
      'Every minute of downtime costs thousands. IICRC CEC training ensures your facility team can respond to water and fire events within minutes, protecting SLA commitments and Uptime Institute tier compliance.',
    color: '#6A1B9A',
  },
  {
    icon: Droplets,
    title: 'Water Damage Prevention',
    description:
      'CRAC unit leaks, overhead pipe bursts, and cooling failures are the leading non-power cause of data centre outages. Water damage restoration and structural drying training equips teams to contain and dry before equipment damage occurs.',
    color: '#4A148C',
  },
  {
    icon: Flame,
    title: 'Fire Suppression Recovery',
    description:
      "Post-suppression cleanup requires specialist knowledge. CARSI's CEC-accredited fire and smoke restoration training covers residue removal, air quality restoration, and equipment assessment after clean agent or water mist activation.",
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function DataCentresIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Server}
        industryName="Data Centres"
        accentColor={ACCENT_COLOR}
        headline="Data Centre"
        headlineAccent="Protection Training"
        description="Restoration courses for data centre facility teams: water damage response, drying after cooling failures, and clean-up after a fire suppression event."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Data Centre Operations"
        headline="Built for"
        headlineAccent="uptime protection"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Data Centres"
        disciplineList="Water damage restoration, structural drying and fire & smoke restoration"
        disciplines={['WRT', 'ASD', 'FSRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Data Centre Training"
        title="Data Centre Protection Bundle"
        price={industryBundlePriceLabel('data-centres')}
        description="water damage restoration, structural drying and fire & smoke restoration training for data centre facility teams. Includes cooling system failure response and post-suppression cleanup protocols. Online, self-paced — fits around maintenance windows."
        ctaText="Protect Your Infrastructure"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
