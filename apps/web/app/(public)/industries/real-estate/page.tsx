import type { Metadata } from 'next';
import { Home, FileCheck, TrendingUp, Shield } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IICRC Training for Real Estate & Property Sales | CARSI Australia',
  description:
    'Vendor disclosure compliance and pre-sale remediation. IICRC WRT, ASD, and AMRT certification for real estate agents, property managers, and conveyancers. Online, CEC approved.',
  keywords: [
    'real estate IICRC training Australia',
    'water damage disclosure property',
    'mould training real estate agent',
    'WRT property sales certification',
    'pre-sale remediation training',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const [wrtRes, asdRes, amrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };
    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(asdData.items ?? []),
      ...(amrtData.items ?? []),
    ]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        combined.push(c);
      }
    }
    return combined;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#ff7043';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#ff7043' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#f4511e' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#e64a19' },
];

const stats = [
  { value: '1.1M+', label: 'Annual Transactions (AUS)' },
  { value: 'ACL', label: 'Disclosure Required' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'Do real estate agents need water damage and mould training in Australia?',
    answer:
      'Real estate agents in Australia are not legally required to hold IICRC certification, but they have a statutory obligation under Australian Consumer Law and state-specific property acts to disclose known material defects — including water damage and mould — to prospective buyers. IICRC WRT and AMRT training equips agents to identify moisture damage and mould during property inspections, protecting them from non-disclosure liability and enabling them to advise vendors on required remediation before listing.',
  },
  {
    question:
      'What are vendor disclosure obligations for water damage in Australian property sales?',
    answer:
      "Each state has specific vendor disclosure requirements. In most jurisdictions, sellers must disclose material defects that would affect a reasonable buyer's decision, which includes known water penetration, mould contamination, and structural drying history. IICRC-trained real estate agents can identify these defects during pre-listing inspections, document them accurately in vendor disclosure statements, and advise on IICRC-compliant remediation to maximise sale price and minimise post-settlement disputes.",
  },
  {
    question: 'How does IICRC certification help during property sales transactions?',
    answer:
      'IICRC-certified agents can accurately assess water damage severity, distinguish between active and historic moisture intrusion, and interpret moisture meter readings and thermal imaging results — skills that are increasingly expected as buyers become more sophisticated. An agent who can credibly discuss IICRC remediation standards builds vendor and buyer confidence, reduces the risk of sale collapse from building inspections, and supports faster settlement by providing documented remediation evidence when required.',
  },
  {
    question: 'What is moisture mapping and why does it matter for real estate?',
    answer:
      'Moisture mapping is a systematic process of recording moisture readings across a property using calibrated meters and thermal imaging — producing a documented baseline of moisture conditions. In real estate, moisture maps are used to verify that remediation has been completed to IICRC standard before settlement, to resolve building inspection disputes, and to support insurance claims for storm or flood damage. IICRC WRT and ASD training includes moisture mapping methodology, making trained agents significantly more effective in complex property transactions.',
  },
];

const whyCards = [
  {
    icon: FileCheck,
    title: 'Vendor Disclosure Compliance',
    description:
      'Water damage and mould are material defects requiring disclosure under Australian Consumer Law. IICRC training equips agents to identify, document, and disclose these defects accurately — minimising post-settlement liability.',
    color: '#ff7043',
  },
  {
    icon: TrendingUp,
    title: 'Pre-Sale Remediation Value',
    description:
      'IICRC-certified remediation before listing commands a higher sale price and reduces building inspection failures. Trained agents can brief vendors on required work and verify completion to standard.',
    color: '#f4511e',
  },
  {
    icon: Shield,
    title: 'Professional Indemnity Protection',
    description:
      'Non-disclosure of known defects is the leading source of real estate professional indemnity claims. IICRC awareness training demonstrates due diligence and supports a defensible inspection record.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function RealEstateIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Home}
        industryName="Real Estate & Property Sales"
        accentColor={ACCENT_COLOR}
        headline="Pre-Sale Remediation"
        headlineAccent="& Disclosure Compliance"
        description="1.1 million Australian property transactions per year carry water damage and mould disclosure obligations. IICRC WRT and AMRT training gives real estate professionals the knowledge to identify, document, and advise on remediation — protecting vendors, buyers, and agents."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Real Estate Professionals"
        headline="Built for"
        headlineAccent="property confidence"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Real Estate & Property"
        disciplineList="WRT, ASD & AMRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Real Estate Training"
        title="Property Professional Bundle"
        price="$225"
        description="WRT + AMRT awareness training for real estate agents, conveyancers, and property managers. Identify water damage and mould during inspections with IICRC-recognised credentials."
        ctaText="Protect Your Practice"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
