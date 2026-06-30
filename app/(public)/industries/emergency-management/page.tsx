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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC CEC Training for Emergency Management & SES | CARSI Australia',
  description:
    'Train SES volunteers and council emergency teams before disaster strikes. IICRC WRT, FSRT, ASD, and AMRT certification for flood and fire response. Online, CEC-aligned.',
  keywords: [
    'SES IICRC CEC training Australia',
    'emergency management restoration training',
    'WRT flood response training',
    'FSRT fire damage certification',
    'council emergency response training',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ef5350';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#ef5350' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#e53935' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#c62828' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#b71c1c' },
];

const stats = [
  { value: '40,000+', label: 'SES Volunteers (AUS)' },
  { value: '2,000+', label: 'Call-Outs Per Major Flood' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What IICRC CEC training is relevant for SES volunteers and emergency responders?',
    answer:
      'State Emergency Service (SES) volunteers performing damage assessment and initial response after flooding benefit significantly from IICRC WRT (Water Damage Restoration Technician) training. WRT covers moisture behaviour in building materials, structural damage assessment, and documentation — enabling volunteers to triage flood-affected properties more accurately, advise homeowners on immediate protective actions, and produce assessment records that support insurance claims. FSRT (Fire & Smoke Restoration) certification is similarly valuable for volunteers supporting post-bushfire triage.',
  },
  {
    question: 'How does WRT training help with flood response in Australian communities?',
    answer:
      'IICRC WRT training equips emergency responders to move beyond surface-level water removal to understand the moisture migration patterns within wall cavities, subfloors, and roof spaces that determine long-term structural damage and mould risk. WRT-trained volunteers can advise homeowners on which materials require immediate removal to prevent mould, which can be dried in place, and what documentation is needed for insurance claims — transforming the immediate flood response from a basic clean-up into a structured damage mitigation process.',
  },
  {
    question: 'Can council emergency management teams complete IICRC CEC training?',
    answer:
      'Yes. Council emergency management coordinators, building surveyors, and flood response teams benefit from IICRC awareness-level training in WRT and ASD. Online, self-paced delivery means staff can complete training between deployments without disrupting rostering. Councils that invest in IICRC CEC training for emergency response staff report improved property triage accuracy, stronger documentation for DRFA (Disaster Recovery Funding Arrangements) claims, and better community outcomes in the weeks following a major weather event.',
  },
  {
    question:
      'What is FSRT certification and how does it apply to bushfire and fire damage response?',
    answer:
      'FSRT (Fire & Smoke Restoration Technician) is an IICRC certification covering the chemistry of smoke, soot types and their penetration behaviour, odour neutralisation, and structural cleaning methods for fire-affected buildings. For emergency management teams operating in bushfire-affected areas, FSRT training supports accurate building triage — distinguishing between cosmetic smoke damage and structural compromise — and enables trained responders to provide homeowners with evidence-based advice on salvageability versus demolition.',
  },
];

const whyCards = [
  {
    icon: Droplets,
    title: 'Flood Response Capability',
    description:
      'WRT + ASD training gives SES volunteers and council teams the knowledge to triage flood-affected properties accurately, advise homeowners, and produce DRFA-compliant documentation.',
    color: '#ef5350',
  },
  {
    icon: Flame,
    title: 'Fire & Smoke Response',
    description:
      'FSRT certification covers post-bushfire building triage — distinguishing cosmetic smoke damage from structural compromise, supporting accurate insurance assessment and recovery advice.',
    color: '#e53935',
  },
  {
    icon: Users,
    title: 'Community Preparedness',
    description:
      'Nationally recognised IICRC credentials validate emergency management training for grant applications, council capability reporting, and volunteer retention through professional development.',
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
        description="Australia's 40,000+ SES volunteers and council emergency teams respond to thousands of flood and fire events every year. IICRC WRT, FSRT, and ASD training gives responders the restoration science knowledge to protect communities more effectively."
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
        disciplineList="WRT, FSRT, ASD & AMRT"
        disciplines={['WRT', 'FSRT', 'ASD', 'AMRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Emergency Management Training"
        title="Emergency Response Bundle"
        price="$265"
        description="WRT + FSRT + ASD training for SES volunteers, council emergency managers, and community resilience teams. Bulk licensing available for units and councils."
        ctaText="Train Your Response Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
