'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export function PricingCards() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      {/* ── Billing toggle ──────────────────────────────── */}
      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
          onClick={() => setYearly((v) => !v)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
            yearly ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
              yearly ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Yearly
          <span className="ml-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
            Save up to 33%
          </span>
        </span>
      </div>

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
        <div className="flex flex-col rounded-lg border border-primary/20 bg-primary/5 p-6">
          <div className="mb-6">
            <h2 className="mb-1 text-lg font-bold text-foreground">Foundation</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {yearly ? '$495' : '$44'}
              </span>
              <span className="text-sm text-muted-foreground">
                AUD / {yearly ? 'year' : 'month'}
              </span>
            </div>
            {yearly ? (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                Save $33 vs monthly · GST included
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/50">GST included · Cancel anytime</p>
            )}
          </div>

          <ul className="mb-8 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {FOUNDATION_EXTRAS.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-primary">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            <Link
              href={`/subscribe?plan=foundation&billing=${yearly ? 'yearly' : 'monthly'}`}
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
              <span className="text-3xl font-bold text-foreground">
                {yearly ? '$795' : '$99'}
              </span>
              <span className="text-sm text-muted-foreground">
                AUD / {yearly ? 'year' : 'month'}
              </span>
            </div>
            {yearly ? (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                Save $393 vs monthly · GST included
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/50">GST included · Cancel anytime</p>
            )}
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
              href={`/subscribe?plan=growth&billing=${yearly ? 'yearly' : 'monthly'}`}
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
    </>
  );
}
