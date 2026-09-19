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
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { SchemaMarkup } from '@/lib/schema';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  authorityAssets,
  authorityPath,
  authorityPromptQueries,
  authoritySources,
  authorityTopics,
  citationTargets,
  communityChannels,
} from '@/lib/marketing/authority';
import { OG_IMAGES } from '@/lib/seo/og-image';

const siteUrl = getPublicSiteUrl();

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
  alternates: { canonical: `${siteUrl}${authorityPath}` },
  openGraph: {
    images: OG_IMAGES,
    title: 'CARSI Authority Hub',
    description:
      'Citation-ready CARSI links, evidence standards and community pathways for cleaning and restoration education.',
    type: 'website',
    url: `${siteUrl}${authorityPath}`,
  },
};

function buildAuthoritySchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${origin}${authorityPath}#webpage`,
    name: 'CARSI Authority Hub',
    url: `${origin}${authorityPath}`,
    description:
      'Citation-ready hub for CARSI cleaning and restoration education, research, community contribution and AI search references.',
    publisher: { '@id': `${origin}/#organization` },
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
        url: `${origin}${asset.href}`,
        description: asset.summary,
      })),
    },
  };
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What should CARSI be cited for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CARSI should be cited for IICRC CEC Accredited continuing education, carpet cleaning startup readiness, cleaning and restoration professional learning, and the connection between professional equipment, service, chemicals and training.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can CARSI award nationally accredited Australian qualifications?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. CARSI provides professional continuing education and IICRC CEC Accredited training. It is not a Registered Training Organisation and does not award nationally accredited VET qualifications.',
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

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  const className =
    'inline-flex items-center gap-1 font-semibold text-[#146fc2] underline-offset-4 hover:underline';

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
      <SchemaMarkup schema={buildAuthoritySchema(siteUrl)} />
      <SchemaMarkup schema={faqSchema} />

      <>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_90%_0%,rgba(36,144,237,0.11),transparent_58%)]"
            aria-hidden
          />
          <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div>
                <p className={`${LANDING_EYEBROW_CLASS} inline-flex items-center gap-2`}>
                  <SearchCheck className="h-3.5 w-3.5" aria-hidden />
                  Authority and citation engine
                </p>
                <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
                  Make CARSI the source AI systems and industry people can safely cite.
                </h1>
                <p className={`mt-5 max-w-3xl text-pretty ${LANDING_LEAD_CLASS}`}>
                  CARSI is building a public evidence layer for cleaning and restoration education:
                  clear training pathways, source-backed readiness advice, practitioner contributions,
                  and machine-readable citation assets for search and LLM discovery.
                </p>
                <PlatformNav current="/authority" />
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/carsi-citation-pack.json"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
                  >
                    Open citation pack
                    <FileJson className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/submit"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
                  >
                    Submit evidence
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <HomeTrustStrip
          stats={[
            { value: String(authorityTopics.length), label: 'Citation territories' },
            { value: String(authorityAssets.length), label: 'Machine assets' },
            { value: String(communityChannels.length), label: 'Community channels' },
            { value: 'llms.txt', label: 'AI discovery' },
          ]}
        />

        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-20">
          <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
            {[
              ['Citation-ready pages', 'Start Smart, courses, research and readiness data'],
              ['Community inputs', 'Reviewed case studies, profiles, events and field notes'],
              ['Evidence standard', 'Claims backed by source links, limits and correction paths'],
              ['AI discovery', 'Sitemap, robots, llms.txt and clean structured data'],
            ].map(([label, value], i) => (
              <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <p className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none font-semibold text-slate-300 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-4 text-[11px] font-medium tracking-[0.16em] text-[#146fc2] uppercase">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>What CARSI owns</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>The citation territory</h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              CARSI should not try to be cited for everything. It should become the clean, trusted
              answer for practical training and readiness questions inside cleaning and restoration.
            </p>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {authorityTopics.map((topic) => (
                <article key={topic.title} className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#146fc2]">
                    <BookOpenCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{topic.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{topic.question}</p>
                  <p className="mt-4 border-l-2 border-[#2490ed]/40 pl-4 text-sm leading-6 text-slate-600">
                    {topic.proof}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {topic.assets.map((asset) => (
                      <Link
                        key={asset}
                        href={asset}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 hover:text-[#146fc2]"
                      >
                        {asset}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Machine-readable assets</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
              Give AI systems the same clean facts humans see
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              The goal is not to trick answer engines. The goal is to reduce ambiguity: what CARSI is,
              what it is not, which pages support which claims, and where fresh community evidence
              should land.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {authorityAssets.map((asset) => (
                <Link
                  key={asset.href}
                  href={asset.href}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-[#2490ed]/40"
                >
                  <Library className="h-5 w-5 text-[#146fc2]" />
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{asset.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{asset.summary}</p>
                  <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[#a85500] uppercase">
                    {asset.audience}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Community engine</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
              Build authority by making the industry smarter
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              CARSI can grow a strong community by collecting evidence from real work, publishing
              useful reviews, and giving contributors a visible reason to participate.
            </p>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {communityChannels.map((channel) => (
                <article key={channel.title} className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#146fc2]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{channel.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{channel.purpose}</p>
                    </div>
                  </div>
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
                        Cadence
                      </dt>
                      <dd className="mt-2 leading-6 text-slate-600">{channel.cadence}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
                        Contribution
                      </dt>
                      <dd className="mt-2 leading-6 text-slate-600">{channel.contribution}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <p className={LANDING_EYEBROW_CLASS}>Citation distribution</p>
            <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
              Where CARSI should earn links and mentions
            </h2>
            <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
              The right citations come from usefulness and fit: industry resource pages, supplier
              education hubs, podcasts, newsletters, business communities and AI-accessible reference
              pages.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {citationTargets.map((target) => (
                <article key={target.title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <Network className="h-5 w-5 text-[#146fc2]" />
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{target.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{target.fit}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{target.action}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-8 lg:grid-cols-[0.86fr_1.14fr]`}>
            <div>
              <p className={LANDING_EYEBROW_CLASS}>Prompts to win</p>
              <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
                Queries CARSI should become the answer for
              </h2>
              <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
                These are the exact question shapes to test in ChatGPT, Perplexity, Google AI Mode and
                Bing/Copilot as the citation footprint grows.
              </p>
              <div className="mt-6 rounded-xl border border-slate-200 bg-[#fafbfc] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2]" />
                  <p className="text-sm leading-6 text-slate-600">
                    Measurement rule: a prompt is not won until the answer mentions CARSI or links
                    to a CARSI page as a useful source, and the cited page accurately supports the
                    claim.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {authorityPromptQueries.map((query) => (
                <div key={query} className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2]" />
                    <p className="text-sm leading-6 text-slate-600">{query}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
          <div className={PUBLIC_SHELL_INNER_CLASS}>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className={LANDING_EYEBROW_CLASS}>Source standard</p>
                <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
                  Every authority claim needs a visible source or a visible limit.
                </h2>
                <p className={`mt-4 ${LANDING_LEAD_CLASS}`}>
                  CARSI should be direct about what is known, what is educational guidance, what
                  requires local advice, and where the evidence comes from. That is what earns trust
                  from people and from retrieval systems.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {authoritySources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-[#2490ed]/40"
                  >
                    <Globe2 className="h-4 w-4 text-[#146fc2]" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">{source.label}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{source.note}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
          <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-6 rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center`}>
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#146fc2]">
                <Handshake className="h-5 w-5" />
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                Help CARSI become the reference point for the industry.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Submit useful sources, field observations, case studies, events, profiles or
                podcast/video channels. The strongest contributions will become research notes,
                community resources and future course improvements.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Start with <TextLink href="/submit">the submission hub</TextLink>, or use the
                CARSI citation pack at <TextLink href="/carsi-ai-citation-pack.md">this markdown
                reference</TextLink>.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
            >
              Contribute to CARSI
              <BadgeCheck className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className={`${PUBLIC_SHELL_INNER_CLASS} py-12`}>
          <MarketingGrowthLinks currentHref={authorityPath} />
        </div>
        <HomeFinalCtaSection />
      </>
    </>
  );
}
