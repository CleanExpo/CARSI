import type { Metadata } from 'next';
import { Landmark, Shield, Droplets, Thermometer } from 'lucide-react';
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
  title: 'Museums & Cultural Institutions Restoration Training',
  description:
    'Heritage preservation and artifact protection training for Australian museums, galleries, and cultural institutions. Mould remediation, water damage restoration and structural drying courses for climate-controlled environments.',
  keywords: [
    'museum restoration training Australia',
    'heritage preservation restoration',
    'artifact protection water damage',
    'mould remediation museum',
    'cultural institution restoration training',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#8B6914';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#8B6914' },
  { code: 'WRT', label: 'Water damage', color: '#7A5C12' },
  { code: 'ASD', label: 'Structural drying', color: '#6B5010' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'CARSI', label: 'Verifiable credentials' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'What restoration training suits Australian museums and cultural institutions?',
    answer:
      'Microbial remediation for mould prevention in collection storage, water damage response for leaks or flooding near collections, and structural drying for moisture control in climate-sensitive spaces. Relevant CARSI courses include Introduction to Applied Microbial Remediation, Introduction to Water Damage Restoration, Introduction to Applied Structural Drying and Introduction to Restoration of Antiques and Fine Furnishings.',
  },
  {
    question: 'How does mould affect museum collections, and how does training help?',
    answer:
      'Mould is a serious threat to paper, textile and organic items in storage. Mould remediation training teaches staff to spot microbial growth early, set up containment and remediate without damaging collection items. For institutions in humid coastal climates, it supports preventive conservation.',
  },
  {
    question: 'Can gallery and museum staff complete this training online?',
    answer:
      'Yes. CARSI offers IICRC CEC Accredited courses online and self-paced, ideal for museum staff who need to maintain building operations during opening hours. Courses can be completed around exhibition schedules and issue verifiable digital credentials on completion.',
  },
  {
    question: 'What is the emergency response protocol for water damage in a museum?',
    answer:
      'Water damage training covers triage: isolate the source, protect high-value items, extract standing water and set up drying equipment. Introduction to Recovery of Submerged Items and Contents covers waterlogged contents, and structural drying training adds moisture monitoring to prevent secondary mould growth.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Heritage Preservation',
    description:
      'Protect irreplaceable artefacts and collection items. Restoration training equips staff with standards-based response protocols aligned to AICCM conservation guidelines.',
    color: '#8B6914',
  },
  {
    icon: Droplets,
    title: 'Water Damage Response',
    description:
      'Roof leaks, pipe bursts, and flooding near collection storage demand immediate, trained response. Water damage training helps your team triage and protect high-value items.',
    color: '#7A5C12',
  },
  {
    icon: Thermometer,
    title: 'Climate Control Recovery',
    description:
      'HVAC failures in climate-controlled galleries and archives risk mould outbreaks. Structural drying training provides the moisture management expertise to stabilise environments quickly.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function MuseumsCulturalIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Landmark}
        industryName="Museums & Cultural Institutions"
        accentColor={ACCENT_COLOR}
        headline="Museum & Gallery"
        headlineAccent="Preservation Training"
        description="Restoration training for museum, gallery and cultural institution teams: mould prevention, water damage response and drying in climate-controlled spaces."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Cultural Institutions"
        headline="Built for"
        headlineAccent="heritage protection"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Museums & Cultural Institutions"
        disciplineList="Mould remediation, water damage restoration and structural drying"
        disciplines={['AMRT', 'WRT', 'ASD']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Cultural Institution Training"
        title="Heritage Preservation Bundle"
        price={industryBundlePriceLabel('museums-cultural')}
        description="mould remediation, water damage restoration and structural drying training for museum and gallery teams. Includes collection-specific emergency response protocols. Online, self-paced — fits around exhibition schedules."
        ctaText="Protect Your Collection"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
