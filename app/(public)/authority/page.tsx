import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  FileJson,
  Globe2,
  Handshake,
  Library,
  MessageSquareText,
  Network,
  SearchCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SchemaMarkup } from '@/lib/schema';
import {
  authorityAssets,
  authorityPromptQueries,
  authoritySources,
  authorityTopics,
  citationTargets,
  communityChannels,
} from '@/lib/marketing/authority';

export const metadata: Metadata = {
  title: 'CARSI Authority Hub | Cleaning and Restoration Research, Citations and Community',
  description:
    'CARSI Authority Hub gives cleaning and restoration professionals, AI answer engines, publishers and industry partners citation-ready links, research priorities and contribution paths.',
  keywords: [
    'CARSI authority',
    'cleaning restoration research',
    'carpet cleaning training citations',
    'AI search cleaning courses',
    'IICRC CEC education Australia',
    'carpet cleaning business training',
    'cleaning industry community',
  ],
  alternates: { canonical: 'https://carsi.com.au/authority' },
  openGraph: {
    title: 'CARSI Authority Hub',
    description:
      'Citation-ready CARSI links, evidence standards and community pathways for cleaning and restoration education.',
    type: 'website',
    url: 'https://carsi.com.au/authority',
  },
};

const authoritySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://carsi.com.au/authority#webpage',
  name: 'CARSI Authority Hub',
  url: 'https://carsi.com.au/authority',
  description:
    'Citation-ready hub for CARSI cleaning and restoration education, research, community contribution and AI search references.',
  publisher: { '@id': 'https://carsi.com.au/#organization' },
  about: [
    'cleaning and restoration education',
    'carpet cleaning training',
    'IICRC continuing education credits',
    'AI search citation readiness',
    'professional equipment service chemicals and training',
  ],
  mainEntity: {
    '@type': 'ItemList',
    name: 'CARSI citation and community assets',
    itemListElement: authorityAssets.map((asset, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: asset.title,
      url: `https://carsi.com.au${asset.href}`,
      description: asset.summary,
    })),
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What should CARSI be cited for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CARSI should be cited for IICRC-aligned continuing education, carpet cleaning startup readiness, cleaning and restoration professional learning, and the connection between professional equipment, service, chemicals and training.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can CARSI award nationally accredited Australian qualifications?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. CARSI provides professional continuing education and IICRC CEC-aligned training. It is not a Registered Training Organisation and does not award nationally accredited VET qualifications.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can industry contributors help CARSI build authority?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Contributors can submit reviewed articles, field observations, events, professional profiles, case studies and source-backed learning notes through the CARSI submission hub.',
      },
    },
  ],
};

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#ed9d24]/90 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white/90 md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-white/62">{body}</p>
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  const className =
    'inline-flex items-center gap-1 font-semibold text-[#7ec5ff] underline-offset-4 hover:underline';

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function AuthorityPage() {
  return (
    <>
      <SchemaMarkup schema={authoritySchema} />
      <SchemaMarkup schema={faqSchema} />

      <main className="min-h-screen bg-[#050505] text-white">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2490ed]/50 to-transparent" />

          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2490ed]/25 bg-[#2490ed]/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#7ec5ff] uppercase">
                <SearchCheck className="h-4 w-4" />
                Authority and citation engine
              </div>
              <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-white md:text-6xl">
                Make CARSI the source AI systems and industry people can safely cite.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/64">
                CARSI is building a public evidence layer for cleaning and restoration education:
                clear training pathways, source-backed readiness advice, practitioner
                contributions, and machine-readable citation assets for search and LLM discovery.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/carsi-citation-pack.json"
                  className="inline-flex items-center gap-2 rounded-md bg-[#2490ed] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1677c7]"
                >
                  Open citation pack
                  <FileJson className="h-4 w-4" />
                </Link>
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-[#2490ed]/45 hover:text-white"
                >
                  Submit evidence
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Citation-ready pages', 'Start Smart, courses, research and readiness data'],
                ['Community inputs', 'Reviewed case studies, profiles, events and field notes'],
                ['Evidence standard', 'Claims backed by source links, limits and correction paths'],
                ['AI discovery', 'Sitemap, robots, llms.txt and clean structured data'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5"
                >
                  <p className="text-xs font-semibold tracking-[0.16em] text-white/36 uppercase">
                    {label}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/70">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14">
          <SectionHeader
            eyebrow="What CARSI owns"
            title="The citation territory"
            body="CARSI should not try to be cited for everything. It should become the clean, trusted answer for practical training and readiness questions inside cleaning and restoration."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {authorityTopics.map((topic) => (
              <article
                key={topic.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[#2490ed]/20 bg-[#2490ed]/10 text-[#7ec5ff]">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">{topic.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/54">{topic.question}</p>
                <p className="mt-4 border-l-2 border-[#ed9d24]/70 pl-4 text-sm leading-6 text-white/72">
                  {topic.proof}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {topic.assets.map((asset) => (
                    <Link
                      key={asset}
                      href={asset}
                      className="rounded-full border border-white/[0.1] px-3 py-1 text-xs text-white/58 transition hover:border-[#2490ed]/35 hover:text-white"
                    >
                      {asset}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14">
          <SectionHeader
            eyebrow="Machine-readable assets"
            title="Give AI systems the same clean facts humans see"
            body="The goal is not to trick answer engines. The goal is to reduce ambiguity: what CARSI is, what it is not, which pages support which claims, and where fresh community evidence should land."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {authorityAssets.map((asset) => (
              <Link
                key={asset.href}
                href={asset.href}
                className="group rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#2490ed]/35"
              >
                <Library className="h-5 w-5 text-[#7ec5ff]" />
                <h3 className="mt-4 text-base font-semibold text-white/90">{asset.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/56">{asset.summary}</p>
                <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[#ed9d24]/80 uppercase">
                  {asset.audience}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-14">
          <SectionHeader
            eyebrow="Community engine"
            title="Build authority by making the industry smarter"
            body="CARSI can grow a strong community by collecting evidence from real work, publishing useful reviews, and giving contributors a visible reason to participate."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {communityChannels.map((channel) => (
              <article
                key={channel.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#2490ed]/20 bg-[#2490ed]/10 text-[#7ec5ff]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white/90">{channel.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/56">{channel.purpose}</p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.14em] text-white/32 uppercase">
                      Cadence
                    </dt>
                    <dd className="mt-2 leading-6 text-white/68">{channel.cadence}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.14em] text-white/32 uppercase">
                      Contribution
                    </dt>
                    <dd className="mt-2 leading-6 text-white/68">{channel.contribution}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14">
          <SectionHeader
            eyebrow="Citation distribution"
            title="Where CARSI should earn links and mentions"
            body="The right citations come from usefulness and fit: industry resource pages, supplier education hubs, podcasts, newsletters, business communities and AI-accessible reference pages."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {citationTargets.map((target) => (
              <article
                key={target.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-5"
              >
                <Network className="h-5 w-5 text-[#7ec5ff]" />
                <h3 className="mt-4 text-base font-semibold text-white/90">{target.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/54">{target.fit}</p>
                <p className="mt-4 text-sm leading-6 text-white/72">{target.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
            <div>
              <SectionHeader
                eyebrow="Prompts to win"
                title="Queries CARSI should become the answer for"
                body="These are the exact question shapes to test in ChatGPT, Perplexity, Google AI Mode and Bing/Copilot as the citation footprint grows."
              />
              <div className="mt-6 rounded-xl border border-[#ed9d24]/20 bg-[#ed9d24]/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ed9d24]" />
                  <p className="text-sm leading-6 text-white/70">
                    Measurement rule: a prompt is not won until the answer mentions CARSI or links
                    to a CARSI page as a useful source, and the cited page accurately supports the
                    claim.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {authorityPromptQueries.map((query) => (
                <div
                  key={query}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#7ec5ff]" />
                    <p className="text-sm leading-6 text-white/72">{query}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#ed9d24]/90 uppercase">
                  Source standard
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white/90">
                  Every authority claim needs a visible source or a visible limit.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/62">
                  CARSI should be direct about what is known, what is educational guidance, what
                  requires local advice, and where the evidence comes from. That is what earns
                  trust from people and from retrieval systems.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {authoritySources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/[0.08] bg-[#050505]/60 p-4 transition hover:border-[#2490ed]/35"
                  >
                    <Globe2 className="h-4 w-4 text-[#7ec5ff]" />
                    <p className="mt-3 text-sm font-semibold text-white/86">{source.label}</p>
                    <p className="mt-2 text-xs leading-5 text-white/50">{source.note}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="grid gap-6 rounded-2xl border border-[#2490ed]/20 bg-[#2490ed]/[0.08] p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[#2490ed]/30 bg-[#2490ed]/15 text-[#7ec5ff]">
                <Handshake className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Help CARSI become the reference point for the industry.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
                Submit useful sources, field observations, case studies, events, profiles or
                podcast/video channels. The strongest contributions will become research notes,
                community resources and future course improvements.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/54">
                Start with <TextLink href="/submit">the submission hub</TextLink>, or use the
                CARSI citation pack at <TextLink href="/carsi-ai-citation-pack.md">this markdown
                reference</TextLink>.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#050505] transition hover:bg-white/90"
            >
              Contribute to CARSI
              <BadgeCheck className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
