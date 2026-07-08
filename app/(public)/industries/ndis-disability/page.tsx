import type { Metadata } from 'next';
import { Heart, Shield, Droplets, ClipboardCheck } from 'lucide-react';
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
  title: 'IICRC CEC Training for NDIS & Disability Services | CARSI Australia',
  description:
    'Meet NDIS Practice Standards with IICRC mould and water damage CEC courses. AMRT, WRT, and RRT continuing-education training for disability support providers. Online, CEC Accredited — not IICRC certification.',
  keywords: [
    'NDIS IICRC CEC training',
    'disability services mould training Australia',
    'AMRT NDIS provider',
    'NDIS Practice Standards infection control',
    'mould remediation disability accommodation',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#5c6bc0';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#5c6bc0' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#4a5aa8' },
  { code: 'RRT', label: 'Carpet Cleaning Technician', color: '#3949ab' },
];

const stats = [
  { value: '600,000+', label: 'NDIS Participants (AUS)' },
  { value: 'NDIS', label: 'Practice Standards' },
  { value: 'IICRC', label: 'CEC Accredited' },
];

const faqs = [
  {
    question: 'What IICRC CEC training do NDIS service providers need?',
    answer:
      'NDIS providers supporting participants in supported independent living (SIL) or specialist disability accommodation (SDA) have a duty of care to maintain safe, hygienic environments. IICRC AMRT (Applied Microbial Remediation Technician) training covers mould identification, containment, and remediation — skills directly relevant to Module 3 of the NDIS Practice Standards (Supports Provision Environment). WRT training supports water damage response in participant homes and shared accommodation facilities.',
  },
  {
    question: 'How does mould affect NDIS participants and their accommodation?',
    answer:
      'Many NDIS participants have compromised immune systems, respiratory conditions, or sensitivities that make mould exposure significantly more dangerous than for the general population. Under NDIS Practice Standards, providers must ensure accommodation is safe and hygienic. Unaddressed mould in SIL or SDA properties can result in NDIS Quality and Safeguards Commission investigations, worker banning orders, and loss of registration. AMRT-aligned CEC training ensures maintenance staff can identify and remediate mould before it becomes a compliance issue.',
  },
  {
    question: 'Does IICRC certification help NDIS providers during audits?',
    answer:
      'Yes. NDIS registration audits assess whether providers have documented policies and demonstrable staff competency for maintaining safe environments. IICRC certifications are nationally and internationally recognised credentials that provide verifiable evidence of staff training. During a Module 3 audit, presenting IICRC-certified maintenance staff and documented remediation procedures significantly strengthens the compliance record compared to internal training alone.',
  },
  {
    question: 'Can support coordinators benefit from IICRC restoration awareness training?',
    answer:
      'Support coordinators who understand the signs of water damage and mould can better advocate for participants and initiate remediation before conditions deteriorate. While support coordinators do not perform remediation themselves, IICRC awareness-level training helps them identify hazards during home visits, document concerns accurately, and brief maintenance contractors on required standards — all of which support better participant outcomes and stronger audit documentation.',
  },
];

const whyCards = [
  {
    icon: ClipboardCheck,
    title: 'NDIS Practice Standards',
    description:
      "Module 3 (Supports Provision Environment) requires safe, hygienic accommodation. CARSI's AMRT-aligned CEC training provides verifiable evidence of mould and remediation competency for audits.",
    color: '#5c6bc0',
  },
  {
    icon: Shield,
    title: 'Duty of Care Protection',
    description:
      'NDIS participants are often immunocompromised. Documented IICRC CEC training demonstrates due diligence, reducing organisational liability under the NDIS Act and WHS legislation.',
    color: '#4a5aa8',
  },
  {
    icon: Droplets,
    title: 'Moisture & Mould Response',
    description:
      'Water damage in shared accommodation, wet areas, and specialist housing requires immediate standards-based response to protect vulnerable residents.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function NDISDisabilityIndustryPage() {
  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Heart}
        industryName="NDIS & Disability Services"
        accentColor={ACCENT_COLOR}
        headline="Meet NDIS Quality"
        headlineAccent="Safeguards"
        description="600,000+ Australians rely on NDIS providers to maintain safe accommodation. IICRC AMRT and WRT CEC courses build staff competency for NDIS Practice Standards audits — protecting participants and provider registration. CARSI courses earn IICRC CECs; they are not IICRC certification."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="NDIS & Disability Service Providers"
        headline="Built for"
        headlineAccent="participant safety"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="NDIS & Disability Services"
        disciplineList="AMRT, WRT & RRT"
        disciplines={['AMRT', 'WRT', 'RRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="NDIS Provider Training"
        title="NDIS Compliance Bundle"
        price={industryBundlePriceLabel('ndis-disability')}
        description="AMRT + WRT training for NDIS maintenance and facilities staff. Verifiable IICRC credentials for NDIS Quality and Safeguards Commission audits."
        ctaText="Train Your Maintenance Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
