import type { Metadata } from 'next';
import { Truck, Shield, Droplets, Wind } from 'lucide-react';
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
  title: 'Transport & Logistics Restoration Training',
  description:
    'Water damage restoration, carpet cleaning and odour control courses for Australian transport and logistics teams, plus a vehicle drying course. CEC hours are shown only on courses the IICRC has approved.',
  keywords: [
    'transport restoration training Australia',
    'logistics warehouse restoration',
    'warehouse water damage',
    'carpet cleaning training',
    'odour control transport',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#1565C0';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#1565C0' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#0D47A1' },
  { code: 'OCT', label: 'Odour control', color: '#1976D2' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'Chain of', label: 'Responsibility' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'What restoration training suits Australian transport and logistics operators?',
    answer:
      'Water damage response for warehouse flooding and roof leaks, drying for vehicles, and odour control in enclosed cargo areas and passenger vehicles. Relevant CARSI courses include Introduction to Water Damage in Commercial Buildings, Introduction to Drying Transportation and Vehicles and Introduction to Odour Control and Removal Techniques.',
  },
  {
    question: 'How does water damage training help warehouse operations?',
    answer:
      'Australian warehouses face water damage from storms, roof failures and sprinkler activations. Water damage training equips logistics teams to respond immediately: extract water, protect inventory and set up drying equipment to reduce stock loss and downtime. Early response can also prevent secondary mould damage.',
  },
  {
    question: 'What vehicle training does CARSI offer?',
    answer:
      "Introduction to Drying Transportation and Vehicles covers drying vehicles and transport assets after water damage. CARSI's vehicle training is about drying; it does not cover interior fabric repair.",
  },
  {
    question: 'Can transport and logistics staff train online around shift schedules?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced. Drivers and warehouse staff can complete modules during downtime, between shifts, or during scheduled stand-down periods. All courses issue verifiable digital credentials on completion.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Asset Protection',
    description:
      'Warehoused goods, fleet vehicles, and loading infrastructure represent significant capital. Restoration training covers response to water damage and contamination events.',
    color: '#1565C0',
  },
  {
    icon: Droplets,
    title: 'Warehouse Flood Response',
    description:
      'Storm damage, sprinkler activations, and roof leaks can destroy warehoused inventory. Water damage training equips your team to extract, dry, and restore — minimising stock loss.',
    color: '#0D47A1',
  },
  {
    icon: Wind,
    title: 'Fleet Interior Maintenance',
    description:
      'Bus, coach and truck fleets get wet interiors and lingering odours. Vehicle drying and odour control training helps in-house teams deal with both and extend asset life.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function TransportLogisticsIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Truck}
        industryName="Transport & Logistics"
        accentColor={ACCENT_COLOR}
        headline="Transport & Logistics"
        headlineAccent="Restoration Training"
        description="Restoration courses for transport and logistics teams: warehouse flood response, vehicle drying and loading dock contamination control."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Transport & Logistics Operations"
        headline="Built for"
        headlineAccent="fleet and facility protection"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Transport & Logistics"
        disciplineList="Water damage restoration, carpet cleaning and odour control"
        disciplines={['WRT', 'CRT', 'OCT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryFAQSection industryName="Transport and logistics" faqs={faqs} />

      <IndustryCTA
        subtitle="Transport & Logistics Training"
        title="Logistics Restoration Bundle"
        price={industryBundlePriceLabel('transport-logistics')}
        description="water damage restoration, vehicle drying and odour control training for transport and warehouse teams. Includes fleet maintenance and warehouse flood response protocols. Online, self-paced — fits around shift schedules."
        ctaText="Train Your Operations Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
