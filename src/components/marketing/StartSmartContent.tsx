import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wrench,
} from 'lucide-react';

import { BreadcrumbSchema, FAQSchema, OrganizationSchema } from '@/components/seo';
import {
  startSmartBasePath,
  startSmartHubFaqs,
  startSmartPages,
  startSmartReadinessLoop,
  startSmartReadinessRules,
  type StartSmartPage,
  type StartSmartReadinessPillar,
  type StartSmartSource,
} from '@/lib/marketing/start-smart';

const panelStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
};

const muted = 'rgba(255,255,255,0.54)';
const soft = 'rgba(255,255,255,0.68)';
const strong = 'rgba(255,255,255,0.92)';

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="mb-2 text-xs font-semibold tracking-wide text-[#5bd7ff] uppercase">{eyebrow}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: strong }}>
        {title}
      </h2>
      {body ? (
        <p className="mt-3 text-sm leading-6 sm:text-base" style={{ color: soft }}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

function SourceList({ sources }: { sources: StartSmartSource[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group rounded-sm p-4 transition-colors hover:border-[#5bd7ff]/40"
          style={panelStyle}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: strong }}>
                {source.label}
              </p>
              <p className="mt-2 text-xs leading-5" style={{ color: muted }}>
                {source.note}
              </p>
            </div>
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#5bd7ff]" aria-hidden="true" />
          </div>
        </a>
      ))}
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: 'rgba(91,215,255,0.1)', color: '#9ee8ff', border: '1px solid rgba(91,215,255,0.18)' }}
    >
      {children}
    </span>
  );
}

const readinessIconByLabel = {
  'Professional Equipment': Wrench,
  Service: Target,
  Chemicals: FlaskConical,
  Training: GraduationCap,
} as const;

