import type { Metadata } from 'next';
import Link from 'next/link';

import { PricingTiers } from '@/components/pricing/PricingTiers';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

export const metadata: Metadata = {
  title: 'Pricing — Restoration Training Online',
  description:
    'Buy any CARSI course individually — with IICRC CEC tracking and verified certificates. Free Library available to everyone, no card required. Yearly membership and Teams plans are coming soon.',
  keywords: [
    'CARSI pricing',
    'restoration training membership',
    'IICRC CEC courses online',
    'building restoration courses Australia',
    'water damage training course',
    'mould remediation online course',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Pricing | CARSI — Restoration Training Online',
    description:
      'Free Library for everyone and per-course enrolment, available today. Yearly membership and Teams plans are coming soon.',
    type: 'website',
    url: 'https://carsi.com.au/pricing',
  },
  alternates: { canonical: 'https://carsi.com.au/pricing' },
};

const FAQ_ITEMS = [
  {
    question: 'Do I have to buy anything to start?',
    answer:
      'No. Every learner gets the Free Library at no cost and no card required. When you are ready, buy any individual course outright — a yearly membership is an optional path for 100% access.',
  },
  {
    question: "What's included in a yearly membership?",
    answer:
      'Yearly membership is coming soon and is not available to purchase yet. When it launches, it will give 100% access to all published CARSI courses for one learner for 12 months, plus the IICRC CEC tracking dashboard and certificate wallet. Buy any course individually today.',
  },
  {
    question: 'Do CARSI courses count toward IICRC CECs?',
    answer:
      "CARSI's catalogue includes IICRC CEC Accredited courses where stated. Your dashboard includes a CEC tracking dashboard that logs completed credits, broken down by discipline (WRT, RRT, OCT, ASD, CCT and more).",
  },
];

const breadcrumbs = [
  { name: 'Home', url: 'https://carsi.com.au' },
  { name: 'Pricing', url: 'https://carsi.com.au/pricing' },
];

const FREE_FEATURES = [
  'Australian Government Resources',
  'Standard Operating Procedures',
  'Cleaning Essentials guide',
  'Job Safety & Environmental Analysis',
  'Safe Work Method Statement',
  'Free Webinar Series',
  'Industry Terminology guide',
  'Technician Flow Chart',
  'Moisture & Dehumidification guide',
  'ChatGPT Cheat Sheet for Restorers',
];

export default function PricingPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={FAQ_ITEMS} />

      <main id="main-content" className="min-h-screen bg-[#f6f8fb] px-4 py-14 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <section className="mb-12 text-center">
            <p className="mb-3 inline-flex rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-xs font-semibold text-[#146fc2]">
              Transparent CARSI access
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Membership &amp; Pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              Buy any course individually. Free Library for everyone — no card required. Yearly
              membership and Teams plans are coming soon.
            </p>
            <p className="mx-auto mt-4 max-w-2xl rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-4 py-3 text-sm leading-relaxed text-[#7a3500]">
              CARSI courses earn IICRC Continuing Education Credits (CECs). They are not IICRC
              certification courses — IICRC certifications are obtained through IICRC-approved schools
              and examinations.
            </p>
          </section>

          <section
            aria-label="Course guidance"
            className="mb-10 grid gap-5 rounded-xl border border-[#f2cf8f] bg-[#fff8ed] p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#7a3500] uppercase">
                Not sure what to buy or learn first?
              </p>
              <h2 className="text-xl font-semibold text-slate-950">
                Buying more than one course? Find your pathway first.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                See which courses suit learners maintaining CECs, refreshing knowledge across
                multiple disciplines, or planning beginner through advanced study over time.
              </p>
            </div>
            <Link
              href="/pathways"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#9a4a00] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7a3500]"
            >
              Find my pathway
            </Link>
          </section>

          <PricingTiers subscriptionsEnabled={subscriptionsEnabled()} />

          <section aria-label="Free Library" className="mb-16">
            <div className="mx-auto max-w-md">
              <MembershipCard
                title="Free Library"
                price="FREE"
                priceSuffix="No card required"
                features={FREE_FEATURES}
                cta="Create Free Account"
                href="/register"
                tone="neutral"
              />
            </div>
          </section>

          <section
            aria-label="Individual courses"
            className="mb-16 flex flex-col items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="mb-1 text-base font-semibold text-slate-950">Or pay per course</h2>
              <p className="text-sm text-slate-600">
                If you only need one specific course, individual enrolment is still available.
                Planning several courses? Membership gives full access.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-[#b8dbfb] bg-[#eef7ff] px-5 py-2.5 text-sm font-semibold text-[#146fc2] transition-colors hover:bg-[#dceeff]"
            >
              View All Courses
            </Link>
          </section>

          <section aria-label="Frequently asked questions" className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-slate-950">Frequently Asked Questions</h2>
            <div className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-5 shadow-sm">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-800 hover:text-slate-950">
                    {item.question}
                    <span
                      className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="text-center text-xs text-slate-600">
            Prices in AUD. GST included. Pay once per course. Managed via Stripe — secure payment
            processing.
            <br />
            Questions?{' '}
            <Link href="/contact" className="font-medium text-[#146fc2] underline">
              Contact the CARSI team
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}

function MembershipCard({
  title,
  price,
  priceSuffix,
  helper,
  features,
  cta,
  href,
  note,
  badge,
  tone,
}: {
  title: string;
  price: string;
  priceSuffix: string;
  helper?: string;
  features: string[];
  cta: string;
  href: string;
  note?: string;
  badge?: string;
  tone: 'neutral' | 'blue' | 'green';
}) {
  const isBlue = tone === 'blue';
  const isGreen = tone === 'green';

  return (
    <div
      className="relative flex flex-col rounded-lg border bg-white p-6 shadow-sm"
      style={{
        borderColor: isBlue ? '#b8dbfb' : isGreen ? '#9fdab8' : 'rgba(15,23,42,0.1)',
        background: isBlue ? '#f4faff' : isGreen ? '#f1fbf5' : '#ffffff',
      }}
    >
      {badge ? (
        <div className="absolute -top-3 left-6">
          <span className="rounded-md bg-[#1b7f48] px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
            {badge}
          </span>
        </div>
      ) : null}

      <div className="mb-6">
        <h2 className="mb-1 text-lg font-bold text-slate-950">{title}</h2>
        {tone !== 'neutral' ? (
          <p className="mb-3 inline-flex rounded-md border border-[#b8dbfb] bg-white px-2 py-1 text-[11px] font-semibold text-[#146fc2]">
            Includes 100% course access
          </p>
        ) : null}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-950">{price}</span>
          {price !== 'FREE' ? (
            <span className="text-sm text-slate-500">{priceSuffix}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">{helper ?? priceSuffix}</p>
      </div>

      <ul className="mb-8 flex flex-col gap-2.5 text-sm text-slate-600">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span
              className="mt-0.5 shrink-0 font-semibold"
              style={{ color: isGreen ? '#1b7f48' : isBlue ? '#146fc2' : '#64748b' }}
            >
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link
          href={href}
          className="flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: isGreen ? '#1b7f48' : isBlue ? '#0f5fa8' : 'transparent',
            color: isGreen || isBlue ? '#ffffff' : '#146fc2',
            border: isGreen || isBlue ? 'none' : '1px solid rgba(15,95,168,0.35)',
          }}
        >
          {cta}
        </Link>
        {note ? <p className="mt-2 text-center text-xs text-slate-500">{note}</p> : null}
      </div>
    </div>
  );
}
