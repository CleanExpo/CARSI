import type { Metadata } from 'next';
import { Wrench, DollarSign, Shield, TrendingUp } from 'lucide-react';
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
  title: 'IICRC Training for Plumbers & Trades | CARSI Australia',
  description:
    'Turn water damage call-outs into drying contracts. IICRC WRT and ASD certification for Australian plumbers and trade contractors — online, self-paced, CEC approved.',
  keywords: [
    'IICRC training plumbers Australia',
    'WRT certification plumbing',
    'water damage restoration plumber',
    'ASD structural drying trade',
    'IICRC plumber certification online',
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

const ACCENT_COLOR = '#0097a7';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#0097a7' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#00838f' },
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#006978' },
];

const stats = [
  { value: '85,000+', label: 'Licensed Plumbers (AUS)' },
  { value: 'WHS', label: 'Act Compliant' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'Do plumbers need IICRC certification in Australia?',
    answer:
      'IICRC certification is not a legal requirement for plumbers in Australia, but it provides a significant commercial advantage. WRT (Water Damage Restoration Technician) certification allows licensed plumbers to legally and credibly perform — and invoice for — structural drying services after fixing the source of water damage. Many insurers specify IICRC-certified contractors for remediation scopes, making certification essential for accessing insurance-funded work.',
  },
  {
    question: 'What is WRT training and how does it help a plumbing business?',
    answer:
      'WRT (Water Damage Restoration Technician) is the IICRC foundation course covering moisture behaviour in building materials, psychrometrics, drying equipment placement, and documentation requirements. For a plumbing contractor, WRT training means you can identify hidden moisture damage behind walls, set up drying equipment, and submit a compliant drying report to the insurer — turning a standard repair call-out into a multi-day drying contract that significantly increases per-job revenue.',
  },
  {
    question: 'How does IICRC training increase plumbing revenue per call-out?',
    answer:
      'Most plumbing call-outs involving burst pipes, flexi-hose failures, or roof leaks leave wet structural materials behind. Without restoration certification, plumbers fix the source and leave — the customer engages a separate remediation contractor. IICRC-certified plumbers can perform the full scope: fix the source, extract water, place drying equipment, and document the process. Average Australian water damage restoration jobs range from $2,500 to $15,000, representing significant additional revenue per call-out.',
  },
  {
    question: 'Can I complete IICRC training online while running a plumbing business?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and fully self-paced. There are no fixed class times — modules are completed between jobs, in the evening, or on weekends. Most WRT courses take 8–12 hours of study, which plumbers typically spread over two weeks. On completion, you receive a verifiable digital credential and IICRC Continuing Education Credits (CECs) towards your professional standing.',
  },
];

const whyCards = [
  {
    icon: DollarSign,
    title: 'Turn Call-Outs Into Contracts',
    description:
      'Every burst pipe, flexi-hose failure, or roof leak leaves wet structure behind. IICRC certification lets you legally perform and invoice for the full drying scope — not just the repair.',
    color: '#0097a7',
  },
  {
    icon: Shield,
    title: 'WHS & Insurer Credibility',
    description:
      'Water damage is a notifiable hazard under Australian WHS legislation. IICRC credentials demonstrate due diligence and are specified by leading insurers for remediation scopes.',
    color: '#00838f',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Per Job',
    description:
      'Australian water damage restoration averages $2,500–$15,000 per job. Certified plumbers capture this revenue directly rather than referring out.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function PlumbingTradesIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Wrench}
        industryName="Plumbing & Trades"
        accentColor={ACCENT_COLOR}
        headline="Turn Call-Outs Into"
        headlineAccent="Drying Contracts"
        description="85,000+ licensed Australian plumbers leave water damage behind every day. IICRC WRT and ASD certification gives your trade business the credentials to capture the full remediation scope — and the revenue that comes with it."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Plumbing & Trade Contractors"
        headline="Built for"
        headlineAccent="trade businesses"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Plumbing & Trades"
        disciplineList="WRT, ASD & AMRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Plumbing & Trades Training"
        title="Trades Restoration Bundle"
        price="$245"
        description="WRT + ASD training for licensed plumbers and trade contractors. Complete online between jobs. IICRC CEC approved."
        ctaText="Add Restoration to Your Business"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