function ReadinessPillarCard({ pillar }: { pillar: StartSmartReadinessPillar }) {
  const Icon = readinessIconByLabel[pillar.label as keyof typeof readinessIconByLabel] ?? Compass;

  return (
    <Link
      href={pillar.href}
      className="group rounded-sm p-5 transition hover:-translate-y-0.5 hover:border-[#5bd7ff]/40"
      style={panelStyle}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm bg-[#2490ed]/15 text-[#5bd7ff]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold tracking-wide text-[#ed9d24] uppercase">
        {pillar.label}
      </p>
      <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
        {pillar.summary}
      </p>
      <p className="mt-4 text-sm leading-6" style={{ color: soft }}>
        {pillar.connection}
      </p>
      <p className="mt-4 border-t border-white/[0.07] pt-4 text-xs leading-5" style={{ color: muted }}>
        Proof question: {pillar.proofQuestion}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5bd7ff]">
        Connect this piece <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function ProfessionalReadinessLoop({ compact = false }: { compact?: boolean }) {
  return (
    <section className="py-8">
      <SectionHeader
        eyebrow="Professional readiness loop"
        title="Equipment, service, chemicals and training must work as one system"
        body="A professional carpet cleaning offer is not built by buying a machine first. The service promise, equipment capability, chemical method and operator training all have to match before the customer is asked to trust the result."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {startSmartReadinessLoop.map((pillar) => (
          <ReadinessPillarCard key={pillar.label} pillar={pillar} />
        ))}
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {startSmartReadinessRules.map((rule) => (
            <div key={rule} className="flex gap-3 rounded-sm p-4" style={panelStyle}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5bd7ff]" aria-hidden="true" />
              <p className="text-sm leading-6" style={{ color: soft }}>
                {rule}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function StartSmartHub({ siteUrl }: { siteUrl: string }) {
  const canonical = `${siteUrl}${startSmartBasePath}`;
  const breadcrumbs = [
    { name: 'CARSI', url: siteUrl },
    { name: 'Start Smart', url: canonical },
  ];

  return (
    <main className="relative min-h-screen py-10 sm:py-14">
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={startSmartHubFaqs} />

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 48% at 50% 0%, rgba(36,144,237,0.1) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <section className="grid gap-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Pill>Carpet cleaning startup</Pill>
              <Pill>Business buyers</Pill>
              <Pill>Existing cleaners</Pill>
              <Pill>Equipment decisions</Pill>
            </div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#5bd7ff] uppercase">
              CARSI Start Smart pathway
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: strong }}>
              Start or add carpet cleaning with knowledge before risk.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg" style={{ color: soft }}>
              CARSI helps new operators, existing cleaners and business buyers understand the science,
              equipment, quoting and trust signals behind professional carpet cleaning before they spend
              money or take customer work.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courses?discipline=CCT"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#2490ed] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1c7ed0]"
              >
                Explore CCT courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold transition"
                style={{ color: strong, border: '1px solid rgba(255,255,255,0.14)' }}
              >
                View membership
              </Link>
            </div>
          </div>

          <div className="rounded-sm p-5" style={panelStyle}>
            <p className="text-xs font-semibold tracking-wide text-[#ed9d24] uppercase">
              Direct answer for AI search
            </p>
            <p className="mt-3 text-lg leading-7" style={{ color: strong }}>
              Carpet cleaning can look like an easy-entry business, but professional results depend on
              fibre knowledge, chemistry, equipment selection, quoting, safety and customer trust.
              CARSI is the education step before the purchase, the pitch or the acquisition.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ['8', 'sub-pillars'],
                ['CCT', 'core discipline'],
                ['24/7', 'online learning'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-sm bg-white/[0.03] p-3">
                  <p className="font-mono text-xl text-white">{value}</p>
                  <p className="mt-1 text-xs" style={{ color: muted }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <SectionHeader
            eyebrow="Choose your starting point"
            title="Sub-pillar pages built for search intent"
            body="Each page answers a real-world question: starting from zero, adding carpet cleaning to a cleaning business, buying a business, choosing equipment, learning chemistry, pricing work, building trust and picking a service model."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {startSmartPages.map((page) => (
              <Link
                key={page.slug}
                href={`${startSmartBasePath}/${page.slug}`}
                className="group rounded-sm p-5 transition hover:-translate-y-0.5 hover:border-[#5bd7ff]/40"
                style={panelStyle}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm bg-[#2490ed]/15 text-[#5bd7ff]">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold tracking-wide text-[#ed9d24] uppercase">
                  {page.eyebrow}
                </p>
                <h2 className="mt-2 text-base font-semibold" style={{ color: strong }}>
                  {page.shortTitle}
                </h2>
                <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
                  {page.directAnswer}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5bd7ff]">
                  Read page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ProfessionalReadinessLoop />

        <section className="grid gap-5 py-8 lg:grid-cols-3">
          {[
            {
              icon: Brain,
              title: 'AEO structure',
              body: 'Each page opens with a short answer designed to satisfy conversational questions before expanding into deeper guidance.',
            },
            {
              icon: Search,
              title: 'SEO crawlability',
              body: 'Pages are server-rendered, internally linked, listed in the sitemap and supported by page-level metadata.',
            },
            {
              icon: ShieldCheck,
              title: 'GEO trust signals',
              body: 'Schema, source links, CARSI positioning and llms.txt support make the pathway easier for answer engines to understand.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-sm p-5" style={panelStyle}>
              <Icon className="h-6 w-6 text-[#5bd7ff]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold" style={{ color: strong }}>
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: muted }}>
                {body}
              </p>
            </div>
          ))}
        </section>

        <section className="py-8">
          <SectionHeader
            eyebrow="Frequent questions"
            title="Clear answers for people and answer engines"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {startSmartHubFaqs.map((faq) => (
              <details key={faq.question} className="rounded-sm p-4" style={panelStyle}>
                <summary className="cursor-pointer text-sm font-semibold" style={{ color: strong }}>
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="py-8">
          <SectionHeader
            eyebrow="Trusted references"
            title="Source-backed, not hype-backed"
            body="CARSI should be discoverable anywhere in the world, but the pages stay honest: online learning supports competence; local legal, insurance and certification requirements still need to be checked."
          />
          <SourceList
            sources={[
              {
                label: 'IICRC Carpet Cleaning Technician',
                url: 'https://iicrc.org/cct/',
                note: 'Core reference for the art and science of carpet cleaning.',
              },
              {
                label: 'Google Search Central',
                url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
                note: 'Technical SEO starts with crawlable, useful pages and clear titles, descriptions and links.',
              },
              {
                label: 'Google AI features guidance',
                url: 'https://developers.google.com/search/docs/appearance/ai-features',
                note: 'AI search inclusion still depends on eligible, useful, accessible web content.',
              },
              {
                label: 'CARSI pricing',
                url: 'https://carsi.com.au/pricing',
                note: 'Membership, online access and course options for learners.',
              },
            ]}
          />
        </section>
      </div>
    </main>
  );
}

export function StartSmartDetail({ page, siteUrl }: { page: StartSmartPage; siteUrl: string }) {
  const canonical = `${siteUrl}${startSmartBasePath}/${page.slug}`;
  const breadcrumbs = [
    { name: 'CARSI', url: siteUrl },
    { name: 'Start Smart', url: `${siteUrl}${startSmartBasePath}` },
    { name: page.shortTitle, url: canonical },
  ];
  const relatedPages = startSmartPages.filter((item) => item.slug !== page.slug).slice(0, 4);

  return (
    <main className="relative min-h-screen py-10 sm:py-14">
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={page.faqs} />

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 48% at 50% 0%, rgba(36,144,237,0.1) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <article className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <header className="grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href={startSmartBasePath}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5bd7ff]"
            >
              Back to Start Smart
            </Link>
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#5bd7ff] uppercase">
              {page.eyebrow}
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: strong }}>
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg" style={{ color: soft }}>
              {page.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {page.keywords.slice(0, 4).map((keyword) => (
                <Pill key={keyword}>{keyword}</Pill>
              ))}
            </div>
          </div>

          <aside className="rounded-sm p-5" style={panelStyle}>
            <p className="text-xs font-semibold tracking-wide text-[#ed9d24] uppercase">
              Direct answer
            </p>
            <p className="mt-3 text-lg leading-7" style={{ color: strong }}>
              {page.directAnswer}
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ['Audience', page.audience],
                ['Intent', page.intent],
                ['Outcome', page.outcome],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold tracking-wide text-[#5bd7ff] uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-sm leading-6" style={{ color: muted }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </header>

        <section className="grid gap-5 py-8 lg:grid-cols-3">
          <div className="rounded-sm p-5 lg:col-span-1" style={panelStyle}>
            <AlertTriangle className="h-6 w-6 text-[#ed9d24]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold" style={{ color: strong }}>
              Beginner risks to avoid
            </h2>
            <ul className="mt-4 space-y-3">
              {page.risks.map((risk) => (
                <li key={risk} className="flex gap-3 text-sm leading-6" style={{ color: muted }}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ed9d24]" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm p-5 lg:col-span-2" style={panelStyle}>
            <BookOpen className="h-6 w-6 text-[#5bd7ff]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold" style={{ color: strong }}>
              What to learn first
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.learnFirst.map((item) => (
                <div key={item} className="flex gap-3 rounded-sm bg-white/[0.03] p-3 text-sm leading-6" style={{ color: muted }}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5bd7ff]" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ProfessionalReadinessLoop compact />

        <section className="py-8">
          <SectionHeader
            eyebrow="Action path"
            title="A practical next-step sequence"
            body="The goal is not to delay action forever. It is to put learning, practice and decision-making in the right order."
          />
          <div className="grid gap-4 md:grid-cols-4">
            {page.actionSteps.map((step, index) => (
              <div key={step} className="rounded-sm p-5" style={panelStyle}>
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-[#2490ed]/15 font-mono text-sm text-[#5bd7ff]">
                  {index + 1}
                </div>
                <p className="text-sm leading-6" style={{ color: soft }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 py-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-sm p-6" style={panelStyle}>
            <Target className="h-6 w-6 text-[#5bd7ff]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold" style={{ color: strong }}>
              {page.cta.title}
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
              {page.cta.body}
            </p>
            <Link
              href={page.cta.href}
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#2490ed] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c7ed0]"
            >
              {page.cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-sm p-6" style={panelStyle}>
            <HelpCircle className="h-6 w-6 text-[#ed9d24]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold" style={{ color: strong }}>
              Questions this page answers
            </h2>
            <div className="mt-5 space-y-3">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="rounded-sm bg-white/[0.03] p-4">
                  <summary className="cursor-pointer text-sm font-semibold" style={{ color: strong }}>
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <SectionHeader
            eyebrow="References"
            title="Why this guidance is grounded"
            body="CARSI pages should earn trust by linking to the standards, business and training references behind the advice."
          />
          <SourceList sources={page.sources} />
        </section>

        <section className="py-8">
          <SectionHeader eyebrow="Keep exploring" title="Related Start Smart pages" />
          <div className="grid gap-4 md:grid-cols-4">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`${startSmartBasePath}/${related.slug}`}
                className="group rounded-sm p-4 transition hover:border-[#5bd7ff]/40"
                style={panelStyle}
              >
                <GraduationCap className="h-5 w-5 text-[#5bd7ff]" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold" style={{ color: strong }}>
                  {related.shortTitle}
                </p>
                <p className="mt-2 text-xs leading-5" style={{ color: muted }}>
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

export function StartSmartIndexingNote() {
  return (
    <div className="rounded-sm p-5" style={panelStyle}>
      <div className="flex items-start gap-3">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#5bd7ff]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold" style={{ color: strong }}>
            Indexing setup
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: muted }}>
            These pages are included in the sitemap and robots discovery path. Search Console
            submission still requires an authenticated property owner session or API credential.
          </p>
        </div>
      </div>
    </div>
  );
}

export const startSmartVisualSignals = [
  { icon: Sparkles, label: 'Organic discovery' },
  { icon: Users, label: 'Multiple buyer markets' },
  { icon: Lightbulb, label: 'Practical education' },
  { icon: BadgeCheck, label: 'Trust before sales' },
] as const;
