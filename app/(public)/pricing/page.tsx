import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';

export const metadata: Metadata = {
  title: 'Pricing | CARSI — Restoration Training Online',
  description:
    'CARSI membership from $44/month — access IICRC CEC-approved restoration courses, track your credits, and earn verified certificates. Free Library available to all.',
  keywords: [
    'CARSI pricing',
    'restoration training membership',
    'IICRC CEC courses online',
    'building restoration courses Australia',
    'water damage training subscription',
    'mould remediation online course',
  ],
  openGraph: {
    title: 'Pricing | CARSI — Restoration Training Online',
    description:
      'Free Library, Foundation $44/mo, Growth $99/mo. Every plan includes a 7-day free trial.',
    type: 'website',
    url: 'https://carsi.com.au/pricing',
  },
  alternates: { canonical: 'https://carsi.com.au/pricing' },
};

const FAQ_ITEMS = [
  {
    question: 'How does the 7-day free trial work?',
    answer:
      'Your trial begins the moment you sign up. You have full access to every course in your chosen plan for 7 days at no cost. Your card is only charged on day 8 if you choose to continue. Cancel any time before then with no questions asked.',
  },
  {
    question: 'Can I cancel my membership at any time?',
    answer:
      'Yes — cancel any time from your student dashboard. Your access continues until the end of the current billing period. No lock-in contracts, no cancellation fees.',
  },
  {
    question: "What's the difference between Foundation and Growth?",
    answer:
      'Foundation covers entry-level and practical CEC courses — PPE, moisture metering, carpet cleaning basics, Level 1 Mould Remediation, and more. Growth unlocks the full catalogue including advanced disciplines: Level 2 Mould, Admin, Social Media Marketing, Asthma & Allergy, NeoSan Labs, and all Introduction to courses valued at $500+.',
  },
  {
    question: 'Do CARSI courses count toward IICRC CECs?',
    answer:
      "CARSI's catalogue of approximately 40 courses carries IICRC CEC approval. Your membership includes a CEC tracking dashboard that logs every credit you earn, broken down by discipline (WRT, CRT, OCT, ASD, CCT and more).",
  },
  {
    question: 'What happens if my membership lapses?',
    answer:
      'Your course access closes when the billing period ends. Your progress and certificates are saved — resume immediately when you renew. There is no data loss.',
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

const FOUNDATION_EXTRAS = [
  'Everything in Free Library',
  'Policies & Procedures',
  'Donning & Doffing PPE (valued at $39)',
  'Microbe Clean Basic Understanding (valued at $99)',
  'Level 1 Mould Remediation (valued at $49)',
  'Starting a Business course',
  'Moisture Meter Course (valued at $39)',
  'Carpet Cleaning Basics (valued at $55)',
  'Safety Data Sheets Course',
  'ToolBox Meetings Assistance',
];

const GROWTH_EXTRAS = [
  'Everything in Foundation',
  'BONUS Policies & Procedures',
  'NeoSan Labs Product Course (valued at $99)',
  'Social Media Marketing (valued at $79)',
  'Admin Course (valued at $275)',
  'Level 2 Mould Remediation (valued at $99)',
  'Asthma & Allergy Course (valued at $129)',
  'ALL Introduction To courses (value $500+)',
  'IICRC CEC tracking dashboard',
  'XP leaderboard & streak tracker',
  'PDF certificate wallet',
  'Shareable credential profile',
];

export default function PricingPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={FAQ_ITEMS} />

      <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          {/* ── Hero ───────────────────────────────────────── */}
          <section className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Membership &amp; Pricing
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/50">
              For the cleaning and restoration industry. Start free — upgrade when you&apos;re
              ready.
            </p>
          </section>

          {/* ── 3-Tier Grid ────────────────────────────────── */}
          <section
            aria-label="Membership tiers"
            className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {/* Free Library */}
            <div
              className="flex flex-col rounded-sm border p-6"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="mb-6">
                <h2 className="mb-1 font-mono text-lg font-bold text-white">Free Library</h2>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-white">FREE</span>
                </div>
                <p className="mt-1 text-xs text-white/30">No card required</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-white/60">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-white/30">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/register"
                  className="flex w-full items-center justify-center rounded-sm border border-white/[0.12] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Foundation */}
            <div
              className="flex flex-col rounded-sm border p-6"
              style={{
                borderColor: 'rgba(36,144,237,0.3)',
                background: 'rgba(36,144,237,0.04)',
              }}
            >
              <div className="mb-6">
                <h2 className="mb-1 font-mono text-lg font-bold text-white">Foundation</h2>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-white">$44</span>
                  <span className="font-mono text-sm text-white/40">AUD / month</span>
                </div>
                <p className="mt-1 text-xs text-white/30">GST included · Cancel anytime</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-white/70">
                {FOUNDATION_EXTRAS.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: '#2490ed' }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/subscribe?plan=foundation"
                  className="flex w-full items-center justify-center rounded-sm px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#2490ed' }}
                >
                  Start 7-Day Free Trial
                </Link>
                <p className="mt-2 text-center text-xs text-white/25">
                  Card required. No charge for 7 days.
                </p>
              </div>
            </div>

            {/* Growth — highlighted */}
            <div
              className="relative flex flex-col rounded-sm border p-6"
              style={{
                borderColor: 'rgba(0,245,255,0.3)',
                background:
                  'linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(0,245,255,0.02) 100%)',
              }}
            >
              {/* Most Popular badge */}
              <div className="absolute -top-3 left-6">
                <span
                  className="rounded-sm px-3 py-1 text-xs font-semibold tracking-wide uppercase"
                  style={{ background: '#00FF88', color: '#050505' }}
                >
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h2 className="mb-1 font-mono text-lg font-bold text-white">Growth</h2>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-white">$99</span>
                  <span className="font-mono text-sm text-white/40">AUD / month</span>
                </div>
                <p className="mt-1 text-xs text-white/30">GST included · Cancel anytime</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-white/70">
                {GROWTH_EXTRAS.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-[#00FF88]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/subscribe?plan=growth"
                  className="flex w-full items-center justify-center rounded-sm bg-[#00F5FF] px-4 py-2.5 text-sm font-semibold text-[#050505] transition-opacity hover:opacity-90"
                >
                  Start 7-Day Free Trial
                </Link>
                <p className="mt-2 text-center text-xs text-white/25">
                  Card required. No charge for 7 days.
                </p>
              </div>
            </div>
          </section>

          {/* ── Per-Course CTA ─────────────────────────────── */}
          <section
            aria-label="Individual courses"
            className="mb-16 flex flex-col items-start justify-between gap-4 rounded-sm border border-white/[0.06] bg-white/[0.02] p-6 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="mb-1 text-base font-semibold text-white/85">Or pay per course</h2>
              <p className="text-sm text-white/40">
                Not ready to subscribe? Enrol in individual courses at your own pace.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex flex-shrink-0 items-center rounded-sm border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.08)] px-5 py-2.5 text-sm font-semibold text-[#00F5FF] transition-colors hover:bg-[rgba(0,245,255,0.14)]"
            >
              View All Courses
            </Link>
          </section>

          {/* ── FAQ ────────────────────────────────────────── */}
          <section aria-label="Frequently asked questions" className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <div className="flex flex-col divide-y divide-white/[0.06]">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white/80 hover:text-white">
                    {item.question}
                    <span
                      className="flex-shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/45">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Footer note ────────────────────────────────── */}
          <p className="text-center text-xs text-white/20">
            Prices in AUD. GST included. Billed monthly. Managed via Stripe — secure payment
            processing.
            <br />
            Questions?{' '}
            <Link href="/contact" className="underline hover:text-white/50">
              Contact the CARSI team
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
