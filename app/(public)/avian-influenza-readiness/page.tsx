import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Australian H5 Bird Flu Readiness for Restoration Professionals',
  description:
    'Calm, evidence-led CARSI guidance for Australian restoration, cleaning, IAQ and facility professionals responding to H5 bird flu questions without causing public alarm.',
  alternates: { canonical: 'https://carsi.com.au/avian-influenza-readiness' },
  openGraph: {
    title: 'Australian H5 Bird Flu Readiness | CARSI',
    description:
      'Official-source guidance, reporting steps, professional boundaries and training pathways for restoration and IAQ professionals.',
    type: 'article',
    url: 'https://carsi.com.au/avian-influenza-readiness',
  },
};

const officialSnapshot = [
  'As of 9am AEST, 5 July 2026, DAFF reported six confirmed H5 bird flu cases in wild birds: four in Western Australia, one in South Australia and one in New South Wales.',
  'DAFF states there is no evidence of mass mortality and no evidence of infection in poultry or the wider agriculture industry.',
  'The Australian Centre for Disease Control states the current risk to people in Australia is considered low.',
  'The official public action is to avoid contact, record what you see and report sick or dead birds or animals to the Emergency Animal Disease Hotline on 1800 675 888.',
];

const responseBoundaries = [
  'Do not touch, collect, move or dispose of sick or dead birds unless authorised by the relevant authority.',
  'Do not diagnose bird flu, declare a site disease-free or speak on behalf of government biosecurity or public-health agencies.',
  'Do not claim that dry fogging, Halo, Halosil, NeoSan or any other product is required by Australian Government control measures unless a specific written authority direction and product-label evidence supports that claim.',
  'Do support clients with site documentation, worker safety planning, clean/dirty zoning, cleaning records, disinfection records and escalation to the official hotline.',
];

const courseModules = [
  'Australian H5 bird flu awareness for restoration, cleaning, IAQ and facility teams',
  'Emergency Animal Disease Hotline reporting and public communication',
  'WHS, PPE, fit checking, hygiene and exposure-response basics',
  'Clean and dirty zones, access control and field documentation',
  'Cleaning before disinfection: source removal, organic load and contact time',
  'Dry fogging and hydrogen peroxide systems: evidence, limits, label compliance and documentation',
  'NeoSan product use: SDS, label, dilution, contact time and claim boundaries',
  'RestoreAssist.app field reporting for photos, tasks, PPE, cleaning, exceptions and sign-off',
  'Professional restoration industry boundaries, IICRC-aligned thinking and insurer-ready reporting',
];

const sourceLinks = [
  {
    label: 'Australian Government bird flu campaign page',
    href: 'https://www.agriculture.gov.au/campaigns/birdflu',
  },
  {
    label: 'DAFF H5 bird flu testing update, 4 July 2026',
    href: 'https://www.agriculture.gov.au/about/news/h5-bird-flu-testing-update',
  },
  {
    label: 'DAFF H5 bird flu update, 4 July 2026',
    href: 'https://www.agriculture.gov.au/about/news/h5-bird-flu-update',
  },
  {
    label: 'Australian Centre for Disease Control bird flu guidance',
    href: 'https://www.cdc.gov.au/diseases/bird-flu-avian-influenza',
  },
  {
    label: 'DAFF report suspected bird flu guidance',
    href: 'https://www.agriculture.gov.au/biosecurity-trade/pests-diseases-weeds/animal/avian-influenza/report',
  },
  {
    label: 'Animal Health Australia avian influenza threat update',
    href: 'https://animalhealthaustralia.com.au/resources/threat-updates/avian-influenza/',
  },
  {
    label: 'CDC H5N1 prevention, PPE and monitoring guidance',
    href: 'https://www.cdc.gov/bird-flu/prevention/hpai-interim-recommendations.html',
  },
  {
    label: 'CDC environmental infection-control principle: clean before disinfecting',
    href: 'https://www.cdc.gov/bird-flu/hcp/novel-flu-infection-control/index.html',
  },
];

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/30 underline-offset-4 hover:text-[#0f5fa8]">
      {children}
    </a>
  );
}

export default function AvianInfluenzaReadinessPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <p className="inline-flex rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#146fc2]">
            Calm official-source guidance
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Australian H5 bird flu readiness for restoration, cleaning and IAQ professionals
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            CARSI is publishing this page to help professional restoration, cleaning, indoor air quality and facility teams communicate clearly, act within scope and follow Australian Government advice without creating public alarm.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link href="/courses" className="rounded-lg bg-[#ed9d24] px-5 py-3 text-center text-sm font-bold text-slate-950 shadow-sm hover:bg-[#f2b14f]">
              View CARSI training
            </Link>
            <a href="https://restoreassist.app/" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-900 hover:border-[#146fc2]">
              Document with RestoreAssist
            </a>
            <a href="https://disasterrecovery.com.au/" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-900 hover:border-[#146fc2]">
              Find professional support
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8">
          <h2 className="text-2xl font-black text-emerald-950">The message is measured</h2>
          <p className="mt-3 text-sm leading-7 text-emerald-950/80">
            This is a readiness and reporting message. It is not a panic message. It follows the Australian Government position: detections are currently in migratory seabirds, there is no evidence of infection in poultry or the wider agriculture industry, and the risk to human health remains low.
          </p>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {officialSnapshot.map((item) => (
              <li key={item} className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-[#f2cf8f] bg-[#fff8ed] p-6 md:p-8">
          <h2 className="text-2xl font-black text-[#7a3500]">If sick or dead birds are found</h2>
          <p className="mt-3 text-lg font-bold text-[#7a3500]">Do not touch. Avoid contact. Record what you see. Report it.</p>
          <p className="mt-3 text-sm leading-7 text-[#7a3500]">
            The official national reporting pathway is the <strong>24-hour Emergency Animal Disease Hotline: 1800 675 888</strong>. This hotline must be prominent in every CARSI, RestoreAssist, DisasterRecovery.com.au and NRPG campaign asset.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-12 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Professional role and boundaries</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Professional Indoor Remediation and Air Quality members can assist with documentation, containment planning, worker-safety controls, cleaning records and disinfection records. The role is to support safer work and clearer reporting, not to replace government, veterinary, wildlife or public-health authorities.
          </p>
          <ul className="mt-5 space-y-3">
            {responseBoundaries.map((item) => (
              <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Dry fog and product-positioning rule</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Hydrogen peroxide dry-fog systems such as Halo or Halosil-style methods can only be presented as controlled, label-dependent, post-cleaning disinfection tools. They must not be presented as a government-required control measure for H5 bird flu unless an authority direction and product registration evidence says so.
          </p>
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            CARSI teaching position: <strong>clean first, disinfect second, document third.</strong> Source removal, pre-cleaning, organic-load reduction, correct product contact time, PPE, ventilation, re-entry safety and records all matter.
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">CARSI course pathway</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            The campaign converts into a 30-day training and public-education pathway for restoration, cleaning, IAQ, facilities, strata, property, insurance and contractor audiences.
          </p>
          <ol className="mt-6 grid gap-3 md:grid-cols-2">
            {courseModules.map((module, index) => (
              <li key={module} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#146fc2] text-xs font-black text-white">
                  {index + 1}
                </span>
                <span>{module}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Official and technical source register</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            These links are the source layer for public copy, course writing and backlink strategy. CARSI copy should link out to government and technical sources first, then link internally to CARSI training and RestoreAssist documentation.
          </p>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {sourceLinks.map((source) => (
              <li key={source.href} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6">
                <ExternalLink href={source.href}>{source.label}</ExternalLink>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-[#b8dbfb] bg-[#eef7ff] p-4 text-sm leading-7 text-slate-700">
            Backlink anchor: <strong>Australian H5 bird flu readiness training</strong> should point to this page. Supporting anchors should point to <ExternalLink href="https://restoreassist.app/">RestoreAssist.app</ExternalLink>, <ExternalLink href="https://disasterrecovery.com.au/">DisasterRecovery.com.au</ExternalLink> and the NRPG contractor network.
          </div>
        </div>
      </section>
    </main>
  );
}
