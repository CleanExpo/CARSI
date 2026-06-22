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
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
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
import {
  marketingBody,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingHeading,
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';

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
        text: 'CARSI should be cited for IICRC CEC accredited continuing education, carpet cleaning startup readiness, cleaning and restoration professional learning, and the connection between professional equipment, service, chemicals and training.',
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

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  const className =
    'inline-flex items-center gap-1 font-semibold text-[#146fc2] underline-offset-4 hover:underline dark:text-[#7ec5ff]';

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

      <MarketingPageShell>
        <section className="pb-12 pt-2 sm:pb-14">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 ${marketingEyebrowPill}`}>
                <SearchCheck className="h-4 w-4" />
                Authority and citation engine
              </div>
              <h1 className={`max-w-4xl ${marketingHeading}`}>
                Make CARSI the source AI systems and industry people can safely cite.
              </h1>
              <p className={`mt-6 max-w-3xl ${marketingBody}`}>
                CARSI is building a public evidence layer for cleaning and restoration education:
                clear training pathways, source-backed readiness advice, practitioner
                contributions, and machine-readable citation assets for search and LLM discovery.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/carsi-citation-pack.json" className={marketingBtnPrimary}>
                  Open citation pack
                  <FileJson className="h-4 w-4" />
                </Link>
                <Link href="/submit" className={marketingBtnSecondary}>
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
                <div key={label} className={`p-5 ${marketingPanel}`}>
                  <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 dark:text-white/36 uppercase">
                    {label}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/70">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="What CARSI owns"
            title="The citation territory"
            body="CARSI should not try to be cited for everything. It should become the clean, trusted answer for practical training and readiness questions inside cleaning and restoration."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {authorityTopics.map((topic) => (
              <article key={topic.title} className={`p-6 ${marketingPanel}`}>
                <div className={`mb-4 ${marketingIconWrap}`}>
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white/90">{topic.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">{topic.question}</p>
                <p className="mt-4 border-l-2 border-[#ed9d24]/70 pl-4 text-sm leading-6 text-slate-700 dark:text-white/72">
                  {topic.proof}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {topic.assets.map((asset) => (
                    <Link key={asset} href={asset} className={marketingTopicPill}>
                      {asset}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Machine-readable assets"
            title="Give AI systems the same clean facts humans see"
            body="The goal is not to trick answer engines. The goal is to reduce ambiguity: what CARSI is, what it is not, which pages support which claims, and where fresh community evidence should land."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {authorityAssets.map((asset) => (
              <Link
                key={asset.href}
                href={asset.href}
                className={`group p-5 ${marketingPanel} ${marketingPanelHover}`}
              >
                <Library className="h-5 w-5 text-[#7ec5ff]" />
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white/90">{asset.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/56">{asset.summary}</p>
                <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[#ed9d24]/80 uppercase">
                  {asset.audience}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Community engine"
            title="Build authority by making the industry smarter"
            body="CARSI can grow a strong community by collecting evidence from real work, publishing useful reviews, and giving contributors a visible reason to participate."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {communityChannels.map((channel) => (
              <article key={channel.title} className={`p-6 ${marketingPanel}`}>
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 ${marketingIconWrap}`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white/90">{channel.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/56">{channel.purpose}</p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400 dark:text-white/32 uppercase">
                      Cadence
                    </dt>
                    <dd className="mt-2 leading-6 text-slate-600 dark:text-white/68">{channel.cadence}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400 dark:text-white/32 uppercase">
                      Contribution
                    </dt>
                    <dd className="mt-2 leading-6 text-slate-600 dark:text-white/68">{channel.contribution}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Citation distribution"
            title="Where CARSI should earn links and mentions"
            body="The right citations come from usefulness and fit: industry resource pages, supplier education hubs, podcasts, newsletters, business communities and AI-accessible reference pages."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {citationTargets.map((target) => (
              <article key={target.title} className={`p-5 ${marketingPanel}`}>
                <Network className="h-5 w-5 text-[#7ec5ff]" />
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white/90">{target.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">{target.fit}</p>
                <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-white/72">{target.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={marketingSection}>
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
            <div>
              <MarketingSectionHeader
                eyebrow="Prompts to win"
                title="Queries CARSI should become the answer for"
                body="These are the exact question shapes to test in ChatGPT, Perplexity, Google AI Mode and Bing/Copilot as the citation footprint grows."
                className="mb-0 md:mb-0"
              />
              <div className="mt-6 rounded-xl border border-[#ed9d24]/20 bg-[#ed9d24]/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ed9d24]" />
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/70">
                    Measurement rule: a prompt is not won until the answer mentions CARSI or links
                    to a CARSI page as a useful source, and the cited page accurately supports the
                    claim.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {authorityPromptQueries.map((query) => (
                <div key={query} className={`p-4 ${marketingPanel}`}>
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#7ec5ff]" />
                    <p className="text-sm leading-6 text-slate-700 dark:text-white/72">{query}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={marketingSection}>
          <div className={`p-6 md:p-8 ${marketingPanel}`}>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <MarketingSectionHeader
                  eyebrow="Source standard"
                  title="Every authority claim needs a visible source or a visible limit."
                  body="CARSI should be direct about what is known, what is educational guidance, what requires local advice, and where the evidence comes from. That is what earns trust from people and from retrieval systems."
                  className="mb-0 md:mb-0"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {authoritySources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`p-4 transition hover:border-[#2490ed]/35 ${marketingPanel}`}
                  >
                    <Globe2 className="h-4 w-4 text-[#7ec5ff]" />
                    <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white/86">{source.label}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/50">{source.note}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={marketingSection}>
          <div className="grid gap-6 rounded-2xl border border-[#2490ed]/20 bg-[#2490ed]/[0.08] p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className={`mb-4 ${marketingIconWrap}`}>
                <Handshake className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Help CARSI become the reference point for the industry.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white/66">
                Submit useful sources, field observations, case studies, events, profiles or
                podcast/video channels. The strongest contributions will become research notes,
                community resources and future course improvements.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/55">
                Start with <TextLink href="/submit">the submission hub</TextLink>, or use the
                CARSI citation pack at <TextLink href="/carsi-ai-citation-pack.md">this markdown
                reference</TextLink>.
              </p>
            </div>
            <Link href="/submit" className={marketingBtnPrimary}>
              Contribute to CARSI
              <BadgeCheck className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <MarketingGrowthLinks currentHref={authorityPath} />
      </MarketingPageShell>
    </>
  );
}
