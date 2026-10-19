import type { Metadata } from 'next';
import { Heart, Shield, Droplets, ClipboardCheck } from 'lucide-react';
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
  title: 'Restoration Training for NDIS & Disability Services',
  description:
    'Meet NDIS Practice Standards with mould and water damage courses. Mould remediation, water damage restoration and carpet cleaning continuing-education training for disability support providers. Online. CEC hours apply only to courses the IICRC has approved; not IICRC certification.',
  keywords: [
    'NDIS restoration training',
    'disability services mould training Australia',
    'mould remediation NDIS provider',
    'NDIS Practice Standards infection control',
    'mould remediation disability accommodation',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#5c6bc0';

const disciplines = [
  { code: 'AMRT', label: 'Mould remediation', color: '#5c6bc0' },
  { code: 'WRT', label: 'Water damage', color: '#4a5aa8' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#3949ab' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'NDIS', label: 'Practice Standards' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const faqs = [
  {
    question: 'What CARSI training suits NDIS service providers?',
    answer:
      'Providers supporting participants in supported independent living (SIL) or specialist disability accommodation (SDA) have a duty of care to keep homes safe and hygienic. CARSI mould remediation training covers identifying, containing and remediating mould, and water damage restoration training covers response to leaks and flooding in participant homes and shared accommodation.',
  },
  {
    question: 'How does mould affect NDIS participants and their accommodation?',
    answer:
      'Many NDIS participants have compromised immune systems, respiratory conditions or sensitivities that make mould exposure more dangerous than for the general population. Under the NDIS Practice Standards, providers must keep accommodation safe and hygienic. Mould remediation training helps maintenance staff identify and remediate mould before it becomes a compliance issue.',
  },
  {
    question: 'Does IICRC certification help NDIS providers during audits?',
    answer:
      'Yes. NDIS registration audits assess whether providers have documented policies and demonstrable staff competency for maintaining safe environments. Verifiable CARSI credentials and documented remediation procedures give auditors evidence of staff training. IICRC certification itself is obtained only through IICRC-approved schools and examinations.',
  },
  {
    question: 'Can support coordinators benefit from CARSI restoration awareness courses?',
    answer:
      'Support coordinators who recognise the signs of water damage and mould can advocate for participants and start remediation before conditions get worse. They do not do the remediation themselves, but CARSI awareness-level courses help them spot hazards during home visits, document concerns accurately and brief maintenance contractors, which supports better outcomes and stronger audit records.',
  },
];

const whyCards = [
  {
    icon: ClipboardCheck,
    title: 'NDIS Practice Standards',
    description:
      "Module 3 (Supports Provision Environment) requires safe, hygienic accommodation. CARSI's mould remediation training provides verifiable evidence of mould and remediation competency for audits.",
    color: '#5c6bc0',
  },
  {
    icon: Shield,
    title: 'Duty of Care Protection',
    description:
      'NDIS participants are often immunocompromised. Documented training demonstrates due diligence, reducing organisational liability under the NDIS Act and WHS legislation.',
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
        description="NDIS participants rely on providers to maintain safe accommodation. CARSI mould remediation and water damage restoration courses build staff competency for NDIS Practice Standards audits — protecting participants and provider registration. CARSI courses carry CARSI Southern Hemisphere Restoration Designations, not IICRC certification."
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
        disciplineList="Mould remediation, water damage restoration and carpet cleaning"
        disciplines={['AMRT', 'WRT', 'CRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryFAQSection industryName="NDIS and disability services" faqs={faqs} />

      <IndustryCTA
        subtitle="NDIS Provider Training"
        title="NDIS Compliance Bundle"
        price={industryBundlePriceLabel('ndis-disability')}
        description="mould remediation and water damage restoration training for NDIS maintenance and facilities staff. Every completed course issues a verifiable CARSI credential."
        ctaText="Train Your Maintenance Team"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
