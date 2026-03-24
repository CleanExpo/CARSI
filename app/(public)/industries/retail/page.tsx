import type { Metadata } from 'next';
import { Store, ShoppingCart, Wind } from 'lucide-react';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Retail & Shopping Centre IICRC Training | CARSI',
  description:
    'IICRC certification for shopping centre maintenance teams. Pre-qualify for major landlord panels with WRT, CRT and OCT credentials.',
  keywords: [
    'retail IICRC training',
    'shopping centre restoration',
    'retail property maintenance certification',
    'shopping centre water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [wrtRes, crtRes, octRes, fsrtRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=OCT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=FSRT&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const octData = octRes.ok ? await octRes.json() : { items: [] };
    const fsrtData = fsrtRes.ok ? await fsrtRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
      ...(octData.items ?? []),
      ...(fsrtData.items ?? []),
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

const ACCENT_COLOR = '#dc2626';

const disciplines = [
  { code: 'WRT', label: 'Water Damage Restoration', color: '#dc2626' },
  { code: 'CRT', label: 'Carpet Repair & Reinstallation', color: '#b91c1c' },
  { code: 'OCT', label: 'Odour Control', color: '#991b1b' },
  { code: 'FSRT', label: 'Fire & Smoke Restoration', color: '#7f1d1d' },
];

const stats = [
  { value: '2,000+', label: 'Shopping Centres' },
  { value: '$140B', label: 'Retail Sector' },
  { value: 'IICRC', label: 'Approved' },
];

const whyCards = [
  {
    icon: Store,
    title: 'Major Landlord Panels',
    description:
      'Pre-qualify for Scentre Group, Vicinity Centres, and GPT contractor panels. IICRC certification is increasingly required for preferred supplier status on major retail portfolios.',
    color: '#dc2626',
  },
  {
    icon: ShoppingCart,
    title: 'Tenant Restoration',
    description:
      'Rapid response capability for sprinkler activation, roof leaks, and storm damage across tenancies. Minimise trading hour disruption with certified water damage restoration technicians.',
    color: '#b91c1c',
  },
  {
    icon: Wind,
    title: 'Food Court Compliance',
    description:
      'OCT certification for odour control in food service areas. Maintain indoor air quality standards across food courts, ensuring compliance with centre management requirements.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function RetailIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Store}
        industryName="Retail & Shopping Centres"
        accentColor={ACCENT_COLOR}
        headline="Shopping Centre"
        headlineAccent="Restoration Training"
        description="IICRC-certified training for retail property maintenance teams. Pre-qualify for major landlord panels and deliver rapid-response restoration across shopping centre portfolios."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Retail Teams"
        headline="Built for"
        headlineAccent="retail environments"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Retail"
        disciplineList="WRT, CRT, OCT & FSRT"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Shopping Centre Training"
        title="Retail Contractor Bundle"
        price="$295"
        description="WRT + CRT + OCT training for shopping centre maintenance teams. Equip your crew for rapid tenant restoration and food court compliance."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
