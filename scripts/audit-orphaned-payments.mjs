#!/usr/bin/env node
/**
 * Find customers who PAID and received NOTHING.
 *
 * WHY THIS EXISTS. CARSI fulfils a course purchase by two paths, and as at 2026-09-06 both
 * can miss the same customer:
 *
 *   1. The Stripe webhook (`app/api/lms/webhooks/stripe/route.ts`) on
 *      `checkout.session.completed`. GP-549 records that deliveries have been failing since
 *      2026-08-29 — Stripe shows successful charges, the platform's webhook table shows none.
 *   2. The success page (`app/api/lms/enrollments/guest-complete/route.ts`). This does NOT
 *      fulfil on arrival: it requires the buyer to choose and submit a password of at least
 *      8 characters. Close the tab, lose signal, or switch apps on mobile, and nothing happens.
 *
 * There is no third path. Verified by enumeration on 2026-09-06: 7 cron routes exist and none
 * reconciles payments against enrolments (`toolbox-talk-drip` matches a payment grep only
 * because the word "enrollee" appears in one of its comments).
 *
 * So when both paths miss, money is taken and no system anywhere notices. This script is the
 * detector. It is READ-ONLY and fulfils nothing — measure before you mutate, and a refund or
 * fulfilment obligation is the founder's call, not an agent's (`ENGINE.md:43` puts money
 * outside autonomous scope).
 *
 * CREDENTIALS. This script never stores or prints a secret. It reads STRIPE_SECRET_KEY and
 * DATABASE_URL from the environment you run it in, so the founder supplies them at run time
 * and no agent has to hold them:
 *
 *   STRIPE_SECRET_KEY=sk_live_… DATABASE_URL=postgres://… node scripts/audit-orphaned-payments.mjs
 *   … --since 2026-08-29        (default: 30 days back)
 *   … --json                    (machine-readable)
 *
 * Exit 0 = every paid session has an enrolment. Exit 1 = orphans found (customers owed).
 * Exit 2 = could not audit. Exit 2 is NOT "nothing wrong" — a run that reached nothing must
 * never read as a clean bill of health, which is the failure mode this repo has shipped before.
 */
import { pathToFileURL } from 'node:url';

/** Sessions carrying this metadata source are booked through a different flow, not enrolments. */
const NON_ENROLMENT_SOURCES = new Set(['carsi-ccw-roadshow']);

/**
 * Decide whether one paid Stripe session should have produced an enrolment, and whether it did.
 * Pure — no network, no database. Separated so the self-test can plant each case.
 *
 * @returns {{verdict: 'orphan'|'fulfilled'|'not-applicable', reason: string}}
 */
export function classifySession(session, enrolmentRefs) {
  if (!session || typeof session !== 'object') {
    return { verdict: 'not-applicable', reason: 'session is not an object' };
  }
  if (session.payment_status && session.payment_status !== 'paid') {
    return { verdict: 'not-applicable', reason: `payment_status=${session.payment_status}` };
  }
  const source = session.metadata?.source;
  if (source && NON_ENROLMENT_SOURCES.has(source)) {
    return { verdict: 'not-applicable', reason: `booked via ${source}, not a course enrolment` };
  }
  const slug = session.metadata?.course_slug?.trim().toLowerCase();
  if (!slug) {
    // Subscription checkouts and anything without a course carry no slug. The webhook itself
    // returns early on this, so it is out of scope here rather than a defect.
    return { verdict: 'not-applicable', reason: 'no course_slug in metadata' };
  }
  if (!session.id) {
    return { verdict: 'not-applicable', reason: 'session has no id' };
  }
  if (enrolmentRefs.has(session.id)) {
    return { verdict: 'fulfilled', reason: 'an enrolment carries this session id' };
  }
  return { verdict: 'orphan', reason: `PAID for "${slug}" with no matching enrolment` };
}

/**
 * Decide the run's verdict. Pure.
 *
 * The non-vacuity rules live here because their failure mode is a comfortable pass: a run that
 * listed zero sessions, or that could not read the enrolment table, looks exactly like a clean
 * system unless it is made to fail loudly.
 */
