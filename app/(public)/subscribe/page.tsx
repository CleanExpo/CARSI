import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { getEntitlements, type Entitlements } from '@/lib/server/entitlements';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { SubscribeCta } from './SubscribeCta';

export const metadata: Metadata = {
  title: 'Yearly Membership | CARSI',
  description:
    'CARSI yearly membership — 100% access to all published courses for one learner for 12 months. GST included.',
};

const PLAN = {
  name: 'Yearly membership',
  price: 795,
  suffix: 'AUD / year',
  helper: 'That is about $66/month · GST included',
};

const PRO_FEATURES = [
  '100% access to all published CARSI courses',
  'Beginner, intermediate, and advanced levels',
  'IICRC CEC courses where stated',
  'CEC tracking for completed eligible courses',
  'Water Restoration Technician (WRT) courses',
  'Carpet Cleaning Technician (CCT) courses',
  'Odour Control Technician (OCT) courses',
  'Applied Structural Drying (ASD) courses',
  'Carpet Repair & Reinstallation (RRT) courses',
  'PDF certificates for every course',
  'IICRC CEC tracking dashboard',
  'Monthly activity recognition (anonymous by default) & streak tracker',
  'Priority email support',
];

/** Resolve the signed-in learner's membership, honouring the ship-dark flag. */
async function loadMembership(): Promise<Entitlements | null> {
  if (!subscriptionsEnabled()) return null;
  const jar = await cookies();
  const token = jar.get('auth_token')?.value ?? jar.get('carsi_token')?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims?.sub) return null;
  return getEntitlements(claims.sub);
}

function GraceBanner({ periodEnd }: { periodEnd: Date | null }) {
  return (
    <p className="rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-3 py-2 text-sm font-medium text-[#7a3500]">
      Your membership payment is past due. You still have full access during a 7-day grace period
      {periodEnd ? ` from ${periodEnd.toLocaleDateString('en-AU')}` : ''}. Please update your payment
      to avoid interruption — your progress and certificates are always retained.
    </p>
  );
}

function LapsedBanner() {
  return (
    <p className="rounded-lg border border-[#f2b8b8] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#8a1c1c]">
      Your membership has lapsed. Renew to enrol in new courses. Everything you have already
      enrolled in, your progress, and your issued certificates remain intact.
    </p>
  );
}

export default async function SubscribePage() {
  const enabled = subscriptionsEnabled();
  const membership = await loadMembership();
  const status = membership?.reason ?? null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f6f8fb] px-4 py-16 text-slate-900">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-xs font-semibold text-[#146fc2] shadow-sm">
            Membership
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-950">{PLAN.name}</h1>
          <p className="mt-2 text-slate-600">
            Yearly membership unlocks 100% access to all published courses.
          </p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-950">${PLAN.price}</span>
              <span className="text-slate-600">{PLAN.suffix}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{PLAN.helper}</p>

            {status === 'active' ? (
              <p className="mt-3 rounded-lg border border-[#9fdab8] bg-[#f1fbf5] px-3 py-2 text-sm font-medium text-[#1b5e37]">
                Your membership is active — every published course is included, no extra payment.
              </p>
            ) : status === 'grace' ? (
              <div className="mt-3">
                <GraceBanner periodEnd={membership?.currentPeriodEnd ?? null} />
              </div>
            ) : status === 'lapsed' ? (
              <div className="mt-3">
                <LapsedBanner />
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-3 py-2 text-sm font-medium text-[#7a3500]">
                Membership is best for clients planning multiple courses, refreshing knowledge across
                levels, or maintaining CECs over time.
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-3 text-sm text-slate-700">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-[#146fc2]">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <SubscribeCta enabled={enabled} reason={status} />
          </div>
        </div>

        {/* Value proposition */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Available today:</span> buy any course
            individually — no membership required.
          </p>
          <Link
            href="/courses"
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0f5fa8] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Browse courses
          </Link>
        </div>

        {/* Legal links */}
        <p className="text-center text-xs leading-relaxed text-slate-600">
          Read our{' '}
          <Link href="/terms" className="font-medium text-[#146fc2] underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-medium text-[#146fc2] underline">
            Privacy Policy
          </Link>
          .
          <br />
          Prices in AUD. GST included.
        </p>
      </div>
    </main>
  );
}
