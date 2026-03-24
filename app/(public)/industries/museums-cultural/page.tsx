import type { Metadata } from 'next';
import { Landmark, Shield, Droplets, Thermometer } from 'lucide-react';
import {
  IndustryPageLayout,
  IndustryHero,
  IndustryWhySection,
  IndustryCourseSection,
  IndustryCTA,
  ContractorAddOns,
} from '@/components/industries';
import { FAQSchema } from '@/components/seo/JsonLd';
import { getBackendOrigin } from '@/lib/env/public-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Museums & Cultural Institutions IICRC Training | CARSI',
  description:
    'Heritage preservation and artifact protection training for Australian museums, galleries, and cultural institutions. AMRT, WRT and ASD courses for climate-controlled environments.',
  keywords: [
    'museum IICRC training Australia',
    'heritage preservation restoration',
    'artifact protection water damage',
    'AMRT mould remediation museum',
    'cultural institution restoration training',
  ],
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function getIndustryCourses() {
  const backendUrl = getBackendOrigin();
  try {
    const [amrtRes, wrtRes, asdRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses?discipline=AMRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=WRT&limit=8`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/lms/courses?discipline=ASD&limit=8`, { next: { revalidate: 60 } }),
    ]);

    const amrtData = amrtRes.ok ? await amrtRes.json() : { items: [] };
    const wrtData = wrtRes.ok ? await wrtRes.json() : { items: [] };
    const asdData = asdRes.ok ? await asdRes.json() : { items: [] };

    const seen = new Set<string>();
    const combined = [];
    for (const c of [
      ...(amrtData.items ?? []),
      ...(wrtData.items ?? []),
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

const ACCENT_COLOR = '#8B6914';

const disciplines = [
  { code: 'AMRT', label: 'Applied Microbial Remediation', color: '#8B6914' },
  { code: 'WRT', label: 'Water Damage Restoration', color: '#7A5C12' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#6B5010' },
];

const stats = [
  { value: '1,200+', label: 'Museums & Galleries' },
  { value: 'ISO', label: '11799 Aligned' },
  { value: 'IICRC', label: 'CEC Approved' },
];

const faqs = [
  {
    question: 'What IICRC training do Australian museums need for heritage preservation?',
    answer:
      'Australian museums and cultural institutions benefit most from AMRT (Applied Microbial Remediation) for mould prevention in collection storage, WRT (Water Damage Restoration) for emergency response to leaks or flooding near artefacts, and ASD (Applied Structural Drying) for controlling moisture in climate-sensitive exhibition spaces. These certifications support ISO 11799 and AICCM guidelines for collection care.',
  },
  {
    question: 'How does mould affect museum collections and how does IICRC training help?',
    answer:
      'Mould poses a critical threat to paper, textile, and organic artefacts in museum storage. IICRC AMRT training teaches staff to identify microbial growth early, implement containment protocols, and remediate without damaging collection items. For Australian institutions in humid coastal climates, this training is essential for preventive conservation programs.',
  },
  {
    question: 'Can gallery and museum staff complete IICRC training online?',
    answer:
      'Yes. CARSI delivers all IICRC CEC-approved courses online and self-paced, ideal for museum staff who need to maintain building operations during opening hours. Courses can be completed around exhibition schedules and issue verifiable digital credentials on completion.',
  },
  {
    question: 'What is the emergency response protocol for water damage in a museum?',
    answer:
      'IICRC WRT training covers triage-based water damage response: isolate the source, protect high-value items, extract standing water, and deploy drying equipment. For museums, this includes specific protocols for waterlogged documents, textiles, and framed works. ASD training complements this with structural moisture monitoring to prevent secondary mould growth.',
  },
];

const whyCards = [
  {
    icon: Shield,
    title: 'Heritage Preservation',
    description:
      'Protect irreplaceable artefacts and collection items. IICRC training equips staff with standards-based response protocols aligned to AICCM conservation guidelines.',
    color: '#8B6914',
  },
  {
    icon: Droplets,
    title: 'Water Damage Response',
    description:
      'Roof leaks, pipe bursts, and flooding near collection storage demand immediate, trained response. WRT certification ensures your team can triage and protect high-value items.',
    color: '#7A5C12',
  },
  {
    icon: Thermometer,
    title: 'Climate Control Recovery',
    description:
      'HVAC failures in climate-controlled galleries and archives risk mould outbreaks. ASD training provides the moisture management expertise to stabilise environments quickly.',
    color: '#2490ed',
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function MuseumsCulturalIndustryPage() {
  const courses = await getIndustryCourses();

  return (
    <IndustryPageLayout>
      <FAQSchema questions={faqs} />
      <IndustryHero
        icon={Landmark}
        industryName="Museums & Cultural Institutions"
        accentColor={ACCENT_COLOR}
        headline="Museum & Gallery"
        headlineAccent="Preservation Training"
        description="Heritage preservation training for Australia's 1,200+ museums, galleries, and cultural institutions. IICRC credentials for artefact protection, mould prevention, and climate-controlled environment recovery."
        disciplines={disciplines}
        stats={stats}
      />

      <IndustryWhySection
        industryName="Cultural Institutions"
        headline="Built for"
        headlineAccent="heritage protection"
        cards={whyCards}
      />

      <IndustryCourseSection
        industryName="Museums & Galleries"
        disciplineList="AMRT, WRT & ASD"
        courses={courses}
      />

      <ContractorAddOns accentColor={ACCENT_COLOR} />

      <IndustryCTA
        subtitle="Cultural Institution Training"
        title="Heritage Preservation Bundle"
        price="$265"
        description="AMRT + WRT + ASD training for museum and gallery teams. Includes collection-specific emergency response protocols. Online, self-paced — fits around exhibition schedules."
        ctaText="Protect Your Collection"
        accentColor={ACCENT_COLOR}
      />
    </IndustryPageLayout>
  );
}