export function evaluateRun({ sessionsListed, enrolmentRefsLoaded, orphans, dbReadOk }) {
  if (!dbReadOk) {
    return { code: 2, reason: 'could not read the enrolment table — refusing to call every payment an orphan' };
  }
  if (sessionsListed === 0) {
    return { code: 2, reason: 'listed 0 Stripe sessions in the window — reaching nothing is not a clean result' };
  }
  if (enrolmentRefsLoaded === 0) {
    return { code: 2, reason: 'loaded 0 enrolment payment references — every paid session would falsely read as an orphan' };
  }
  if (orphans.length > 0) {
    return { code: 1, reason: `${orphans.length} customer(s) paid and have no enrolment` };
  }
  return { code: 0, reason: `${sessionsListed} paid session(s) checked, all fulfilled` };
}

function parseSince(argv) {
  const i = argv.indexOf('--since');
  if (i !== -1 && argv[i + 1]) {
    const d = new Date(argv[i + 1]);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

async function main() {
  const asJson = process.argv.includes('--json');
  const since = parseSince(process.argv);

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error('STRIPE_SECRET_KEY is not set. Supply it at run time; this script never stores it.');
    process.exit(2);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set. Supply it at run time; this script never stores it.');
    process.exit(2);
  }

  let Stripe, PrismaClient;
  try {
    ({ default: Stripe } = await import('stripe'));
    ({ PrismaClient } = await import('@prisma/client'));
  } catch (e) {
    console.error(`Could not load dependencies (run npm install first): ${e.message}`);
    process.exit(2);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const prisma = new PrismaClient();

  // Load every enrolment payment reference. A failure here must not be read as "no enrolments".
  const enrolmentRefs = new Set();
  let dbReadOk = false;
  try {
    const rows = await prisma.lmsEnrollment.findMany({
      where: { paymentReference: { not: null } },
      select: { paymentReference: true },
    });
    for (const r of rows) if (r.paymentReference) enrolmentRefs.add(r.paymentReference);
    dbReadOk = true;
  } catch (e) {
    console.error(`Could not read enrolments: ${e.message}`);
  }

  const orphans = [];
  let sessionsListed = 0;
  const notApplicable = new Map();

  if (dbReadOk) {
    try {
      for await (const session of stripe.checkout.sessions.list({
        created: { gte: Math.floor(since.getTime() / 1000) },
        limit: 100,
      })) {
        sessionsListed++;
        const { verdict, reason } = classifySession(session, enrolmentRefs);
        if (verdict === 'orphan') {
          orphans.push({
            sessionId: session.id,
            created: new Date(session.created * 1000).toISOString(),
            email: session.customer_details?.email ?? session.customer_email ?? null,
            courseSlug: session.metadata?.course_slug ?? null,
            amountTotal: session.amount_total,
            currency: session.currency,
            reason,
          });
        } else if (verdict === 'not-applicable') {
          notApplicable.set(reason, (notApplicable.get(reason) ?? 0) + 1);
        }
      }
    } catch (e) {
      console.error(`Stripe listing failed: ${e.message}`);
      await prisma.$disconnect();
      process.exit(2);
    }
  }

  await prisma.$disconnect();

  const verdict = evaluateRun({
    sessionsListed,
    enrolmentRefsLoaded: enrolmentRefs.size,
    orphans,
    dbReadOk,
  });

  if (asJson) {
    console.log(JSON.stringify({ since: since.toISOString(), sessionsListed, enrolmentRefs: enrolmentRefs.size, orphans, verdict }, null, 2));
    process.exit(verdict.code);
  }

  console.log(`Orphaned-payment audit — sessions created since ${since.toISOString().slice(0, 10)}`);
  console.log(`  Stripe sessions listed:        ${sessionsListed}`);
  console.log(`  enrolment payment references:  ${enrolmentRefs.size}`);
  for (const [reason, n] of notApplicable) console.log(`  skipped (${reason}): ${n}`);

  if (orphans.length) {
    console.log(`\n  CUSTOMERS WHO PAID AND HAVE NO ENROLMENT:\n`);
    for (const o of orphans) {
      const amount = o.amountTotal != null ? `${(o.amountTotal / 100).toFixed(2)} ${(o.currency ?? '').toUpperCase()}` : 'unknown amount';
      console.log(`  ${o.created}  ${amount}`);
      console.log(`    course:  ${o.courseSlug}`);
      console.log(`    email:   ${o.email ?? '(none on session)'}`);
      console.log(`    session: ${o.sessionId}`);
    }
    console.log(`\n  Each of these is a refund-or-fulfil obligation, not a backlog item.`);
  }

  console.log(`\n${verdict.code === 0 ? 'OK' : 'ACTION NEEDED'}: ${verdict.reason}`);
  process.exit(verdict.code);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
