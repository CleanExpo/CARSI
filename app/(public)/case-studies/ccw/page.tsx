import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Handshake,
  Quote,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { ArticleSchema } from '@/components/seo/JsonLd';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingHeading,
  marketingIconWrap,
  marketingPanel,
  marketingStatCard,
  marketingTextMuted,
} from '@/lib/marketing/marketing-ui';

const PAGE_URL = `${getPublicSiteUrl()}/case-studies/ccw`;

export const metadata: Metadata = {
  title: 'Case Study: Carpet Cleaners Warehouse | CARSI',
  description:
    'How Carpet Cleaners Warehouse became the first paying client of CCW-CRM — a $33,000/year SaaS contract unifying e-commerce and field-service customer relationships for an Australian cleaning-industry supplier.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Case Study: Carpet Cleaners Warehouse | CARSI',
    description:
      'How Carpet Cleaners Warehouse became the first paying client of CCW-CRM — unifying e-commerce and field-service customer relationships on one platform.',
    url: PAGE_URL,
    type: 'article',
  },
};

const HERO_STATS = [
  { value: '$33,000', label: 'Annual contract value (AUD)' },
  { value: '$2,750', label: 'Per month, 12-month SaaS term' },
  { value: 'Client #1', label: 'First paying CCW-CRM customer' },
  { value: 'Zero', label: 'Churn since go-live' },
];

const CHALLENGE_POINTS = [
  {
    icon: ShoppingCart,
    title: 'Two customer worlds, one relationship',
    body: 'CCW sells carpet cleaning supplies and equipment through a Shopify-based e-commerce store while also supporting technicians and field-service operators in the real world. Orders, enquiries and service conversations were living in separate systems — with no single view of the customer behind them.',
  },
  {
    icon: Users,
    title: 'Relationships managed by memory',
    body: 'As the customer base grew, follow-ups, repeat-order timing and account history depended on individual recall and inbox searches. Valuable context — what a customer bought, when they were last contacted, what they might need next — was scattered and hard to act on.',
  },
  {
    icon: TrendingUp,
    title: 'Growth needed a system, not more spreadsheets',
    body: 'CCW needed a purpose-built CRM that understood both sides of the business — online orders and field-service relationships — without forcing the team onto a generic platform ill-suited to the cleaning and restoration industry.',
  },
];

const SOLUTION_POINTS = [
  {
    title: 'One customer record across e-commerce and field service',
    body: 'CCW-CRM consolidates Shopify order history, enquiries and service interactions into a single customer profile, so every conversation starts with full context.',
  },
  {
    title: 'Follow-ups that actually happen',
    body: 'Structured pipelines and reminders replace inbox archaeology — re-order prompts, quote follow-ups and account check-ins are tracked and actioned on time.',
  },
  {
    title: 'Built for the industry, not adapted to it',
    body: 'Rather than bending a generic CRM to fit, CCW adopted a platform designed around the workflows of cleaning and restoration suppliers and their trade customers.',
  },
];

const RESULT_STATS = [
  {
    value: '$33,000/yr',
    label: 'Committed annual recurring revenue',
    detail:
      'A 12-month SaaS contract at $2,750 per month — real budget, committed by a real operating business.',
  },
  {
    value: 'First',
    label: 'Paying client on the platform',
    detail:
      'CCW validated CCW-CRM in production before any other customer — the proof case for the platform.',
  },
  {
    value: 'Live',
    label: 'In daily operation',
    detail:
      'The platform is running in CCW\u2019s day-to-day business, not sitting in a pilot or trial.',
  },
  {
    value: '0%',
    label: 'Churn',
    detail:
      'CCW remains an active, paying customer — and has agreed to the use of its logo and story.',
  },
];

