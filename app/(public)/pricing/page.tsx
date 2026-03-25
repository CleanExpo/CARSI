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
      "CARSI's catalogue of 160+ courses carries IICRC CEC approval. Your membership includes a CEC tracking dashboard that logs every credit you earn, broken down by discipline (WRT, CRT, OCT, ASD, CCT and more).",
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

      <main className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-6xl">
          {/* ── Hero ───────────────────────────────────────── */}
          <section className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Membership &amp; Pricing
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
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
            <div className="flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="mb-6">
                <h2 className="mb-1 text-lg font-bold text-foreground">Free Library</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">FREE</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/50">No card required</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-muted-foreground">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-muted-foreground/50">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/register"
                  className="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Foundation */}
            <div
              className="flex flex-col rounded-lg border border-primary/20 bg-primary/5 p-6"
            >
              <div className="mb-6">
                <h2 className="mb-1 text-lg font-bold text-foreground">Foundation</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">$44</span>
                  <span className="text-sm text-muted-foreground">AUD / month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/50">GST included · Cancel anytime</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-muted-foreground">
                {FOUNDATION_EXTRAS.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-primary">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/subscribe?plan=foundation"
                  className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start 7-Day Free Trial
                </Link>
                <p className="mt-2 text-center text-xs text-muted-foreground/50">
                  Card required. No charge for 7 days.
                </p>
              </div>
            </div>

            {/* Growth — highlighted */}
            <div className="relative flex flex-col rounded-lg border border-primary/20 bg-primary/5 p-6">
              {/* Most Popular badge */}
              <div className="absolute -top-3 left-6">
                <span className="rounded-lg bg-green-500 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-black">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h2 className="mb-1 text-lg font-bold text-foreground">Growth</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">$99</span>
                  <span className="text-sm text-muted-foreground">AUD / month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/50">GST included · Cancel anytime</p>
              </div>

              <ul className="mb-8 flex flex-col gap-2.5 text-sm text-muted-foreground">
                {GROWTH_EXTRAS.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-green-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/subscribe?plan=growth"
                  className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start 7-Day Free Trial
                </Link>
                <p className="mt-2 text-center text-xs text-muted-foreground/50">
                  Card required. No charge for 7 days.
                </p>
              </div>
            </div>
          </section>

          {/* ── Per-Course CTA ─────────────────────────────── */}
          <section
            aria-label="Individual courses"
            className="mb-16 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="mb-1 text-base font-semibold text-foreground/90">Or pay per course</h2>
              <p className="text-sm text-muted-foreground">
                Not ready to subscribe? Enrol in individual courses at your own pace.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex flex-shrink-0 items-center rounded-lg border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              View All Courses
            </Link>
          </section>

          {/* ── FAQ ────────────────────────────────────────── */}
          <section aria-label="Frequently asked questions" className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <div className="flex flex-col divide-y divide-border">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground/90 hover:text-foreground">
                    {item.question}
                    <span
                      className="flex-shrink-0 text-muted-foreground/50 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Footer note ────────────────────────────────── */}
          <p className="text-center text-xs text-muted-foreground/50">
            Prices in AUD. GST included. Billed monthly. Managed via Stripe — secure payment
            processing.
            <br />
            Questions?{' '}
            <Link href="/contact" className="underline hover:text-muted-foreground">
              Contact the CARSI team
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
