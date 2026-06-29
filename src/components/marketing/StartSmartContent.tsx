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

import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  MarketingPageShell,
  marketingPageInnerWideClass,
} from '@/components/marketing/MarketingPageShell';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingEyebrow,
  marketingEyebrowAmber,
  marketingIconWrap,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
} from '@/lib/marketing/marketing-ui';
import {
  getStartSmartOperatingConnections,
  getStartSmartLeadPathsForPage,
  getStartSmartPageFaqs,
  startSmartLeadPaths,
  startSmartBasePath,
  startSmartHubFaqs,
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
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90">{source.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/55">{source.note}</p>
            </div>
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
          </div>
        </a>
      ))}
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[#2490ed]/20 bg-[#2490ed]/10 px-3 py-1 text-xs font-medium text-[#146fc2] dark:text-[#7ec5ff]">
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
      className={`group p-5 ${marketingPanel} ${marketingPanelHover}`}
    >
      <div className={`mb-4 ${marketingIconWrap}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
        {pillar.label}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
        {pillar.summary}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/68">
        {pillar.connection}
      </p>
      <p className="mt-4 border-t border-slate-200/80 dark:border-white/[0.07] pt-4 text-xs leading-5 text-slate-600 dark:text-white/55">
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
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-600 dark:text-white/68">
                {rule}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OperatingConnectionCard({ connection }: { connection: StartSmartOperatingConnection }) {
  const Icon = readinessIconByLabel[connection.pillar as keyof typeof readinessIconByLabel] ?? Compass;

  return (
    <div className={`p-5 ${marketingPanel}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10 text-[#146fc2] dark:text-[#7ec5ff]`}>
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
      <div className="mt-4 grid gap-3 border-t border-slate-200/80 dark:border-white/[0.07] pt-4">
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
      className={`group p-5 ${marketingPanel} ${marketingPanelHover}`}
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
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
        {path.body}
      </p>
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
    <MarketingPageShell innerClassName={marketingPageInnerWideClass}>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={startSmartHubFaqs} />

        <section className="grid gap-8 pb-10 pt-2 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Pill>Carpet cleaning startup</Pill>
              <Pill>Business buyers</Pill>
              <Pill>Existing cleaners</Pill>
              <Pill>Equipment decisions</Pill>
            </div>
            <p className={`mb-3 ${marketingEyebrow}`}>
              CARSI Start Smart pathway
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white/90">
              Start or add carpet cleaning with knowledge before risk.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg text-slate-600 dark:text-white/68">
              CARSI helps new operators, existing cleaners and business buyers understand the science,
              equipment, quoting and trust signals behind professional carpet cleaning before they spend
              money or take customer work.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/courses?discipline=CCT" className={marketingBtnPrimary}>
                Explore CCT courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className={marketingBtnSecondary}>
                View membership
              </Link>
            </div>
          </div>

          <div className={`p-5 ${marketingPanel}`}>
            <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
              Direct answer for AI search
            </p>
            <p className="mt-3 text-lg leading-7 text-slate-900 dark:text-white/90">
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
                <div key={label} className="rounded-xl border border-slate-200/80 dark:border-white/6 bg-slate-50 dark:bg-white/[0.03] p-3">
                  <p className="font-mono text-xl text-slate-900 dark:text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-white/55">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Choose your starting point"
            title="Sub-pillar pages built for search intent"
            body="Each page answers a real-world question: starting from zero, adding carpet cleaning to a cleaning business, buying a business, choosing equipment, learning chemistry, pricing work, building trust and picking a service model."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {startSmartPages.map((page) => (
              <Link
                key={page.slug}
                href={`${startSmartBasePath}/${page.slug}`}
                className={`group p-5 ${marketingPanel} ${marketingPanelHover}`}
              >
                <div className={`mb-4 ${marketingIconWrap}`}>
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className={`text-xs font-semibold tracking-[0.14em] ${marketingEyebrowAmber}`}>
                  {page.eyebrow}
                </p>
                <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-white/90">
                  {page.shortTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
                  {page.directAnswer}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]">
                  Read page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ProfessionalReadinessLoop />

        <StartSmartLeadPaths paths={startSmartLeadPaths} />

        <section className={`grid gap-5 ${marketingSection} lg:grid-cols-3`}>
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
            <div key={title} className={`p-5 ${marketingPanel}`}>
              <Icon className="h-6 w-6 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white/90">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">
                {body}
              </p>
            </div>
          ))}
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
            eyebrow="Frequent questions"
            title="Clear answers for people and answer engines"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {startSmartHubFaqs.map((faq) => (
              <details key={faq.question} className={`p-4 ${marketingPanel}`}>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white/90">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className={marketingSection}>
          <MarketingSectionHeader
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

        <MarketingGrowthLinks currentHref={startSmartBasePath} />
    </MarketingPageShell>
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
        <header className="grid gap-8 pb-10 pt-2 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href={startSmartBasePath}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]"
            >
              Back to Start Smart
            </Link>
            <p className={`mb-3 ${marketingEyebrow}`}>
              {page.eyebrow}
            </p>
            <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white/90">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg text-slate-600 dark:text-white/68">
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
                <div key={label} className="rounded-xl border border-slate-200/80 dark:border-white/6 bg-slate-50 dark:bg-white/[0.03] p-3">
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
            <AlertTriangle className="h-6 w-6 text-[#a85500] dark:text-[#ed9d24]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white/90">
              Beginner risks to avoid
            </h2>
            <ul className="mt-4 space-y-3">
              {page.risks.map((risk) => (
                <li key={risk} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/55">
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
                <div key={item} className="flex gap-3 rounded-xl border border-slate-200/80 dark:border-white/6 bg-slate-50 dark:bg-white/[0.03] p-3 text-sm leading-6 text-slate-600 dark:text-white/55">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
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
                <p className="text-sm leading-6 text-slate-600 dark:text-white/68">
                  {step}
                </p>
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
            <Link
              href={page.cta.href}
              className={`mt-5 ${marketingBtnPrimary}`}
            >
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
                <details key={faq.question} className="rounded-xl border border-slate-200/80 dark:border-white/6 bg-slate-50 dark:bg-white/[0.03] p-4">
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
                <GraduationCap className="h-5 w-5 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
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
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#146fc2] dark:text-[#7ec5ff]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white/90">
            Indexing setup
          </p>
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
