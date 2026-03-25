import type { Metadata } from 'next';
import { GraduationCap, ShieldCheck, Building, Users } from 'lucide-react';
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
  title: 'Education Sector IICRC Training | CARSI',
  description:
    'IICRC certification for school and university maintenance teams. WRT, CRT, AMRT and ASD training for Australian education facilities.',
  keywords: [
    'education IICRC training',
    'school restoration certification',
    'university maintenance IICRC',
    'education mould remediation Australia',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [amrtRes, wrtRes, crtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=CRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const crtData = crtRes.ok ? await crtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(wrtData.items ?? []),
      ...(crtData.items ?? []),
      ...(asdData.items ?? []),
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

const ACCENT_COLOR = '#2196f3';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#2196f3' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#1976d2' },
  { code: 'CRT', label: 'Carpet Repair & Reinstallation', color: '#1565c0' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#0d47a1' },
];

const stats = [
  { value: '9,500+', label: 'Schools' },
  { value: 'WHS', label: 'Compliance' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const whyCards = [
  {
    icon: ShieldCheck,
    title: 'Duty of Care',
    description:
      'Schools must demonstrate competency in mould identification and remediation. IICRC training provides documented evidence of due diligence for student and staff safety.',
    color: '#2196f3',
  },
  {
    icon: Building,
    title: 'Heritage Buildings',
    description:
      'Many older school buildings require specialised structural drying techniques. ASD certification ensures heritage fabric is preserved during water damage restoration.',
    color: '#1976d2',
  },
  {
    icon: Users,
    title: 'Parent Council Confidence',
    description:
      'IICRC credentials provide documented proof of competency that satisfies parent council scrutiny and school board reporting requirements.',
    color: '#ed9d24',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function EducationIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <IndustryHero
        icon={GraduationCap}
        industryName="Education"
        accentColor={ACCENT_COLOR}
        headline="Education Facility"
        headlineAccent="Restoration Training"
        description="WHS-compliant training for schools, universities, and TAFEs. IICRC credentials demonstrate duty of care for mould remediation and water damage response across education facilities."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Education Facilities"
        headline="Built for"
        headlineAccent="student safety"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Education"
        disciplineList="AMRT, WRT, CRT & ASD"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Education Facility Training"
        title="Education Facility Bundle"
        price="$295"
        description="AMRT + WRT training for school maintenance teams. Bulk 10+ seat licensing available for education departments and school networks."
        ctaText="Request Education Pricing"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
