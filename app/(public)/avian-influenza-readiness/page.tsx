import type { Metadata } from 'next'
import Link from 'next/link'

const pageUrl = 'https://carsi.com.au/avian-influenza-readiness'
const heroImage =
  'https://carsi.com.au/images/campaigns/avian-influenza/course/public-reporting-process-infographic.png'
const datePublished = '2026-07-05T09:00:00+10:00'
const dateModified = '2026-07-05T12:00:00+10:00'

export const metadata: Metadata = {
  title: 'Australian H5 Bird Flu Readiness | CARSI Training, IAQ & Restoration Guidance',
  description:
    'Official-source Australian H5 readiness guidance for restoration, cleaning, IAQ and facility professionals: hotline reporting, worker safety, documentation, dry-fogging limits and CARSI training. Campaign marketing by Synthex.',
  keywords: [
    'Australian H5 bird flu readiness',
    'bird flu hotline Australia',
    'avian influenza restoration training Australia',
    'H5 cleaning protocol Australia',
    'IAQ biosecurity training',
    'RestoreAssist field documentation',
    'Halosil dry fogging compliance',
    'CARSI biosecurity readiness',
  ],
  alternates: { canonical: pageUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'Australian H5 Bird Flu Readiness | CARSI',
    description:
      'Official-source guidance, reporting steps, professional boundaries and training pathways for restoration and IAQ professionals. Campaign marketing support by Synthex.',
    type: 'article',
    url: pageUrl,
    publishedTime: datePublished,
    modifiedTime: dateModified,
    images: [{ url: heroImage, width: 1672, height: 941, alt: 'CARSI Australian H5 public reporting process infographic' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Australian H5 Bird Flu Readiness | CARSI',
    description:
      'Report first, protect workers, document clearly. Official-source readiness guidance for Australian restoration and IAQ professionals.',
    images: [heroImage],
  },
}

const officialSnapshot = [
  'The Australian Government has reported H5 bird flu detections in migratory seabirds.',
  'DAFF states there is no evidence of mass mortality and no evidence of infection in poultry or the wider agriculture industry.',
  'The Australian Centre for Disease Control states the current risk to people in Australia is considered low.',
  'The public action is to avoid contact, record what you see and report sick or dead birds or animals to the Emergency Animal Disease Hotline on 1800 675 888.',
]

const courseModules = [
  'Australian H5 bird flu awareness for restoration, cleaning, IAQ and facility teams',
  'Emergency Animal Disease Hotline reporting and calm public communication',
  'WHS, PPE, hygiene and exposure-response basics',
  'Clean and dirty zones, access control and field documentation',
  'Cleaning before disinfection: product-label compliance and records',
  'RestoreAssist.app field reporting for photos, tasks, PPE, cleaning, exceptions and sign-off',
  'Professional restoration industry boundaries and insurer-ready reporting',
]

const sourceLinks: [string, string][] = [
  ['Australian Government bird flu campaign page', 'https://www.agriculture.gov.au/campaigns/birdflu'],
  ['DAFF H5 bird flu testing update, 4 July 2026', 'https://www.agriculture.gov.au/about/news/h5-bird-flu-testing-update'],
  ['Australian CDC bird flu guidance', 'https://www.cdc.gov.au/diseases/bird-flu-avian-influenza'],
  ['Animal Health Australia avian influenza update', 'https://animalhealthaustralia.com.au/resources/threat-updates/avian-influenza/'],
  ['Halosil official site', 'https://halosil.com/'],
  ['Halo Disinfection System', 'https://halosil.com/products/the-halo-disinfection-system/'],
  ['HaloMist official page', 'https://halosil.com/products/halomist/'],
  ['Halosil restoration and remediation page', 'https://halosil.com/solutions/restoration-and-remediation/'],
  ['Synthex marketing agency', 'https://synthex.social/'],
]

const answerBlocks = [
  {
    question: 'What should I do if I find a sick or dead bird in Australia?',
    answer:
      'Do not touch, collect or move it. Keep people and pets away, record the location, take photos or video only if safe, and report it to the 24-hour Emergency Animal Disease Hotline on 1800 675 888.',
  },
  {
    question: 'Is Australian H5 bird flu currently a human-health emergency?',
    answer:
      'The current public message is measured. Australian Government sources report H5 detections in migratory seabirds and state that the current risk to people in Australia is considered low.',
  },
  {
    question: 'Can restoration contractors handle sick or dead birds?',
    answer:
      'Restoration, cleaning and IAQ professionals should not handle sick or dead birds unless authorised. Their role is supporting documentation, access control, worker-safety records, cleaning records and client communication within scope.',
  },
  {
    question: 'Is dry fogging required for Australian H5 control measures?',
    answer:
      'CARSI does not claim that dry fogging, Halosil, HaloFogger, NeoSan or any product is required by Australian Government H5 control measures. Product discussion must remain label-led, SDS-led, authority-aware and evidence-backed.',
  },
]

const backlinkEcosystem = [
  {
    name: 'CARSI',
    role: 'Cleaning and Restoration Science Institute — training and readiness publisher.',
    href: 'https://carsi.com.au/',
  },
  {
    name: 'RestoreAssist.app',
    role: 'Field documentation partner for photos, tasks, PPE, cleaning and sign-off.',
    href: 'https://restoreassist.app/',
  },
  {
    name: 'DisasterRecovery.com.au',
    role: 'Network partner for professional restoration support across Australia.',
    href: 'https://disasterrecovery.com.au/',
  },
  {
    name: 'NRPG',
    role: 'National restoration network partner.',
    href: 'https://disasterrecovery.com.au/',
  },
  {
    name: 'Synthex',
    role: 'Marketing agency of record for this readiness campaign.',
    href: 'https://synthex.social/',
  },
]

const faqItems = answerBlocks.map((item) => ({
  '@type': 'Question',
  name: item.question,
  acceptedAnswer: { '@type': 'Answer', text: item.answer },
}))

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: 'Australian H5 Bird Flu Readiness for Restoration, Cleaning and IAQ Professionals',
      description: metadata.description,
      datePublished,
      dateModified,
      isPartOf: { '@id': 'https://carsi.com.au/#website' },
      about: [
        { '@type': 'Thing', name: 'H5 avian influenza readiness' },
        { '@type': 'Thing', name: 'restoration industry training' },
        { '@type': 'Thing', name: 'indoor air quality documentation' },
      ],
      primaryImageOfPage: { '@id': `${pageUrl}#primaryimage` },
      reviewedBy: { '@id': 'https://www.linkedin.com/in/ivi-sims-4940b833/#person' },
      publisher: { '@id': 'https://carsi.com.au/#organization' },
    },
    {
      '@type': 'ImageObject',
      '@id': `${pageUrl}#primaryimage`,
      url: heroImage,
      width: 1672,
      height: 941,
      caption:
        'CARSI Australian H5 public reporting process infographic.',
    },
    {
      '@type': 'Article',
      '@id': `${pageUrl}#article`,
      headline: 'Australian H5 Bird Flu Readiness for Restoration, Cleaning and IAQ Professionals',
      description: metadata.description,
      image: [heroImage],
      datePublished,
      dateModified,
      author: [{ '@id': 'https://carsi.com.au/#organization' }],
      contributor: [{ '@id': 'https://synthex.social/#organization' }],
      reviewedBy: { '@id': 'https://www.linkedin.com/in/ivi-sims-4940b833/#person' },
      publisher: { '@id': 'https://carsi.com.au/#organization' },
      mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
      citation: sourceLinks.slice(0, 4).map(([, href]) => href),
    },
    {
      '@type': 'Organization',
      '@id': 'https://carsi.com.au/#organization',
      name: 'CARSI',
      alternateName: 'Cleaning and Restoration Science Institute',
      url: 'https://carsi.com.au/',
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'customer support', areaServed: 'AU', url: 'https://carsi.com.au/contact' },
      ],
      sameAs: ['https://carsi.com.au/contact'],
    },
    {
      '@type': 'Organization',
      '@id': 'https://synthex.social/#organization',
      name: 'Synthex',
      url: 'https://synthex.social/',
      description: 'Marketing agency of record for the CARSI H5 readiness campaign.',
    },
    {
      '@type': 'Person',
      '@id': 'https://www.linkedin.com/in/ivi-sims-4940b833/#person',
      name: 'Ivi Sims',
      url: 'https://www.linkedin.com/in/ivi-sims-4940b833/',
      jobTitle: 'CARSI avian-influenza readiness point of contact',
      affiliation: { '@id': 'https://carsi.com.au/#organization' },
    },
    {
      '@type': 'Course',
      '@id': `${pageUrl}#course`,
      name: 'Australian H5 Bird Flu Awareness for Restoration, IAQ and Facility Professionals',
      description:
        'CARSI readiness training covering official reporting, WHS, PPE, professional boundaries, cleaning records and RestoreAssist documentation.',
      provider: { '@id': 'https://carsi.com.au/#organization' },
      educationalLevel: 'Professional awareness',
      teaches: courseModules,
      isAccessibleForFree: true,
    },
    {
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: faqItems,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://carsi.com.au/' },
        { '@type': 'ListItem', position: 2, name: 'Australian H5 readiness', item: pageUrl },
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${pageUrl}#sources`,
      name: 'Official and technical source register',
      itemListElement: sourceLinks.map(([label, href], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: label,
        url: href,
      })),
    },
  ],
}

