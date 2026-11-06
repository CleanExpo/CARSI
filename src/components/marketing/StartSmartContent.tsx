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
import Link from 'next/link';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import {
  MarketingPageShell,
  marketingPageInnerWideClass,
} from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import { PlatformContextualNext } from '@/components/marketing/platform/PlatformPagePattern';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import {
  marketingBtnPrimary,
  marketingEyebrow,
  marketingEyebrowAmber,
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
} from '@/lib/marketing/marketing-ui';
import { platformSurfaceByHref } from '@/lib/marketing/platform-surface';
import {
  getStartSmartLeadPathsForPage,
  getStartSmartOperatingConnections,
  getStartSmartPageFaqs,
  startSmartBasePath,
  startSmartHubFaqs,
  startSmartLeadPaths,
  startSmartPages,
  startSmartReadinessLoop,
  startSmartReadinessRules,
  type StartSmartLeadPath,
  type StartSmartOperatingConnection,
  type StartSmartPage,
  type StartSmartReadinessPillar,
  type StartSmartSource,
} from '@/lib/marketing/start-smart';

function SourceList({ sources }: { sources: StartSmartSource[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className={`group p-4 ${marketingPanel} ${marketingPanelHover}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">{source.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{source.note}</p>
            </div>
            <ExternalLink
              className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]"
              aria-hidden="true"
            />
          </div>
        </a>
      ))}
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

const START_SMART_HERO_IMAGE = {
  src: '/images/hero-tiles/carpet-extraction.webp',
  alt: 'Professional carpet extraction on a job — the field skills Start Smart covers before you buy gear',
  width: 512,
  height: 512,
} as const;

const START_SMART_HERO_STATS = [
  { value: '8', label: 'Sub-pillars' },
  { value: '4', label: 'Readiness gates' },
  { value: '24/7', label: 'Online learning' },
  { value: 'AU', label: 'Market context' },
] as const;

function StartSmartHubHero() {
  const surface = platformSurfaceByHref(startSmartBasePath);
  if (!surface) throw new Error('platform-surface: missing Start Smart hub');

  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#fafbfc]">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(36,144,237,0.06)_0%,transparent_42%)]"
        aria-hidden
      />
      <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-10 md:py-14 lg:py-16`}>
        <p className={LANDING_EYEBROW_CLASS}>{surface.eyebrow}</p>

        <div className="mt-6 grid items-start gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="order-2 min-w-0 lg:order-1">
            <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-[2.05rem] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-950 md:text-[2.85rem] md:leading-[1.06] lg:max-w-[16ch] xl:max-w-[18ch]">
              {surface.headline}
            </h1>
            <p className={`mt-5 max-w-xl text-pretty ${LANDING_LEAD_CLASS}`}>{surface.lead}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/courses"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#146fc2] px-7 text-sm font-semibold text-white shadow-[0_12px_32px_-14px_rgba(20,111,194,0.55)] hover:bg-[#0f5fa8]"
              >
                Explore CARSI courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/35 hover:text-[#146fc2]"
              >
                View membership
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-200/80 pt-8 sm:grid-cols-4">
              {START_SMART_HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950 tabular-nums md:text-2xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="order-1 mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:order-2 lg:mx-0 lg:w-full lg:max-w-none">
            <figure>
              <div className="aspect-square w-full overflow-hidden rounded-[1.35rem] bg-slate-200/80 shadow-[0_28px_56px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element -- native img in a fixed-aspect box (GP-661 layout); next/image conversion is a GP-696 follow-up */}
                <img
                  src={START_SMART_HERO_IMAGE.src}
                  alt={START_SMART_HERO_IMAGE.alt}
                  width={START_SMART_HERO_IMAGE.width}
                  height={START_SMART_HERO_IMAGE.height}
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover object-center"
                />
              </div>
              <figcaption className="sr-only">{START_SMART_HERO_IMAGE.alt}</figcaption>
            </figure>
          </aside>
        </div>

        <div className="mt-12 border-t border-slate-200/70 pt-8 lg:mt-14 [&_nav]:mt-0 [&_nav]:max-w-none [&_nav]:justify-start">
          <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            CARSI platform
          </p>
          <PlatformNav current={startSmartBasePath} />
        </div>
      </div>
    </section>
  );
}

function StartSmartAiAnswerStrip() {
  return (
    <div className="border-b border-slate-200/70 bg-[#fff8ef]/90">
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-8 md:py-10`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#c2780a] shadow-sm ring-1 ring-[#ed9d24]/20">
            <Search className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#a85500] uppercase">
              Direct answer for AI search
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-800 md:text-[15px] md:leading-7">
              Carpet cleaning can look like an easy-entry business, but professional results depend
              on fibre knowledge, chemistry, equipment selection, quoting, safety and customer
              trust. CARSI is the education step before the purchase, the pitch or the acquisition.
            </p>
          </div>
        </div>
      </div>
    </div>
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
      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-[#2490ed]/40"
    >
      <div className={`mb-4 ${marketingIconWrap}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
        {pillar.label}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">{pillar.summary}</p>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/68">
        {pillar.connection}
      </p>
      <p className="mt-4 border-t border-slate-200/80 pt-4 text-xs leading-5 text-slate-600 dark:border-white/[0.07] dark:text-white/55">
        Proof question: {pillar.proofQuestion}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]">
        Connect this piece <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function ProfessionalReadinessLoop({ compact = false }: { compact?: boolean }) {
  return (
    <section className={marketingSection}>
      <MarketingSectionHeader
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
            <div key={rule} className={`flex gap-3 p-4 ${marketingPanel}`}>
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-slate-600 dark:text-white/68">{rule}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OperatingConnectionCard({ connection }: { connection: StartSmartOperatingConnection }) {
  const Icon =
    readinessIconByLabel[connection.pillar as keyof typeof readinessIconByLabel] ?? Compass;

  return (
    <div className={`p-5 ${marketingPanel}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10 text-[#146fc2] dark:text-[#7ec5ff]`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
            {connection.pillar}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/68">
            {connection.impact}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.07]">
        <div>
          <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrow}`}>
            Decision gate
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">
            {connection.decision}
          </p>
        </div>
        <div>
          <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrow}`}>
            Evidence to keep
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">
            {connection.evidence}
          </p>
        </div>
      </div>
    </div>
  );
}

function StartSmartOperatingMap({ page }: { page: StartSmartPage }) {
  const connections = getStartSmartOperatingConnections(page.slug);

  return (
    <section id="equipment-service-chemicals-training" className={marketingSection}>
      <MarketingSectionHeader
        eyebrow="Operating system map"
        title="How this topic connects equipment, service, chemicals and training"
        body="This is the practical bridge between learning and action. Each topic should change a buying decision, a service promise, a chemical choice or a training gate before the operator moves forward."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {connections.map((connection) => (
          <OperatingConnectionCard key={connection.pillar} connection={connection} />
        ))}
      </div>
    </section>
  );
}

function LeadPathCard({ path }: { path: StartSmartLeadPath }) {
  const isContact = path.href.startsWith('/contact');
  const Icon = isContact ? Users : GraduationCap;

  return (
    <Link
      href={path.href}
      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-[#2490ed]/40"
    >
      <div className={`mb-4 ${marketingIconWrap}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
        {path.intent.replaceAll('-', ' ')}
      </p>
      <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white/90">
        {path.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">{path.body}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]">
        {path.label} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function StartSmartLeadPaths({
  title = 'Turn the research into the right next action',
  body = 'When a visitor is ready, route them into the right CARSI path: self-paced learning, CCW-linked practical support, equipment/service readiness, or team and buyer guidance.',
  paths,
}: {
  title?: string;
  body?: string;
  paths: StartSmartLeadPath[];
}) {
  return (
    <section id="start-smart-lead-paths" className={marketingSection}>
      <MarketingSectionHeader eyebrow="Conversion paths" title={title} body={body} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {paths.map((path) => (
          <LeadPathCard key={path.id} path={path} />
        ))}
      </div>
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
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={startSmartHubFaqs} />

      <StartSmartHubHero />
      <StartSmartAiAnswerStrip />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Choose your starting point</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Sub-pillar pages built for search intent
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Each page answers a real-world question: starting from zero, adding carpet cleaning to a
            cleaning business, buying a business, choosing equipment, learning chemistry, pricing
            work, building trust and picking a service model.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {startSmartPages.map((page) => (
              <Link
                key={page.slug}
                href={`${startSmartBasePath}/${page.slug}`}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-[#2490ed]/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fafbfc] text-[#146fc2]">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold tracking-[0.14em] text-[#a85500] uppercase">
                  {page.eyebrow}
                </p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">{page.shortTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{page.directAnswer}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2]">
                  Read page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <ProfessionalReadinessLoop />
        </div>
      </div>

      <div className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <StartSmartLeadPaths paths={startSmartLeadPaths} />
        </div>
      </div>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-5 lg:grid-cols-3`}>
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
            <div key={title} className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-5">
              <Icon className="h-6 w-6 text-[#146fc2]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <HomeFaqSection faqs={startSmartHubFaqs} />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Trusted references</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Source-backed, not hype-backed
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            CARSI should be discoverable anywhere in the world, but the pages stay honest: online
            learning supports competence; local legal, insurance and certification requirements
            still need to be checked.
          </p>
          <div className="mt-10">
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
          </div>
        </div>
      </section>

      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-12`}>
        <MarketingGrowthLinks currentHref={startSmartBasePath} />
      </div>
      <PlatformContextualNext current={startSmartBasePath} />
      <StaticMarketingClosingCta />
    </>
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
  const pageFaqs = getStartSmartPageFaqs(page);
  const leadPaths = getStartSmartLeadPathsForPage(page.slug);

  return (
    <MarketingPageShell innerClassName={marketingPageInnerWideClass}>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={pageFaqs} />

      <article>
        <header className="grid gap-8 pt-2 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href={startSmartBasePath}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]"
            >
              Back to Start Smart
            </Link>
            <p className={`mb-3 ${marketingEyebrow}`}>{page.eyebrow}</p>
            <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white/90">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg dark:text-white/68">
              {page.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {page.keywords.slice(0, 4).map((keyword) => (
                <Pill key={keyword}>{keyword}</Pill>
              ))}
            </div>
          </div>

          <aside className={`p-5 ${marketingPanel}`}>
            <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
              Direct answer
            </p>
            <p className="mt-3 text-lg leading-7 text-slate-900 dark:text-white/90">
              {page.directAnswer}
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ['Audience', page.audience],
                ['Intent', page.intent],
                ['Outcome', page.outcome],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/6 dark:bg-white/[0.03]"
                >
                  <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrow}`}>
                    {label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </header>

        <section className={`grid gap-5 ${marketingSection} lg:grid-cols-3`}>
          <div className={`p-5 lg:col-span-1 ${marketingPanel}`}>
            <AlertTriangle
              className="h-6 w-6 text-[#a85500] dark:text-[#ed9d24]"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white/90">
              Beginner risks to avoid
            </h2>
            <ul className="mt-4 space-y-3">
              {page.risks.map((risk) => (
                <li
                  key={risk}
                  className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/55"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ed9d24]" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-5 lg:col-span-2 ${marketingPanel}`}>
            <BookOpen className="h-6 w-6 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white/90">
              What to learn first
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.learnFirst.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-white/6 dark:bg-white/[0.03] dark:text-white/55"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <StartSmartOperatingMap page={page} />

        <ProfessionalReadinessLoop compact />

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Action path"
            title="A practical next-step sequence"
            body="The goal is not to delay action forever. It is to put learning, practice and decision-making in the right order."
          />
          <div className="grid gap-4 md:grid-cols-4">
            {page.actionSteps.map((step, index) => (
              <div key={step} className={`p-5 ${marketingPanel}`}>
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10 font-mono text-sm text-[#146fc2] dark:text-[#7ec5ff]">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-white/68">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <StartSmartLeadPaths
          title="Choose the next step for this pathway"
          body="This page should lead to a useful action: learn the technical baseline, ask about CCW practical support, check equipment and service readiness, or plan team/buyer training."
          paths={leadPaths}
        />

        <section className={`grid gap-5 ${marketingSection} lg:grid-cols-[0.8fr_1.2fr]`}>
          <div className={`p-6 ${marketingPanel}`}>
            <Target className="h-6 w-6 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white/90">
              {page.cta.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
              {page.cta.body}
            </p>
            <Link href={page.cta.href} className={`mt-5 ${marketingBtnPrimary}`}>
              {page.cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className={`p-6 ${marketingPanel}`}>
            <HelpCircle className="h-6 w-6 text-[#a85500] dark:text-[#ed9d24]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white/90">
              Questions this page answers
            </h2>
            <div className="mt-5 space-y-3">
              {pageFaqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/6 dark:bg-white/[0.03]"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white/90">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="References"
            title="Why this guidance is grounded"
            body="CARSI pages should earn trust by linking to the standards, business and training references behind the advice."
          />
          <SourceList sources={page.sources} />
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader eyebrow="Keep exploring" title="Related Start Smart pages" />
          <div className="grid gap-4 md:grid-cols-4">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`${startSmartBasePath}/${related.slug}`}
                className={`group p-4 ${marketingPanel} ${marketingPanelHover}`}
              >
                <GraduationCap
                  className="h-5 w-5 text-[#146fc2] dark:text-[#7ec5ff]"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white/90">
                  {related.shortTitle}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/55">
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <MarketingGrowthLinks currentHref={startSmartBasePath} />
      </article>
    </MarketingPageShell>
  );
}

export function StartSmartIndexingNote() {
  return (
    <div className={`p-5 ${marketingPanel}`}>
      <div className="flex items-start gap-3">
        <ClipboardCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white/90">Indexing setup</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">
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
