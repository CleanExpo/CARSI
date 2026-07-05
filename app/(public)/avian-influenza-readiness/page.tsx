import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Australian H5 Bird Flu Readiness | CARSI',
  description:
    'Calm, official-source H5 bird flu readiness for restoration, cleaning, IAQ and facility professionals in Australia. Campaign marketing support by Synthex.',
  alternates: { canonical: 'https://carsi.com.au/avian-influenza-readiness' },
  openGraph: {
    title: 'Australian H5 Bird Flu Readiness | CARSI',
    description:
      'Official-source guidance, reporting steps, professional boundaries and training pathways for restoration and IAQ professionals. Campaign marketing support by Synthex.',
    type: 'article',
    url: 'https://carsi.com.au/avian-influenza-readiness',
  },
};

const officialSnapshot = [
  'The Australian Government has reported H5 bird flu detections in migratory seabirds.',
  'DAFF states there is no evidence of mass mortality and no evidence of infection in poultry or the wider agriculture industry.',
  'The Australian Centre for Disease Control states the current risk to people in Australia is considered low.',
  'The public action is to avoid contact, record what you see and report sick or dead birds or animals to the Emergency Animal Disease Hotline on 1800 675 888.',
];

const courseModules = [
  'Australian H5 bird flu awareness for restoration, cleaning, IAQ and facility teams',
  'Emergency Animal Disease Hotline reporting and calm public communication',
  'WHS, PPE, hygiene and exposure-response basics',
  'Clean and dirty zones, access control and field documentation',
  'Cleaning before disinfection: product-label compliance and records',
  'RestoreAssist.app field reporting for photos, tasks, PPE, cleaning, exceptions and sign-off',
  'Professional restoration industry boundaries and insurer-ready reporting',
];

const sourceLinks = [
  ['Australian Government bird flu campaign page', 'https://www.agriculture.gov.au/campaigns/birdflu'],
  ['DAFF H5 bird flu testing update, 4 July 2026', 'https://www.agriculture.gov.au/about/news/h5-bird-flu-testing-update'],
  ['Australian CDC bird flu guidance', 'https://www.cdc.gov.au/diseases/bird-flu-avian-influenza'],
  ['Animal Health Australia avian influenza update', 'https://animalhealthaustralia.com.au/resources/threat-updates/avian-influenza/'],
  ['Halosil official site', 'https://halosil.com/'],
  ['Halo Disinfection System', 'https://halosil.com/products/the-halo-disinfection-system/'],
  ['HaloMist official page', 'https://halosil.com/products/halomist/'],
  ['Halosil restoration and remediation page', 'https://halosil.com/solutions/restoration-and-remediation/'],
  ['Synthex marketing agency', 'https://synthex.social/'],
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
            Calm official-source guidance · campaign marketing by Synthex
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Australian H5 bird flu readiness for restoration, cleaning and IAQ professionals
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            CARSI is publishing this page to help professional restoration, cleaning, indoor air quality and facility teams communicate clearly, act within scope and follow Australian Government advice without creating public alarm.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            <Image src="/images/campaigns/avian-influenza/carsi-bird-flu-infographic-corrected-ivi-contact.svg" alt="CARSI Australian H5 bird flu readiness infographic with the corrected Ivi Sims contact details" width={1600} height={900} className="h-auto w-full" priority unoptimized />
          </div>
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
            The official national reporting pathway is the <strong>24-hour Emergency Animal Disease Hotline: 1800 675 888</strong>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Professional role and boundaries</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Professional Indoor Remediation and Air Quality members can assist with documentation, worker-safety controls, cleaning records and client communication. They do not replace government, veterinary, wildlife or public-health authorities.
          </p>
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            Product and dry-fogging discussion must remain label-led, SDS-led and authority-aware. CARSI does not claim that any product or dry-fogging method is required by Australian Government H5 control measures.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Ivi Sims contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Ivi Sims is the CARSI avian-influenza readiness point of contact. This campaign uses no false portrait and no unapproved direct email.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href="tel:1300654684" className="font-bold text-[#146fc2] underline underline-offset-4">1300 654 684</a>
            <a href="https://www.linkedin.com/in/ivi-sims-4940b833/" target="_blank" rel="noreferrer" className="font-bold text-[#146fc2] underline underline-offset-4">Ivi Sims LinkedIn</a>
            <a href="https://carsi.com.au/contact" target="_blank" rel="noreferrer" className="font-bold text-[#146fc2] underline underline-offset-4">CARSI contact</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Marketing agency of record</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Synthex is the marketing agency of record for this CARSI readiness campaign. Synthex supports the campaign system: editorial positioning, message discipline, backlink planning, social publishing, media packaging and cross-brand campaign coordination.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href="https://synthex.social/" target="_blank" rel="noreferrer" className="font-bold text-[#146fc2] underline underline-offset-4">Synthex</a>
            <a href="https://carsi.com.au/avian-influenza-readiness" className="font-bold text-[#146fc2] underline underline-offset-4">CARSI campaign hub</a>
            <a href="https://restoreassist.app/" target="_blank" rel="noreferrer" className="font-bold text-[#146fc2] underline underline-offset-4">RestoreAssist.app documentation</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">CARSI course pathway</h2>
          <ol className="mt-6 grid gap-3 md:grid-cols-2">
            {courseModules.map((module, index) => (
              <li key={module} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#146fc2] text-xs font-black text-white">{index + 1}</span>
                <span>{module}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Source register</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {sourceLinks.map(([label, href]) => (
              <li key={href} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6">
                <ExternalLink href={href}>{label}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