export default function CcwCaseStudyPage() {
  return (
    <MarketingPageShell id="main-content">
      <ArticleSchema
        headline="Case Study: Carpet Cleaners Warehouse — first paying client of CCW-CRM"
        description="How Carpet Cleaners Warehouse unified e-commerce and field-service customer relationships on CCW-CRM under a $33,000/year SaaS contract."
        url={PAGE_URL}
        datePublished="2026-08-23"
        articleSection="Case Studies"
        keywords={[
          'CCW-CRM case study',
          'Carpet Cleaners Warehouse',
          'cleaning industry CRM Australia',
          'Unite Group',
        ]}
      />

      {/* ---------- Hero ---------- */}
      <header className="pb-10 sm:pb-12">
        <p className={`mb-4 inline-flex items-center gap-2 ${marketingEyebrowPill}`}>
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Customer case study
        </p>
        <h1 className={`max-w-3xl ${marketingHeading}`}>
          Carpet Cleaners Warehouse: the first business to bet on CCW-CRM
        </h1>
        <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${marketingTextMuted}`}>
          Carpet Cleaners Warehouse (CCW) is one of Australia&rsquo;s best-known suppliers to the
          carpet cleaning industry. When they needed to manage customer relationships across
          e-commerce and field service, they chose CCW-CRM — becoming the platform&rsquo;s first
          paying client under a $33,000-per-year contract.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className={marketingStatCard}>
              <dd className="text-2xl font-bold tracking-tight text-[#146fc2] dark:text-[#8fd0ff]">
                {stat.value}
              </dd>
              <dt
                className={`mt-1 text-xs font-medium tracking-wide uppercase ${marketingTextMuted}`}
              >
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </header>

      {/* ---------- Challenge ---------- */}
      <section aria-label="The challenge" className="mt-14 sm:mt-16">
        <MarketingSectionHeader
          eyebrow="The challenge"
          title="One customer, two disconnected worlds"
          body="CCW runs a Shopify-based e-commerce store supplying carpet cleaning professionals — while also supporting those same operators in the field. Keeping track of the whole relationship was getting harder as the business grew."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {CHALLENGE_POINTS.map((point) => (
            <article key={point.title} className={`p-6 ${marketingPanel}`}>
              <div className={marketingIconWrap}>
                <point.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                {point.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Solution ---------- */}
      <section aria-label="The solution" className="mt-14 sm:mt-16">
        <MarketingSectionHeader
          eyebrow="The solution"
          title="A CRM built around the cleaning industry"
          body="CCW adopted CCW-CRM — Unite Group&rsquo;s customer relationship platform — to bring e-commerce and field-service customer management into one place."
        />
        <div className={`p-6 sm:p-8 ${marketingPanel}`}>
          <ol className="space-y-6">
            {SOLUTION_POINTS.map((point, index) => (
              <li key={point.title} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#146fc2] text-sm font-bold text-white"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {point.title}
                  </h3>
                  <p className={`mt-1 text-sm leading-relaxed ${marketingTextMuted}`}>
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Pull quote — placeholder only, do not publish without client approval */}
          <figure className="mt-8 border-t border-slate-200/80 pt-8 dark:border-white/[0.08]">
            <Quote className="h-6 w-6 text-[#2490ed]" aria-hidden />
            <blockquote className="mt-3 text-lg leading-relaxed font-medium text-slate-800 dark:text-white/85">
              [QUOTE PLACEHOLDER — approved testimonial from Toby Bredhauer, Carpet Cleaners
              Warehouse, to be inserted before publication]
            </blockquote>
            <figcaption className={`mt-3 text-sm ${marketingTextMuted}`}>
              Toby Bredhauer — Carpet Cleaners Warehouse
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- Results ---------- */}
      <section aria-label="The results" className="mt-14 sm:mt-16">
        <MarketingSectionHeader
          eyebrow="The results"
          title="A real contract, a live platform, zero churn"
          body="CCW didn&rsquo;t trial CCW-CRM — they committed to it. The partnership is the platform&rsquo;s first proof that the market will pay for what it does."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {RESULT_STATS.map((stat) => (
            <article key={stat.label} className={`p-6 ${marketingPanel}`}>
              <p className="text-3xl font-bold tracking-tight text-[#146fc2] dark:text-[#8fd0ff]">
                {stat.value}
              </p>
              <p
                className={`mt-1 text-xs font-semibold tracking-wide uppercase ${marketingTextMuted}`}
              >
                {stat.label}
              </p>
              <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>{stat.detail}</p>
            </article>
          ))}
        </div>
        <p className={`mt-6 max-w-3xl text-sm leading-relaxed ${marketingTextMuted}`}>
          Logo and name usage rights agreed. For CCW-CRM enquiries, the reference contact at Carpet
          Cleaners Warehouse is Toby Bredhauer.
        </p>
      </section>

      {/* ---------- CTA ---------- */}
      <section aria-label="Get started" className="mt-14 sm:mt-16">
        <div
          className={`flex flex-col items-start gap-6 p-8 sm:p-10 ${marketingPanel}`}
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(36,144,237,0.08) 0%, transparent 55%), linear-gradient(225deg, rgba(237,157,36,0.06) 0%, transparent 50%)',
          }}
        >
          <div className={marketingIconWrap}>
            <Handshake className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-balance text-slate-900 md:text-3xl dark:text-white">
              See what CCW saw
            </h2>
            <p className={`mt-3 max-w-2xl text-base leading-relaxed ${marketingTextMuted}`}>
              If your business manages customers across online sales and field service, CCW-CRM was
              built for you. Book a demo and we&rsquo;ll walk you through the same platform Carpet
              Cleaners Warehouse runs on every day.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/contact" className={marketingBtnPrimary}>
              Book a demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/pricing" className={marketingBtnSecondary}>
              <CalendarCheck className="h-4 w-4" aria-hidden />
              See plans and pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
