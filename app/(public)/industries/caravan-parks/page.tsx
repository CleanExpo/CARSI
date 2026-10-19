import type { Metadata } from 'next';
import { Tent, Droplets, Wind, Shield } from 'lucide-react';
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
  title: 'Mould & Restoration Training for Caravan Parks',
  description:
    'Protect guests and comply with state Fair Trading obligations. CARSI mould remediation, carpet cleaning and water damage restoration training for Australian caravan parks and holiday accommodation. Online. CEC hours apply only to courses the IICRC has approved.',
  keywords: [
    'caravan park mould training Australia',
    'holiday park restoration course',
    'caravan park mould remediation',
    'cabin mould restoration training',
    'holiday accommodation hygiene compliance',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#26a69a';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#26a69a' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#00897b' },
  { code: 'WRT', label: 'Water damage', color: '#00796b' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'CARSI', label: 'Verifiable credentials' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'Why do caravan parks need mould remediation training?',
    answer:
      'Australian caravan parks face persistent mould risk due to seasonal occupancy patterns that leave cabins, ensuite blocks, and annexes unventilated for months. High humidity coastal and tropical locations, poor drainage around cabin pads, and ageing accommodation stock with limited vapour barriers compound the risk. CARSI mould remediation training gives maintenance staff the ability to inspect cabins systematically before peak season, identify hidden mould in walls and subfloors, and remediate using protocols that prevent costly comeback situations and guest complaints.',
  },
  {
    question: 'What water damage risks do holiday parks face in Australia?',
    answer:
      'Caravan parks and holiday parks face water damage from cyclone and storm events in tropical regions, flooding in low-lying coastal and riverside parks, roof failures in ageing cabin stock, and plumbing failures in shared amenities blocks. CARSI water damage restoration training equips park maintenance staff to respond immediately after these events — extracting water, placing drying equipment, and documenting damage for insurance claims — reducing the period of lost revenue from uninhabitable sites.',
  },
  {
    question: 'How does training help caravan park operators deal with mould and water damage?',
    answer:
      'Hidden mould or water damage in guest accommodation can lead to Fair Trading complaints, poor reviews or injury claims if guests suffer health effects. CARSI training covers mould identification and remediation. Documented CARSI training shows what each staff member has studied, and when.',
  },
  {
    question: 'What carpet training helps holiday accommodation?',
    answer:
      'Introduction to Basic Carpet Cleaning and Drying covers carpet cleaning and drying in residential, commercial and institutional settings, which suits cabins and common areas. Where the IICRC has approved a course, its CEC hours are shown on the course page. For carpet that gets wet in a storm or plumbing failure, Introduction to Water Damage Restoration covers the drying side.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Seasonal Moisture & Mould',
    description:
      'Cabins left unoccupied during off-season develop mould in walls, subfloors, and ensuite blocks. Mould remediation training gives maintenance staff the protocols to inspect and remediate before peak season.',
    color: '#26a69a',
  },
  {
    icon: Wind,
    title: 'Storm & Flood Response',
    description:
      'Coastal and riverside parks face cyclone, storm surge, and flooding events. Water damage training equips park staff to respond immediately, reducing uninhabitable site periods and expediting insurance claims.',
    color: '#00897b',
  },
  {
    icon: Shield,
    title: 'Documented Training',
    description:
      'Hidden mould or water damage can leave a cabin unfit for guests. Documented CARSI training shows what each staff member has studied, and when.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function CaravanParksIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Tent}
        industryName="Caravan Parks & Holiday Accommodation"
        accentColor={ACCENT_COLOR}
        headline="Training for Guest Accommodation"
        headlineAccent="All Season Long"
        description="Caravan parks face persistent mould, moisture, and storm damage risk. CARSI mould remediation, carpet cleaning and water damage restoration courses give park maintenance teams the protocols to inspect, remediate, and document — protecting guests, reputation, and revenue. CARSI courses carry CARSI Southern Hemisphere Restoration Designations, not IICRC certification."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Caravan Parks & Holiday Parks"
        headline="Built for"
        headlineAccent="accommodation excellence"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Caravan Parks & Holiday Accommodation"
        disciplineList="Mould remediation, carpet cleaning and water damage restoration"
        disciplines={['AMRT', 'CRT', 'WRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryFAQSection industryName="Caravan parks" faqs={faqs} />

      <IndustryCTA
        subtitle="Holiday Park Training"
        title="Holiday Park Bundle"
        price={industryBundlePriceLabel('caravan-parks')}
        description="mould remediation, carpet cleaning and water damage restoration training for caravan park and holiday accommodation maintenance staff. Seasonal inspection protocols included. Online, self-paced."
        ctaText="Train Your Park Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
