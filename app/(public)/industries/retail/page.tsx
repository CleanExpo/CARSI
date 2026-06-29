import type { Metadata } from 'next';
import { Store, ShoppingCart, Wind } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { IndustryRecommendedCourses } from '@/components/industries/IndustryRecommendedCourses';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Retail & Shopping Centre IICRC CEC Training',
  description:
    'IICRC CEC training for shopping centre maintenance teams. Pre-qualify for major landlord panels with WRT, CRT and OCT credentials.',
  keywords: [
    'retail IICRC CEC training',
    'shopping centre restoration',
    'retail property maintenance certification',
    'shopping centre water damage Australia',
  ],
};

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
  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={Store}
        industryName="Retail & Shopping Centres"
        accentColor={ACCENT_COLOR}
        headline="Shopping Centre"
        headlineAccent="Restoration Training"
        description="IICRC-aligned training for retail property maintenance teams. Pre-qualify for major landlord panels and deliver rapid-response restoration across shopping centre portfolios."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Retail Teams"
        headline="Built for"
        headlineAccent="retail environments"
        cards={whyCards}
      />

      <IndustryRecommendedCourses
        industryName="Retail & Shopping Centres"
        disciplineList="WRT, CRT, OCT & FSRT"
        disciplines={['WRT', 'CRT', 'OCT', 'FSRT']}
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
