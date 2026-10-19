import type { Metadata } from 'next';
import { AlertTriangle, Droplets, Flame, Users } from 'lucide-react';
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
  title: 'Restoration Training for Emergency Management & SES | CARSI Australia',
  description:
    'Train SES volunteers and council emergency teams before disaster strikes. CARSI water damage restoration, fire and smoke restoration, structural drying and mould remediation training for flood and fire response. Online. CEC hours apply only to courses the IICRC has approved.',
  keywords: [
    'SES restoration training Australia',
    'emergency management restoration training',
    'flood response training',
    'fire and smoke restoration training',
    'council emergency response training',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ef5350';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#ef5350' },
  { code: 'FSRT', label: 'Fire and smoke', color: '#e53935' },
  { code: 'ASD', label: 'Structural drying', color: '#c62828' },
  { code: 'AMRT', label: 'Mould remediation', color: '#b71c1c' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'CARSI', label: 'Verifiable credentials' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'What CARSI training suits SES volunteers and emergency responders?',
    answer:
      'Volunteers doing damage assessment after floods benefit from water damage restoration training: how moisture moves through building materials, how to assess structural damage and how to document it. Introduction to Water Damage Restoration and Introduction to Digital Moisture Mapping cover these. For bushfire-affected areas, Introduction to Smoke and Soot Damage Restoration covers smoke and soot behaviour.',
  },
  {
    question: 'How does water damage training help with flood response in Australian communities?',
    answer:
      'It helps responders look past surface water to the moisture in wall cavities, subfloors and roof spaces that drives long-term structural damage and mould. Trained volunteers can advise homeowners on which materials need removal, which can be dried in place and what records insurers need, turning a basic clean-up into a structured response.',
  },
  {
    question: 'Can council emergency management teams complete this training?',
    answer:
      'Yes. Council emergency management coordinators, building surveyors and flood response teams can take CARSI awareness-level courses in water damage restoration and structural drying. Online, self-paced delivery means staff can complete training between deployments without disrupting rosters.',
  },
  {
    question: 'What does fire and smoke restoration training cover for bushfire response?',
    answer:
      'It covers how smoke and soot behave and penetrate materials, odour removal and the cleaning of fire-affected buildings. For emergency management teams it supports triage that separates cosmetic smoke damage from structural compromise. Start with Introduction to Smoke and Soot Damage Restoration. Where the IICRC has approved a course, its CEC hours are shown on the course page.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Flood Response Capability',
    description:
      'water damage restoration and structural drying training gives SES volunteers and council teams the knowledge to triage flood-affected properties accurately, advise homeowners, and produce DRFA-compliant documentation.',
    color: '#ef5350',
  },
  {
    icon: Flame,
    title: 'Fire & Smoke Response',
    description:
      "CARSI's fire and smoke restoration training covers post-bushfire building triage — distinguishing cosmetic smoke damage from structural compromise, supporting accurate insurance assessment and recovery advice.",
    color: '#e53935',
  },
  {
    icon: Users,
    title: 'Community Preparedness',
    description:
      'Verifiable CARSI credentials document completed training for grant applications, council capability reporting and volunteer professional development.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EmergencyManagementIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={AlertTriangle}
        industryName="Emergency Management & SES"
        accentColor={ACCENT_COLOR}
        headline="Train Before"
        headlineAccent="Disaster Strikes"
        description="SES volunteers and council emergency teams respond to flood and fire events every year. CARSI water damage restoration, fire and smoke restoration and structural drying training gives responders the restoration science knowledge to protect communities more effectively."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Emergency Management Teams"
        headline="Built for"
        headlineAccent="community resilience"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Emergency Management & SES"
        disciplineList="Water damage restoration, fire & smoke restoration, structural drying and mould remediation"
        disciplines={['WRT', 'FSRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Emergency Management Training"
        title="Emergency Response Bundle"
        price={industryBundlePriceLabel('emergency-management')}
        description="water damage restoration, fire & smoke restoration and structural drying training for SES volunteers, council emergency managers, and community resilience teams. Paid courses can be bought as team seats at checkout."
        ctaText="Train Your Response Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
