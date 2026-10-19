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
import { industryBundlePriceLabel } from '@/lib/lms/pricing-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Retail & Shopping Centre Restoration Training',
  description:
    'Water damage restoration, carpet cleaning and odour control training for shopping centre maintenance teams.',
  keywords: [
    'retail restoration training',
    'shopping centre restoration',
    'retail property maintenance training',
    'shopping centre water damage Australia',
  ],
};

// ---------------------------------------------------------------------------
// Page Configuration
// ---------------------------------------------------------------------------

const ACCENT_COLOR = '#dc2626';

const disciplines = [
  { code: 'WRT', label: 'Water damage', color: '#dc2626' },
  { code: 'CRT', label: 'Carpet cleaning', color: '#b91c1c' },
  { code: 'OCT', label: 'Odour control', color: '#991b1b' },
  { code: 'FSRT', label: 'Fire and smoke', color: '#7f1d1d' },
];

const stats = [
  { value: 'Online', label: 'Self-paced study' },
  { value: 'CARSI', label: 'Verifiable credentials' },
  { value: 'IICRC CEC', label: 'On approved courses' },
];

const whyCards = [
  {
    icon: Store,
    title: 'Contractor Panels',
    description:
      'Contractor panels set their own requirements, so check what each one asks for; IICRC certification, where a panel asks for it, comes only from IICRC-approved schools and examinations.',
    color: '#dc2626',
  },
  {
    icon: ShoppingCart,
    title: 'Tenant Restoration',
    description:
      'Rapid response capability for sprinkler activation, roof leaks, and storm damage across tenancies. Minimise trading hour disruption with trained water damage restoration technicians.',
    color: '#b91c1c',
  },
  {
    icon: Wind,
    title: 'Food Court Compliance',
    description:
      'Odour control training for food service areas, covering indoor air quality in food courts.',
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
        description="Restoration training for retail property maintenance teams, for rapid-response restoration across shopping centre portfolios."
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
        disciplineList="Water damage restoration, carpet cleaning, odour control and fire & smoke restoration"
        disciplines={['WRT', 'CRT', 'OCT', 'FSRT']}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Shopping Centre Training"
        title="Retail Contractor Bundle"
        price={industryBundlePriceLabel('retail')}
        description="water damage restoration, carpet cleaning and odour control training for shopping centre maintenance teams. Equip your crew for rapid tenant restoration and food court compliance."
        ctaText="Get Started"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