function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#146fc2] underline decoration-[#146fc2]/30 underline-offset-4 transition-colors hover:decoration-[#146fc2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
    >
      {children}
    </a>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#146fc2]">{children}</p>
}

export default function AvianInfluenzaReadinessPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      {/* Masthead */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#146fc2] text-sm font-bold text-white">
              C
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">CARSI</p>
              <p className="text-xs text-slate-600">Cleaning &amp; Restoration Science Institute</p>
            </div>
          </div>
          <a
            href="tel:1800675888"
            className="hidden items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 sm:inline-flex"
          >
            Report: 1800 675 888
          </a>
        </div>
      </header>

      {/* 1. Hero briefing + 2. Public action box (above the fold) */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <SectionLabel>Public-interest readiness briefing</SectionLabel>
            <h1 className="mt-4 text-pretty font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Australian H5 bird flu readiness for restoration, cleaning and IAQ professionals
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              CARSI is publishing this page to help professional restoration, cleaning, indoor air quality and facility
              teams communicate clearly, act within scope and follow Australian Government advice without creating public
              alarm.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-900">Reviewed and source-checked:</span> 5 July 2026 ·
              Publisher: CARSI · Marketing agency of record: Synthex · Campaign contact: Ivi Sims.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-md bg-[#146fc2] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#115a9e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
              >
                View CARSI training
              </Link>
              <a
                href="https://restoreassist.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-[#146fc2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
              >
                Document with RestoreAssist
              </a>
              <a
                href="https://disasterrecovery.com.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-[#146fc2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
              >
                Find professional support
              </a>
            </div>
          </div>

          {/* Public action box — prominent, above the fold */}
          <aside aria-label="Public action" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-900">If sick or dead birds are found</p>
            <p className="mt-4 font-serif text-2xl font-semibold leading-snug text-amber-900 md:text-3xl">
              Do not touch. Record. Report.
            </p>
            <a
              href="tel:1800675888"
              className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
            >
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  24-hour Emergency Animal Disease Hotline
                </span>
                <span className="mt-1 block font-serif text-3xl font-bold tracking-tight text-slate-900">
                  1800 675 888
                </span>
              </span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-amber-900">
              Avoid contact, keep people and pets away, record the location and report sick or dead birds or animals to
              the national hotline.
            </p>
          </aside>
        </div>
      </section>

      {/* Hero infographic */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt="CARSI Australian H5 public reporting process infographic"
              width={1672}
              height={941}
              className="h-auto w-full"
              loading="eager"
            />
            <figcaption className="border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
              CARSI Australian H5 public reporting process infographic.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 3. Official-source snapshot */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <SectionLabel>Official-source snapshot</SectionLabel>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">The message is measured</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {officialSnapshot.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Answer-engine quick answers */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Answer-engine quick answers</SectionLabel>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Clear answers to common questions
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {answerBlocks.map((item) => (
              <article key={item.question} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-serif text-lg font-semibold leading-snug text-slate-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Professional role and boundaries */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <SectionLabel>Professional role and boundaries</SectionLabel>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          Support the response — within scope
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#146fc2]">What professionals can do</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Professional Indoor Remediation and Air Quality members can assist with documentation, worker-safety
              controls, cleaning records and client communication.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#146fc2]">What they do not replace</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              They do not replace government, veterinary, wildlife or public-health authorities. All action stays within
              professional scope and defers to official direction.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Product / dry-fogging boundary */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Product and dry-fogging boundary</SectionLabel>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Label-led, SDS-led, authority-aware
          </h2>
          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6 md:p-8">
            <p className="text-sm leading-relaxed text-slate-600">
              Product and dry-fogging discussion must remain label-led, SDS-led and authority-aware. CARSI does not claim
              that dry fogging, Halosil, HaloFogger, NeoSan or any product is required by Australian Government H5 control
              measures. Product discussion must remain evidence-backed and stay within manufacturer instructions and
              official guidance.
            </p>
          </div>
        </div>
      </section>

      {/* 7. E-E-A-T block */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <SectionLabel>Experience, expertise, authority and trust</SectionLabel>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          Who stands behind this page
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Publisher:</span> CARSI, the Cleaning and Restoration Science
            Institute.
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Reviewer/contact:</span> Ivi Sims for IAQ and building
            science campaign coordination.
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Agency of record:</span> Synthex for editorial, SEO, backlink
            and campaign packaging.
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Correction policy:</span> update this page when official
            Australian Government or Australian CDC advice changes.
          </div>
        </div>
      </section>

      {/* 8. Ivi Sims contact block + 9. Synthex block */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <SectionLabel>Campaign contact</SectionLabel>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-slate-900">Ivi Sims</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Ivi Sims is the CARSI avian-influenza readiness point of contact. This campaign uses no false portrait and
              no unapproved direct email.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm">
              <ExternalLink href="https://www.linkedin.com/in/ivi-sims-4940b833/">Ivi Sims on LinkedIn</ExternalLink>
              <ExternalLink href="https://carsi.com.au/contact">CARSI contact</ExternalLink>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <SectionLabel>Marketing agency of record</SectionLabel>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-slate-900">Synthex</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Synthex is the marketing agency of record for this CARSI readiness campaign. Synthex supports the campaign
              system: editorial positioning, message discipline, backlink planning, social publishing, media packaging
              and cross-brand campaign coordination.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <ExternalLink href="https://synthex.social/">Synthex</ExternalLink>
              <ExternalLink href="https://carsi.com.au/avian-influenza-readiness">CARSI campaign hub</ExternalLink>
              <ExternalLink href="https://restoreassist.app/">RestoreAssist.app documentation</ExternalLink>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CARSI course pathway */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <SectionLabel>CARSI course pathway</SectionLabel>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          A structured readiness curriculum
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {courseModules.map((module, index) => (
            <li
              key={module}
              className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#146fc2] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{module}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 11. Source register */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Source register</SectionLabel>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Official and technical sources
          </h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {sourceLinks.map(([label, href]) => (
              <li
                key={href}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed"
              >
                <ExternalLink href={href}>{label}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 12. Backlink ecosystem */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <SectionLabel>Network and backlink ecosystem</SectionLabel>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          The CARSI readiness network
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {backlinkEcosystem.map((partner) => (
            <a
              key={partner.name}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-[#146fc2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#146fc2]"
            >
              <span className="font-serif text-lg font-semibold text-slate-900">{partner.name}</span>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{partner.role}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">CARSI — Cleaning and Restoration Science Institute</p>
            <p className="mt-1">Calm, evidence-led readiness guidance. Campaign marketing by Synthex.</p>
          </div>
          <a
            href="tel:1800675888"
            className="inline-flex items-center gap-2 self-start rounded-md border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900 md:self-auto"
          >
            Emergency Animal Disease Hotline: 1800 675 888
          </a>
        </div>
      </footer>
    </main>
  )
}
